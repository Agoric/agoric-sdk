/* global HandledPromise */
import { importBundle } from '@agoric/import-bundle';
import { Remotable, getInterfaceOf, makeMarshal } from '@agoric/marshal';
// TODO? import anylogger from 'anylogger';
import { makeLiveSlots } from '@agoric/swingset-vat/src/kernel/liveSlots';

function workerLog(first, ...args) {
  console.log(`---worker: ${first}`, ...args);
}

function assert(ok, whynot) {
  if (!ok) {
    throw new Error(whynot);
  }
}

function makeConsole(_tag) {
  const log = console; // TODO? anylogger(tag);
  const cons = {};
  for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
    cons[level] = log[level];
  }
  return harden(cons);
}

// see also: detecting an empty vat promise queue (end of "crank")
// https://github.com/Agoric/agoric-sdk/issues/45
function waitUntilQuiescent(setImmediate) {
  return new Promise((resolve, _reject) => {
    setImmediate(() => {
      // console.log('hello from setImmediate callback. The promise queue is presumably empty.');
      resolve();
    });
  });
}

function runAndWait(f, errmsg, setImmediate) {
  Promise.resolve()
    .then(f)
    .then(undefined, err => workerLog(`doProcess: ${errmsg}:`, err));
  return waitUntilQuiescent(setImmediate);
}

function makeWorker(io, setImmediate) {
  let dispatch;

  async function doProcess(dispatchRecord, errmsg) {
    const dispatchOp = dispatchRecord[0];
    const dispatchArgs = dispatchRecord.slice(1);
    workerLog(`runAndWait`);
    await runAndWait(
      () => dispatch[dispatchOp](...dispatchArgs),
      errmsg,
      setImmediate,
    );
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
        throw new Error('not implemented yet');
      case 'fulfilledToData':
        return doProcess(['notifyFulfillToData', vpid, vp.data], errmsg);
      case 'rejected':
        return doProcess(['notifyReject', vpid, vp.data], errmsg);
      default:
        throw Error(`unknown promise state '${vp.state}'`);
    }
  }

  function sendUplink(msg) {
    assert(msg instanceof Array, `msg must be an Array`);
    io.writeMessage(JSON.stringify(msg));
  }

  // fromParent.on('data', data => {
  //  workerLog('data from parent', data);
  //  toParent.write('child ack');
  // });

  const handle = harden(async ([type, ...margs]) => {
    workerLog(`received`, type);
    if (type === 'start') {
      // TODO: parent should send ['start', vatID]
      workerLog(`got start`);
      sendUplink(['gotStart']);
    } else if (type === 'setBundle') {
      const [bundle, vatParameters] = margs;
      const endowments = {
        console: makeConsole(`SwingSet:vatWorker`),
        HandledPromise,
      };
      // ISSUE: this draft code is contorted because it started
      // as code that didn't return anything but now it
      // has to return a promise to be resolved before
      // reading the next input.
      return importBundle(bundle, { endowments }).then(vatNS => {
        workerLog(`got vatNS:`, Object.keys(vatNS).join(','));
        sendUplink(['gotBundle']);

        function doSyscall(vatSyscallObject) {
          sendUplink(['syscall', ...vatSyscallObject]);
        }
        const syscall = harden({
          send: (...args) => doSyscall(['send', ...args]),
          callNow: (..._args) => {
            throw Error(`nodeWorker cannot syscall.callNow`);
          },
          subscribe: (...args) => doSyscall(['subscribe', ...args]),
          fulfillToData: (...args) => doSyscall(['fulfillToData', ...args]),
          fulfillToPresence: (...args) =>
            doSyscall(['fulfillToPresence', ...args]),
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
        return type;
      });
    } else if (type === 'deliver') {
      if (!dispatch) {
        workerLog(`error: deliver before dispatchReady`);
        return undefined;
      }
      const [dtype, ...dargs] = margs;
      if (dtype === 'message') {
        await doMessage(...dargs).then(res =>
          sendUplink(['deliverDone', ...res]),
        );
      } else if (dtype === 'notify') {
        await doNotify(...dargs).then(res =>
          sendUplink(['deliverDone', ...res]),
        );
      } else {
        throw Error(`bad delivery type ${dtype}`);
      }
    } else {
      workerLog(`unrecognized downlink message ${type}`);
    }
    return type;
  });

  return harden({ handle });
}

export async function main({ readMessage, writeMessage, setImmediate }) {
  workerLog(`supervisor started`);

  const worker = makeWorker({ readMessage, writeMessage }, setImmediate);
  const EOF = new Error('EOF');

  for (;;) {
    let message;
    try {
      // eslint-disable-next-line no-await-in-loop
      message = JSON.parse(readMessage(EOF));
    } catch (noMessage) {
      if (noMessage === EOF) {
        return;
      }
      console.warn('problem getting message:', noMessage);
      // eslint-disable-next-line no-continue
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const msgtype = await worker.handle(message);
    if (msgtype === 'finish') {
      break;
    }
  }
}
