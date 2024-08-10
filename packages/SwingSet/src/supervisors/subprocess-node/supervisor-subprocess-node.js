/* global globalThis, WeakRef, FinalizationRegistry */

// this file is loaded at the start of a new subprocess
import '@endo/init';

import anylogger from 'anylogger';
import fs from 'fs';
import { Buffer } from 'buffer';
import process from 'node:process';

import { assert, X, Fail } from '@endo/errors';
import { importBundle } from '@endo/import-bundle';
import { makeMarshal } from '@endo/marshal';
import {
  makeLiveSlots,
  insistVatDeliveryObject,
  insistVatSyscallResult,
} from '@agoric/swingset-liveslots';
import engineGC from '@agoric/internal/src/lib-nodejs/engine-gc.js';
import { makeGcAndFinalize } from '@agoric/internal/src/lib-nodejs/gc-and-finalize.js';
import { waitUntilQuiescent } from '@agoric/internal/src/lib-nodejs/waitUntilQuiescent.js';
import { encode, decode } from '@agoric/internal/src/netstring.js';
import { makeDummyMeterControl } from '../../kernel/dummyMeterControl.js';
import {
  makeSupervisorDispatch,
  makeSupervisorSyscall,
  makeVatConsole,
} from '../supervisor-helper.js';

// eslint-disable-next-line no-unused-vars
function workerLog(first, ...args) {
  // console.error(`---worker: ${first}`, ...args);
}

workerLog(`supervisor started`);

function makeNetstringReader({ fd, encoding }) {
  const input = Buffer.alloc(32 * 1024);
  let buffered = Buffer.alloc(0);
  let decoded = [];

  const readMore = () => {
    assert(!decoded.length);
    // we could be smarter about read lengths (parse the the netstring
    // header and do a blocking read of the entire payload), but the
    // efficiency gain is not huge
    const bytesRead = fs.readSync(fd, input); // blocking read
    if (!bytesRead) {
      throw Error('read pipe closed');
    }
    const more = input.subarray(0, bytesRead);
    buffered = Buffer.concat([buffered, more]);
    const { leftover, payloads } = decode(buffered);
    buffered = leftover;
    decoded = payloads;
  };

  return harden({
    read: () => {
      for (;;) {
        if (decoded.length) {
          const ns = decoded.shift();
          return JSON.parse(ns.toString(encoding));
        }
        readMore(); // blocks
      }
    },
  });
}

let dispatch;

function writeToParent(command) {
  let buf = encode(Buffer.from(JSON.stringify(command)));
  while (buf.length) {
    const bytesWritten = fs.writeSync(4, buf);
    if (!bytesWritten) {
      throw Error('write pipe closed');
    }
    buf = buf.subarray(bytesWritten);
  }
}
const toParent = { write: writeToParent };
const fromParent = makeNetstringReader({ fd: 3, encoding: 'utf-8' });

function sendUplink(msg) {
  msg instanceof Array || Fail`msg must be an Array`;
  toParent.write(msg);
}

function handleStart(_margs) {
  // TODO: parent should send ['start', vatID]
  workerLog(`got start`);
  sendUplink(['gotStart']);
}

function handleSetBundle(margs) {
  const [vatID, bundle, liveSlotsOptions] = margs;

  function testLog(...args) {
    sendUplink(['testLog', ...args]);
  }

  // syscallToManager can throw or return OK/ERR
  function syscallToManager(vatSyscallObject) {
    sendUplink(['syscall', vatSyscallObject]);
    const result = fromParent.read();
    workerLog(' ... syscall result:', result);
    insistVatSyscallResult(result);
    return result;
  }
  // this 'syscall' throws or returns data
  const syscall = makeSupervisorSyscall(syscallToManager);
  const vatPowers = {
    makeMarshal,
    testLog,
  };

  const gcTools = harden({
    WeakRef,
    FinalizationRegistry,
    waitUntilQuiescent,
    gcAndFinalize: makeGcAndFinalize(engineGC),
    meterControl: makeDummyMeterControl(),
  });

  const makeLogMaker = tag => {
    const logger = anylogger(tag);
    const makeLog = level => {
      const log = logger[level];
      assert.typeof(log, 'function', X`logger[${level}] must be a function`);
      return (...args) => {
        log(...args);
      };
    };
    return makeLog;
  };

  // Enable or disable the console accordingly.
  const workerEndowments = {
    console: makeVatConsole(makeLogMaker(`SwingSet:vat:${vatID}`)),
    // See https://github.com/Agoric/agoric-sdk/issues/9515
    assert: globalThis.assert,
  };

  async function buildVatNamespace(lsEndowments, inescapableGlobalProperties) {
    const vatNS = await importBundle(bundle, {
      endowments: { ...workerEndowments, ...lsEndowments },
      inescapableGlobalProperties,
    });
    workerLog(`got vatNS:`, Object.keys(vatNS).join(','));
    return vatNS;
  }

  const ls = makeLiveSlots(
    syscall,
    vatID,
    vatPowers,
    liveSlotsOptions,
    gcTools,
    makeVatConsole(makeLogMaker(`SwingSet:ls:${vatID}`)),
    buildVatNamespace,
  );

  sendUplink(['gotBundle']);
  assert(ls.dispatch);
  dispatch = makeSupervisorDispatch(ls.dispatch);
  workerLog(`created dispatch()`);
  sendUplink(['dispatchReady']);
}

async function handleDeliver(margs) {
  if (!dispatch) {
    throw Error(`error: deliver before dispatchReady`);
  }
  const [vatDeliveryObject] = margs;
  harden(vatDeliveryObject);
  insistVatDeliveryObject(vatDeliveryObject);
  const vatDeliveryResults = await dispatch(vatDeliveryObject);
  sendUplink(['deliverDone', vatDeliveryResults]);
}

async function handleCommand(command) {
  const [type, ...margs] = command;
  workerLog(`received`, type);
  switch (type) {
    case 'start':
      return handleStart(margs);
    case 'setBundle':
      return handleSetBundle(margs);
    case 'deliver':
      return handleDeliver(margs);
    case 'exit':
      process.exit(0);
      break;
    default:
      throw Error(`unrecognized downlink message ${type}`);
  }
}

async function loop() {
  await 47; // I can wait for anything, so I choose 47.  It's the most ideal number.
  for (;;) {
    const command = fromParent.read();
    await handleCommand(command);
  }
}

loop().catch(err => console.log(`error in loop`, err));
