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

async function loadBundle(bundle, vatParameters, toChild, fromChild, testLog) {
  parentLog(`instructing worker to load bundle..`);
  toChild(['setBundle', bundle, vatParameters]);
  for await (const [type, ...args] of fromChild) {
    if (type === 'setUplinkAck') {
      parentLog(`upload ready`);
    } else if (type === 'gotBundle') {
      parentLog(`bundle loaded`);
    } else if (type === 'testLog') {
      testLog(...args);
    } else if (type === 'dispatchReady') {
      parentLog(`dispatch() ready`);
      // wait10ms().then(dispatchIsReady); // stall to let logs get printed
      return; // dispatch is ready
    } else {
      throw Error(`unexpected message '${type}' during setBundle`);
    }
  }
  throw Error(`child process disconnected unexpectedly`);
}

function handleSyscall(doSyscall, vatSyscallObject) {
  // We are currently invoked by an async piped from the worker thread,
  // whose vat code has moved on (it really wants a synchronous/immediate
  // syscall). TODO: unlike threads, subprocesses could be made to wait
  // by doing a blocking read from the pipe, so we could fix this, and
  // re-enable syscall.callNow
  const type = vatSyscallObject[0];
  if (type === 'callNow') {
    throw Error(`nodeWorker cannot block, cannot use syscall.callNow`);
  }
  // This might throw an Error if the syscall was faulty, in which case
  // the vat will be terminated soon. It returns a vatSyscallResults,
  // which we discard because there is currently nobody to send it to.
  doSyscall(vatSyscallObject);
}

export function makeNodeSubprocessFactory(tools) {
  const { startSubprocessWorker, kernelKeeper, testLog } = tools;

  async function createFromBundle(vatID, bundle, managerOptions) {
    const { vatParameters } = managerOptions;
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

    // start the worker and establish a connection
    const { fromChild, toChild, terminate, done } = startSubprocessWorker();

    await loadBundle(bundle, vatParameters, toChild, fromChild, testLog);

    function replayTranscript() {
      // TODO unimplemented
      throw Error(`replayTranscript not yet implemented`);
    }

    async function deliver(delivery) {
      parentLog(`sending delivery`, delivery);
      toChild(['deliver', ...delivery]);
      for await (const [type, ...args] of fromChild) {
        parentLog(`received`, type);
        if (type === 'syscall') {
          parentLog(`syscall`, args);
          const vatSyscallObject = args;
          handleSyscall(doSyscall, vatSyscallObject);
        } else if (type === 'testLog') {
          testLog(...args);
        } else if (type === 'deliverDone') {
          parentLog(`deliverDone`);
          const deliveryResult = args;
          return deliveryResult;
        } else {
          throw Error(`unrecognized uplink message ${type}`);
        }
      }
      throw Error(`child process disconnected unexpectedly`);
    }

    function shutdown() {
      terminate();
      return done;
    }

    const manager = harden({
      replayTranscript,
      setVatSyscallHandler,
      deliver,
      shutdown,
    });

    return manager;
  }

  return harden({ createFromBundle });
}
