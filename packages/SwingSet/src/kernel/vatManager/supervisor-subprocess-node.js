// this file is loaded at the start of a new subprocess
import '@agoric/install-ses';

import anylogger from 'anylogger';
import fs from 'fs';

import { assert, details as X } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { makeMarshal } from '@agoric/marshal';
import { WeakRef, FinalizationRegistry } from '../../weakref';
import { arrayEncoderStream, arrayDecoderStream } from '../../worker-protocol';
import {
  netstringEncoderStream,
  netstringDecoderStream,
} from '../../netstring';
import { waitUntilQuiescent } from '../../waitUntilQuiescent';
import { makeLiveSlots } from '../liveSlots';

// eslint-disable-next-line no-unused-vars
function workerLog(first, ...args) {
  // console.error(`---worker: ${first}`, ...args);
}

workerLog(`supervisor started`);

function makeConsole(tag) {
  const log = anylogger(tag);
  const cons = {};
  for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
    cons[level] = log[level];
  }
  return harden(cons);
}

function runAndWait(f, errmsg) {
  Promise.resolve()
    .then(f)
    .then(undefined, err => workerLog(`doProcess: ${errmsg}:`, err));
  return waitUntilQuiescent();
}

let dispatch;

async function doProcess(dispatchRecord, errmsg) {
  const dispatchOp = dispatchRecord[0];
  const dispatchArgs = dispatchRecord.slice(1);
  workerLog(`runAndWait`);
  await runAndWait(() => dispatch[dispatchOp](...dispatchArgs), errmsg);
  workerLog(`doProcess done`);
  const vatDeliveryResults = harden(['ok']);
  return vatDeliveryResults;
}

function doMessage(targetSlot, msg) {
  const errmsg = `vat[${targetSlot}].${msg.method} dispatch failed`;
  return doProcess(
    ['deliver', targetSlot, msg.method, msg.args, msg.result],
    errmsg,
  );
}

function doNotify(resolutions) {
  const errmsg = `vat.notify failed`;
  return doProcess(['notify', resolutions], errmsg);
}

function doDropExports(vrefs) {
  const errmsg = `vat.doDropExport failed`;
  return doProcess(['dropExports', vrefs], errmsg);
}

const toParent = arrayEncoderStream();
toParent
  .pipe(netstringEncoderStream())
  .pipe(fs.createWriteStream('IGNORED', { fd: 4, encoding: 'utf-8' }));

const fromParent = fs
  .createReadStream('IGNORED', { fd: 3, encoding: 'utf-8' })
  .pipe(netstringDecoderStream())
  .pipe(arrayDecoderStream());

function sendUplink(msg) {
  assert(msg instanceof Array, X`msg must be an Array`);
  toParent.write(msg);
}

// fromParent.on('data', data => {
//  workerLog('data from parent', data);
//  toParent.write('child ack');
// });

fromParent.on('data', ([type, ...margs]) => {
  workerLog(`received`, type);
  if (type === 'start') {
    // TODO: parent should send ['start', vatID]
    workerLog(`got start`);
    sendUplink(['gotStart']);
  } else if (type === 'setBundle') {
    const [
      bundle,
      vatParameters,
      virtualObjectCacheSize,
      enableDisavow,
    ] = margs;

    function testLog(...args) {
      sendUplink(['testLog', ...args]);
    }

    function doSyscall(vatSyscallObject) {
      sendUplink(['syscall', ...vatSyscallObject]);
    }
    const syscall = harden({
      send: (...args) => doSyscall(['send', ...args]),
      callNow: (..._args) => {
        assert.fail(X`nodeWorker cannot syscall.callNow`);
      },
      subscribe: (...args) => doSyscall(['subscribe', ...args]),
      resolve: (...args) => doSyscall(['resolve', ...args]),
      exit: (...args) => doSyscall(['exit', ...args]),
      vatstoreGet: (...args) => doSyscall(['vatstoreGet', ...args]),
      vatstoreSet: (...args) => doSyscall(['vatstoreSet', ...args]),
      vatstoreDelete: (...args) => doSyscall(['vatstoreDelete', ...args]),
      dropImports: (...args) => doSyscall(['dropImports', ...args]),
    });

    const vatID = 'demo-vatID';
    // todo: maybe add transformTildot, makeGetMeter/transformMetering to
    // vatPowers, but only if options tell us they're wanted. Maybe
    // transformTildot should be async and outsourced to the kernel
    // process/thread.
    const vatPowers = {
      makeMarshal,
      testLog,
    };
    const gcTools = harden({ WeakRef, FinalizationRegistry });
    const ls = makeLiveSlots(
      syscall,
      vatID,
      vatPowers,
      vatParameters,
      virtualObjectCacheSize,
      enableDisavow,
      gcTools,
    );

    const endowments = {
      ...ls.vatGlobals,
      console: makeConsole(`SwingSet:vatWorker`),
      assert,
    };

    importBundle(bundle, { endowments }).then(vatNS => {
      workerLog(`got vatNS:`, Object.keys(vatNS).join(','));
      sendUplink(['gotBundle']);
      ls.setBuildRootObject(vatNS.buildRootObject);
      dispatch = ls.dispatch;
      workerLog(`got dispatch:`, Object.keys(dispatch).join(','));
      sendUplink(['dispatchReady']);
    });
  } else if (type === 'deliver') {
    if (!dispatch) {
      workerLog(`error: deliver before dispatchReady`);
      return;
    }
    const [dtype, ...dargs] = margs;
    if (dtype === 'message') {
      doMessage(...dargs).then(res => sendUplink(['deliverDone', ...res]));
    } else if (dtype === 'notify') {
      doNotify(...dargs).then(res => sendUplink(['deliverDone', ...res]));
    } else if (dtype === 'dropExports') {
      doDropExports(...dargs).then(res => sendUplink(['deliverDone', ...res]));
    } else {
      assert.fail(X`bad delivery type ${dtype}`);
    }
  } else {
    workerLog(`unrecognized downlink message ${type}`);
  }
});
