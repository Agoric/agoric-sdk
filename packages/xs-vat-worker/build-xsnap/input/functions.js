/* global harden */

// import anylogger from 'anylogger';
import { assert } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { Remotable, getInterfaceOf, makeMarshal } from '@agoric/marshal';
import { mustBeSameStructure } from '@agoric/same-structure';
import { waitUntilQuiescent } from '@agoric/swingset-vat/src/waitUntilQuiescent';
import { makeLiveSlots } from '@agoric/swingset-vat/src/kernel/liveSlots';

// eslint-disable-next-line no-unused-vars
function workerLog(first, ...args) {
  // console.error(`---worker: ${first}`, ...args);
}

workerLog(`supervisor started`);

function makeConsole(tag) {
  // const log = anylogger(tag);
  const log = console;
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
let expectedSyscalls;
let expectedSyscallResults;

function doSyscall(vatSyscallObject) {
  if (expectedSyscalls.length === 0) {
    throw Error(`ERROR: too many syscalls`);
  }
  const expected = expectedSyscalls.shift().vsc;
  harden(expected);
  harden(vatSyscallObject);
  mustBeSameStructure(vatSyscallObject, expected, `syscall mismatch`);
  const vatSyscallResult = expectedSyscallResults.shift();
  return vatSyscallResult;
}

export async function deliverAndVerifySyscalls(d) {
  const { delivery } = d;
  expectedSyscalls = d.syscalls;
  expectedSyscallResults = d.syscallResults;

  async function doProcess(dispatchRecord, errmsg) {
    const dispatchOp = dispatchRecord[0];
    const dispatchArgs = dispatchRecord.slice(1);
    workerLog(`runAndWait`);
    await runAndWait(() => dispatch[dispatchOp](...dispatchArgs), errmsg);
    workerLog(`doProcess done`);
    if (expectedSyscalls.length !== 0) {
      throw Error(`ERROR: too few syscalls`);
    }
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

  const [dtype, ...dargs] = delivery.vd;
  let res;
  if (dtype === 'message') {
    res = await doMessage(...dargs);
  } else if (dtype === 'notify') {
    res = await doNotify(...dargs);
  } else {
    throw Error(`bad delivery type ${dtype}`);
  }
}

function sendUplink(message) {
  console.log(`sendUplink`, message);
}

export function setBundle(vatSourceBundle, vatParameters) {
  const endowments = {
    console: makeConsole(`SwingSet:vatWorker`),
  };
  importBundle(vatSourceBundle, { endowments }).then(vatNS => {
    workerLog(`got vatNS:`, Object.keys(vatNS).join(','));
    sendUplink(['gotBundle']);

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
      sendUplink(['testLog', ...args]);
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
    sendUplink(['dispatchReady']);
  });
}
