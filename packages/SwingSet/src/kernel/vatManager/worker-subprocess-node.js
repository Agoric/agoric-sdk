// @ts-check
// import { spawn } from 'child_process'; // not from Compartment

import { assert } from '@agoric/assert';
import { makePromiseKit } from '@agoric/promise-kit';
import { makeTranscriptManager } from './transcript';

import { createSyscall } from './syscall';

// start a "Worker" (Node's tool for starting new threads) and load a bundle
// into it

/*
import { waitUntilQuiescent } from '../../waitUntilQuiescent';
function wait10ms() {
  const { promise: queueEmptyP, resolve } = makePromiseKit();
  setTimeout(() => resolve(), 10);
  return queueEmptyP;
}
*/

// eslint-disable-next-line no-unused-vars
function parentLog(first, ...args) {
  // console.error(`--parent: ${first}`, ...args);
}

/**
 * @param {{
 *   startSubprocessWorker: () => {
 *     fromChild: Readable,
 *     toChild: Writable,
 *     terminate: () => void,
 *     done: Promise<void>,
 *   },
 *   kernelKeeper: {
 *     getVatKeeper: (id: string) => unknown,
 *   },
 *   testLog: (...args: unknown[]) => void,
 * }} tools
 * @returns {{
 *   createFromBundle: (id: string, b: Bundle, o: ManagerOptions) => Promise<VatManager>
 * }}
 *
 * @typedef { import('stream').Readable } Readable
 * @typedef { import('stream').Writable } Writable
 * @typedef { { moduleFormat: string, source: string, sourceMap: string } } Bundle
 */
export function makeNodeSubprocessFactory(tools) {
  const { startSubprocessWorker, kernelKeeper, testLog, decref } = tools;

  /**
   *
   * @param {string} vatID
   * @param {Bundle} bundle
   * @param {ManagerOptions} managerOptions
   * @returns {Promise<VatManager>}
   */
  function createFromBundle(vatID, bundle, managerOptions) {
    const { vatParameters, virtualObjectCacheSize } = managerOptions;
    assert(!managerOptions.metered, 'not supported yet');
    assert(!managerOptions.enableSetup, 'not supported at all');
    if (managerOptions.enableInternalMetering) {
      // TODO: warn+ignore, rather than throw, because the kernel enables it
      // for all vats, because the Spawner still needs it. When the kernel
      // stops doing that, turn this into a regular assert
      console.log(`node-worker does not support enableInternalMetering`);
    }
    const vatKeeper = kernelKeeper.getVatKeeper(vatID);
    const transcriptManager = makeTranscriptManager(
      kernelKeeper,
      vatKeeper,
      vatID,
    );

    // prepare to accept syscalls from the worker

    // TODO: make the worker responsible for checking themselves: we send
    // both the delivery and the expected syscalls, and the supervisor
    // compares what the bundle does with what it was told to expect.
    // Modulo flow control, we just stream transcript entries at the
    // worker and eventually get back an "ok" or an error. When we do
    // that, doSyscall won't even see replayed syscalls from the worker.

    const { doSyscall, setVatSyscallHandler } = createSyscall(
      transcriptManager,
    );
    /**
     * @param {unknown} vatSyscallObject
     * @returns {void}
     */
    function handleSyscall(vatSyscallObject) {
      // We are currently invoked by an async piped from the worker thread,
      // whose vat code has moved on (it really wants a synchronous/immediate
      // syscall). TODO: unlike threads, subprocesses could be made to wait
      // by doing a blocking read from the pipe, so we could fix this, and
      // re-enable syscall.callNow
      const type = Array.isArray(vatSyscallObject)
        ? vatSyscallObject[0]
        : typeof vatSyscallObject;
      if (type === 'callNow') {
        throw Error(`nodeWorker cannot block, cannot use syscall.callNow`);
      }
      // This might throw an Error if the syscall was faulty, in which case
      // the vat will be terminated soon. It returns a vatSyscallResults,
      // which we discard because there is currently nobody to send it to.
      doSyscall(vatSyscallObject);
    }

    function vatDecref(vref, count) {
      decref(vatID, vref, count);
    }

    // start the worker and establish a connection
    const { fromChild, toChild, terminate, done } = startSubprocessWorker();

    /** @type {(msg: unknown[]) => void} */
    function sendToWorker(msg) {
      assert(Array.isArray(msg));
      toChild.write(msg);
    }

    /** @type { PromiseRecord<void>} */
    const {
      promise: dispatchReadyP,
      resolve: dispatchIsReady,
    } = makePromiseKit();
    /** @type {null | ((r: unknown[]) => void) } */
    let waiting = null;

    /** @type {(data: unknown) => void} */
    function handleUpstream(data) {
      const type = Array.isArray(data) ? data[0] : typeof data;
      const args = Array.isArray(data) ? data.slice(1) : [];

      parentLog(`received`, type);
      if (type === 'setUplinkAck') {
        parentLog(`upload ready`);
      } else if (type === 'gotBundle') {
        parentLog(`bundle loaded`);
      } else if (type === 'dispatchReady') {
        parentLog(`dispatch() ready`);
        // wait10ms().then(dispatchIsReady); // stall to let logs get printed
        dispatchIsReady();
      } else if (type === 'syscall') {
        parentLog(`syscall`, args);
        const vatSyscallObject = args;
        handleSyscall(vatSyscallObject);
      } else if (type === 'testLog') {
        testLog(...args);
      } else if (type === 'deliverDone') {
        parentLog(`deliverDone`);
        if (waiting) {
          const resolve = waiting;
          waiting = null;
          const deliveryResult = args;
          resolve(deliveryResult);
        }
      } else if (type === 'decref') {
        const [vref, count] = args;
        vatDecref(vref, count);
      } else {
        parentLog(`unrecognized uplink message ${type}`);
      }
    }

    fromChild.on('data', handleUpstream);

    parentLog(`instructing worker to load bundle..`);
    sendToWorker(['setBundle', bundle, vatParameters, virtualObjectCacheSize]);

    /**
     * @param {unknown[]} delivery
     * @returns {Promise<unknown[]>}
     */
    function deliver(delivery) {
      parentLog(`sending delivery`, delivery);
      assert(!waiting, `already waiting for delivery`);
      const pr = makePromiseKit();
      waiting = pr.resolve;
      sendToWorker(['deliver', ...delivery]);
      return pr.promise;
    }

    function replayTranscript() {
      // TODO unimplemented
      throw Error(`replayTranscript not yet implemented`);
    }

    function shutdown() {
      terminate();
      return done;
    }

    /** @type { VatManager } */
    const manager = harden({
      replayTranscript,
      setVatSyscallHandler,
      deliver,
      shutdown,
    });

    return dispatchReadyP.then(() => manager);
  }

  return harden({ createFromBundle });
}
