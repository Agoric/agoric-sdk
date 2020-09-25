// this file is loaded at the start of a new subprocess
import '@agoric/install-ses';

import anylogger from 'anylogger';
import fs from 'fs';
import process from 'process';

import { assert } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { Remotable, getInterfaceOf, makeMarshal } from '@agoric/marshal';
import { waitUntilQuiescent } from '../../waitUntilQuiescent';
import { makeLiveSlots } from '../liveSlots';
import { streamDecoder, streamEncoder } from '../../worker-protocol';

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

function doNotify(vpid, vp) {
  const errmsg = `vat.promise[${vpid}] ${vp.state} failed`;
  switch (vp.state) {
    case 'fulfilledToPresence':
      return doProcess(['notifyFulfillToPresence', vpid, vp.slot], errmsg);
    case 'redirected':
      // TODO unimplemented
      throw new Error('not implemented yet');
    case 'fulfilledToData':
      return doProcess(['notifyFulfillToData', vpid, vp.data], errmsg);
    case 'rejected':
      return doProcess(['notifyReject', vpid, vp.data], errmsg);
    default:
      throw Error(`unknown promise state '${vp.state}'`);
  }
}

// TODO: remove these encoding:'utf-8' to give Buffers to the netstring decoder and stop the error
const pipeOut = fs.createWriteStream('IGNORED', { fd: 4, encoding: 'utf-8' });
const toParent = streamEncoder(data => pipeOut.write(data));

const pipeIn = fs.createReadStream('IGNORED', { fd: 3, encoding: 'utf-8' });
const fromParent = streamDecoder(pipeIn);

async function loadBundle(bundle, vatParameters) {
  const endowments = {
    console: makeConsole(`SwingSet:vatWorker`),
  };
  const vatNS = await importBundle(bundle, { endowments });
  workerLog(`got vatNS:`, Object.keys(vatNS).join(','));
  toParent(['gotBundle']);

  function doSyscall(vatSyscallObject) {
    toParent(['syscall', ...vatSyscallObject]);
  }
  const syscall = harden({
    send: (...args) => doSyscall(['send', ...args]),
    callNow: (..._args) => {
      throw Error(`nodeWorker cannot syscall.callNow`);
    },
    subscribe: (...args) => doSyscall(['subscribe', ...args]),
    fulfillToData: (...args) => doSyscall(['fulfillToData', ...args]),
    fulfillToPresence: (...args) => doSyscall(['fulfillToPresence', ...args]),
    reject: (...args) => doSyscall(['reject', ...args]),
  });

  function testLog(...args) {
    toParent(['testLog', ...args]);
  }

  const state = null;
  const vatID = 'demo-vatID';
  // todo: maybe add transformTildot, makeGetMeter/transformMetering to
  // vatPowers, but only if options tell us they're wanted. Maybe
  // transformTildot should be async and outsourced to the kernel
  // process/thread.
  const vatPowers = {
    Remotable,
    getInterfaceOf,
    makeMarshal,
    testLog,
  };
  dispatch = makeLiveSlots(
    syscall,
    state,
    vatNS.buildRootObject,
    vatID,
    vatPowers,
    vatParameters,
  );
  workerLog(`got dispatch:`, Object.keys(dispatch).join(','));
  toParent(['dispatchReady']);
}

async function run() {
  workerLog(`waiting for parent to send start or setBundle`);
  for await (const [type, ...args] of fromParent) {
    workerLog(`received`, type);
    if (type === 'start') {
      // TODO: parent should send ['start', vatID]
      workerLog(`got start`);
      toParent(['gotStart']);
    } else if (type === 'setBundle') {
      const [bundle, vatParameters] = args;
      await loadBundle(bundle, vatParameters);
      break;
    } else {
      throw Error(`unexpected type ${type} during load-bundle phase`);
    }
  }

  for await (const [type, ...args] of fromParent) {
    workerLog(`received`, type);
    if (type === 'deliver') {
      const [dtype, ...dargs] = args;
      if (dtype === 'message') {
        doMessage(...dargs).then(res => toParent(['deliverDone', ...res]));
      } else if (dtype === 'notify') {
        doNotify(...dargs).then(res => toParent(['deliverDone', ...res]));
      } else {
        throw Error(`bad delivery type ${dtype}`);
      }
    } else {
      throw Error(`unexpected type ${type} during do-deliver phase`);
    }
  }
}

run().catch(err => {
  console.log(`error during run`, err);
  process.exit(1);
});
