/* global HandledPromise */
// @ts-check
import { importBundle } from '@agoric/import-bundle';
import { asMessage } from '@agoric/swingset-vat';
import { Remotable, getInterfaceOf, makeMarshal } from '@agoric/marshal';
// TODO? import anylogger from 'anylogger';
import { makeLiveSlots } from '@agoric/swingset-vat/src/kernel/liveSlots';

/** @type { (first: string, ...args: unknown[]) => void } */
function workerLog(first, ...args) {
  console.log(`---worker: ${first}`, ...args);
}

/** @type { (ok: unknown, whynot: string) => void } */
function assert(ok, whynot) {
  if (!ok) {
    throw new Error(whynot);
  }
}

/**
 * @param { string } _tag
 * @returns { Logger }
 *
 * @typedef { (...things: unknown[]) => void } LoggF
 * @typedef {{ debug: LoggF, log: LoggF, info: LoggF, warn: LoggF, error: LoggF }} Logger
 */
function makeConsole(_tag) {
  const log = console; // TODO? anylogger(tag);
  const cons = {
    debug: log.debug,
    log: log.log,
    info: log.info,
    warn: log.warn,
    error: log.error,
  };
  return harden(cons);
}

// see also: detecting an empty vat promise queue (end of "crank")
// https://github.com/Agoric/agoric-sdk/issues/45
/**
 *
 * @param {typeof setImmediate} setImmediate
 * @returns { Promise<void> }
 */
function waitUntilQuiescent(setImmediate) {
  return new Promise((resolve, _reject) => {
    setImmediate(() => {
      // console.log('hello from setImmediate callback. The promise queue is presumably empty.');
      resolve();
    });
  });
}

/**
 * @param {(it: unknown) => Promise<any>} f
 * @param {string} errmsg
 * @param {typeof setImmediate } setImmediate
 */
function runAndWait(f, errmsg, setImmediate) {
  Promise.resolve()
    .then(f)
    .then(undefined, err => workerLog(`doProcess: ${errmsg}:`, err));
  return waitUntilQuiescent(setImmediate);
}

/**
 *
 * @param {{
 *   readMessage: (eof: Error) => string,
 *   writeMessage: (msg: string) => void,
 * }} io
 * @param { typeof setImmediate } setImmediate
 *
 * @typedef {Readonly<['ok'] | ['error', string]>} WorkerResult
 */
function makeWorker(io, setImmediate) {
  /** @type {{[method: string]: (...args: unknown[]) => Promise<unknown> }} */
  let dispatch;

  /** @type {(d: [string, ...unknown[]], errmsg: string) => Promise<WorkerResult> } */
  async function doProcess(dispatchRecord, errmsg) {
    const [dispatchOp, ...dispatchArgs] = dispatchRecord;
    workerLog(`runAndWait`);
    await runAndWait(
      () => dispatch[dispatchOp](...dispatchArgs),
      errmsg,
      setImmediate,
    );
    workerLog(`doProcess done`);
    const vatDeliveryResults = harden(['ok']);
    // @ts-ignore not sure why tsc doesn't grok here
    return vatDeliveryResults;
  }

  /**
   * @param {string} targetSlot
   * @param {Message} msg
   * @returns {Promise<WorkerResult>}
   */
  function doMessage(targetSlot, msg) {
    const errmsg = `vat[${targetSlot}].${msg.method} dispatch failed`;
    return doProcess(
      ['deliver', targetSlot, msg.method, msg.args, msg.result],
      errmsg,
    );
  }

  /**
   *
   * @param {PromiseReference} vpid
   * @param {Resolution} vp
   */
  function doNotify(vpid, vp) {
    const errmsg = `vat.promise[${vpid}] ${vp.state} failed`;
    switch (vp.state) {
      case 'fulfilledToPresence':
        return doProcess(['notifyFulfillToPresence', vpid, vp.slot], errmsg);
      // @ts-ignore
      case 'redirected':
        throw new Error('not implemented yet');
      case 'fulfilledToData':
        return doProcess(['notifyFulfillToData', vpid, vp.data], errmsg);
      case 'rejected':
        return doProcess(['notifyReject', vpid, vp.data], errmsg);
      default:
        // @ts-ignore
        throw Error(`unknown promise state '${vp.state}'`);
    }
  }

  /**
   * @param {VatWorkerReply} msg
   *
   * @typedef {
   *   ['dispatchReady'] | ['gotStart'] | ['gotBundle'] |
   *   ['syscall', ...VatSyscall] |
   *   ['testLog', ...unknown[]]
   * } VatWorkerReply
   *
   * TODO: move VatSyscall where other stuff from vat-worker.md are defined
   * @typedef {Readonly<
   *   ['send', Reference, Message] |
   *   ['callNow', Reference, string, CapData<string>] |
   *   ['subscribe', PromiseReference] |
   *   ['fulfillToPresence', PromiseReference, Reference] |
   *   ['fulfillToData', PromiseReference, unknown] |
   *   ['reject', PromiseReference, unknown]
   * >} VatSyscall
   */
  function sendUplink(msg) {
    assert(msg instanceof Array, `msg must be an Array`);
    io.writeMessage(JSON.stringify(msg));
  }

  // fromParent.on('data', data => {
  //  workerLog('data from parent', data);
  //  toParent.write('child ack');
  // });

  /** @type { (msg: unknown) => Promise<string | undefined> } */
  const handle = harden(async msg => {
    const type = Array.isArray(msg) && msg.length >= 1 ? msg[0] : typeof msg;
    /** @type {unknown[]} */
    const margs = Array.isArray(msg) ? msg.slice(1) : [];

    workerLog(`received`, type);
    if (type === 'start') {
      // TODO: parent should send ['start', vatID]
      workerLog(`got start`);
      sendUplink(['gotStart']);
    } else if (type === 'setBundle') {
      const [bundle, vatParameters] = margs;
      const endowments = {
        console: makeConsole(`SwingSet:vatWorker`),
        assert,
        // @ts-ignore  TODO: how to get type of HandledPromise?
        HandledPromise,
      };
      // ISSUE: this draft code is contorted because it started
      // as code that didn't return anything but now it
      // has to return a promise to be resolved before
      // reading the next input.
      return importBundle(bundle, { endowments }).then(vatNS => {
        workerLog(`got vatNS:`, Object.keys(vatNS).join(','));
        sendUplink(['gotBundle']);

        /** @type { (vatSysCall: VatSyscall) => void } */
        function doSyscall(vatSyscallObject) {
          sendUplink(['syscall', ...vatSyscallObject]);
        }
        const syscall = harden({
          /** @type { (target: Reference, msg: Message) => void } */
          send: (target, smsg) => doSyscall(['send', target, smsg]),
          /** @type { (target: Reference, method: string, args: CapData<string>) => void } */
          callNow: (_target, _method, _args) => {
            throw Error(`nodeWorker cannot syscall.callNow`);
          },
          /** @type { (vpd: PromiseReference) => void } */
          subscribe: vpid => doSyscall(['subscribe', vpid]),
          /** @type { (vpid: PromiseReference, data: unknown) => void } */
          fulfillToData: (vpid, data) =>
            doSyscall(['fulfillToData', vpid, data]),
          /** @type { (vpid: PromiseReference, slot: Reference) => void } */
          fulfillToPresence: (vpid, slot) =>
            doSyscall(['fulfillToPresence', vpid, slot]),
          /** @type { (vpid: PromiseReference, data: unknown) => void } */
          reject: (vpid, data) => doSyscall(['reject', vpid, data]),
        });

        function testLog(/** @type {unknown[]} */ ...args) {
          sendUplink(['testLog', ...args]);
        }
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
        const ls = makeLiveSlots(
          syscall,
          vatID,
          vatPowers,
          vatParameters,
          // TODO: virtualObjectCacheSize,
        );
        dispatch = ls.dispatch;
        ls.setBuildRootObject(vatNS.buildRootObject);
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
      if (dtype === 'message' && typeof dargs[0] === 'string') {
        await doMessage(dargs[0], asMessage(dargs[1])).then(res =>
          sendUplink(['deliverDone', ...res]),
        );
      } else if (dtype === 'notify' && typeof dargs[0] === 'string') {
        /** @type { Resolution } */
        // @ts-ignore  WARNING: assuming type of input data
        const resolution = dargs[1];
        await doNotify(dargs[0], resolution).then(res =>
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

/**
 *
 * @param {{
 *   readMessage: (eof: Error) => string,
 *   writeMessage: (msg: string) => void,
 *   setImmediate: typeof setImmediate,
 * }} io
 */
export async function main({ readMessage, writeMessage, setImmediate }) {
  workerLog(`supervisor started`);

  const worker = makeWorker({ readMessage, writeMessage }, setImmediate);
  const EOF = new Error('EOF');

  for (;;) {
    /** @type { unknown } */
    let message;
    try {
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
