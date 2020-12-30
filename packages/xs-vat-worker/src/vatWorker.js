/* global HandledPromise */
// @ts-check

import { importBundle } from '@agoric/import-bundle';
import { Remotable, getInterfaceOf, makeMarshal } from '@agoric/marshal';
// TODO? import anylogger from 'anylogger';
import { makeLiveSlots } from '@agoric/swingset-vat/src/kernel/liveSlots';

function workerLog(first, ...args) {
  console.log(`---worker: ${first}`, ...args);
}

/**
 * @param {unknown} ok
 * @param {string} whynot
 * @returns { asserts ok }
 */
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

/**
 * @param {(it: unknown) => Promise<any>} f
 * @param {string} errmsg
 * @param { () => Promise<void> } waitUntilQuiescent
 * @returns { Promise<void> }
 */
function runAndWait(f, errmsg, waitUntilQuiescent) {
  Promise.resolve()
    .then(f)
    .then(undefined, err => workerLog(`doProcess: ${errmsg}:`, err));
  return waitUntilQuiescent();
}

/**
 * TODO: refactor as {import('@agoric/swingset-vat').CapData} etc.
 *
 * @typedef {Object} CapData
 * @property {string} body
 * @property {Array<string>} slots
 * TODO: refactor as {import('@agoric/swingset-vat').CapData}
 *
 * @typedef {{
 *   method: string,
 *   args: CapData,
 *   result?: string,
 * }} Message
 *
 * @typedef { string } ObjectReference e.g. `o+13`
 * @typedef { string } PromiseReference e.g. `p-24`
 * @typedef { ObjectReference | PromiseReference } Reference
 *
 * @typedef { ToPresence | ToData | Rejected } Resolution
 * @typedef {{ state: 'fulfilledToPresence', slot: ObjectReference }} ToPresence
 * @typedef {{ state: 'fulfilledToData', data: CapData }} ToData
 * @typedef {{ state: 'rejected', data: CapData }} Rejected
 */

/**
 * @param {{
 *   waitUntilQuiescent: () => Promise<void>,
 *   sysCallSync: (payload: VatSyscall) => [string, ...unknown[]],
 * }} io
 * @typedef {Readonly<['ok'] | ['error', string]>} WorkerResult
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
 *   ['callNow', Reference, string, CapData] |
 *   ['subscribe', PromiseReference] |
 *   ['fulfillToPresence', PromiseReference, Reference] |
 *   ['fulfillToData', PromiseReference, unknown] |
 *   ['reject', PromiseReference, unknown]
 * >} VatSyscall
 */
function makeWorker({ waitUntilQuiescent, sysCallSync }) {
  let dispatch;

  /** @type {(d: [string, ...unknown[]], errmsg: string) => Promise<WorkerResult> } */
  async function doProcess(dispatchRecord, errmsg) {
    const dispatchOp = dispatchRecord[0];
    const dispatchArgs = dispatchRecord.slice(1);
    workerLog(`runAndWait`);
    await runAndWait(
      () => dispatch[dispatchOp](...dispatchArgs),
      errmsg,
      waitUntilQuiescent,
    );
    workerLog(`doProcess done`);
    return harden(['ok']);
  }

  /** @type {(targetSlot: string, msg: Message) => Promise<WorkerResult> } */
  function doMessage(targetSlot, msg) {
    const errmsg = `vat[${targetSlot}].${msg.method} dispatch failed`;
    return doProcess(
      ['deliver', targetSlot, msg.method, msg.args, msg.result],
      errmsg,
    );
  }

  /** @type {(vpid: PromiseReference, vp: Resolution) => Promise<WorkerResult> } */
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

  // TODO: parent should send ['start', vatID]
  /** @type { () => Promise<[string, ...unknown[]]> } */
  async function start() {
    workerLog(`got start`);
    return ['gotStart'];
  }

  /**
   * @param {unknown} bundle
   * @param {unknown} vatParameters
   * @param {unknown} virtualObjectCacheSize
   * @returns {Promise<[string, ...unknown[]]>}
   */
  function setBundle(bundle, vatParameters, virtualObjectCacheSize) {
    const endowments = {
      console: makeConsole(`SwingSet:vatWorker`),
      assert,
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
        virtualObjectCacheSize,
      );
      workerLog(`got dispatch:`, Object.keys(dispatch).join(','));
      return harden(['dispatchReady']);
    });
  }

  /** @type {(dtype: string, ...dargs: unknown[]) => Promise<[string, ...unknown[]]> } */
  async function deliver(dtype, ...dargs) {
    if (!dispatch) {
      workerLog(`error: deliver before dispatchReady`);
      throw new Error(`deliver before dispatchReady`);
    }
    switch (dtype) {
      case 'message': {
        const [targetSlot, message] = dargs;
        // @ts-ignore postpone dynamic string, Message type check
        return doMessage(targetSlot, message).then(res => [
          'deliverDone',
          ...res,
        ]);
      }
      case 'notify': {
        const [vpid, vp] = dargs;
        // @ts-ignore postpone dynamic string, Resolution type check
        return doNotify(vpid, vp).then(res => ['deliverDone', ...res]);
      }
      default:
        throw Error(`bad delivery type ${dtype}`);
    }
  }

  /** @type {(msg: [string, ...unknown[]]) => Promise<[string, ...unknown[]]> } */
  const handle = ([type, ...margs]) => {
    workerLog(`received`, type);
    switch (type) {
      case 'start':
        return start();
      case 'setBundle': {
        const [bundle, vatParameters, virtualObjectCacheSize] = margs;
        return setBundle(bundle, vatParameters, virtualObjectCacheSize);
      }
      case 'deliver': {
        const [dtype, ...dargs] = margs;
        // @ts-ignore postpone dtype string type check
        return deliver(dtype, ...dargs);
      }
      default:
        workerLog(`unrecognized downlink message ${type}`);
        return Promise.resolve([
          'error',
          `unrecognized downlink message ${type}`,
        ]);
    }
  };

  return harden({ handle });
}

/**
 * @param {{
 *   waitUntilQuiescent: () => Promise<void>,
 *   sysCall: (payload: ArrayBuffer) => ArrayBuffer,
 * }} io
 */
export function main({ waitUntilQuiescent, sysCall }) {
  workerLog(`supervisor started`);

  const toUTF8 = new TextEncoder();
  const fromUTF8 = new TextDecoder();

  /** @type { (payload: VatSyscall) => [string, ...unknown[]] } */
  function sysCallSync(data) {
    const buf = sysCall(toUTF8.encode(JSON.stringify(data)));
    /** @type { unknown } */
    const reply = JSON.parse(fromUTF8.decode(buf));
    assert(reply instanceof Array, 'expected Array reply from sysCall');
    const [tag, ...rest] = reply;
    assert(typeof tag === 'string', 'reply from sysCall must have string tag');
    return [tag, ...rest];
  }

  const worker = makeWorker({ waitUntilQuiescent, sysCallSync });

  /** @type { (buf: ArrayBuffer) => Promise<ArrayBuffer> } */
  async function onMessage(buf) {
    /** @type { unknown } */
    const msg = JSON.parse(fromUTF8.decode(buf));
    assert(msg instanceof Array, `msg must be an Array`);
    const [tag, ...args] = msg;
    assert(typeof tag === 'string', 'msg must have string tag');
    return toUTF8.encode(JSON.stringify(worker.handle([tag, ...args])));
  }

  return onMessage;
}
