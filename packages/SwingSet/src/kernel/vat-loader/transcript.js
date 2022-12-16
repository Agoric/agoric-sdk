// @ts-check

import djson from '../../lib/djson.js';

// Indicate that a syscall is missing from the transcript but is safe to
// perform during replay
export const missingSyscall = Symbol('missing transcript syscall');

// Indicate that a syscall is recorded in the transcript but can be safely
// ignored / skipped during replay.
export const extraSyscall = Symbol('extra transcript syscall');

/** @typedef {typeof missingSyscall | typeof extraSyscall | Error | undefined} CompareSyscallsResult */
/** @typedef {(vatId: any, originalSyscall: VatSyscallObject, newSyscall: VatSyscallObject, originalResponse: VatSyscallResult) => CompareSyscallsResult} CompareSyscalls */

/**
 * @param {any} vatID
 * @param {VatSyscallObject} originalSyscall
 * @param {VatSyscallObject} newSyscall
 */
export function requireIdentical(vatID, originalSyscall, newSyscall) {
  if (djson.stringify(originalSyscall) !== djson.stringify(newSyscall)) {
    console.error(`anachrophobia strikes vat ${vatID}`);
    console.error(`expected:`, djson.stringify(originalSyscall));
    console.error(`got     :`, djson.stringify(newSyscall));
    return new Error(`historical inaccuracy in replay of ${vatID}`);
  }
  return undefined;
}

const vcSyscallRE = /^vc\.\d+\.\|(?:schemata|label)$/;

/**
 * Liveslots currently has a deficiency which results in [virtual collections
 * being sensitive to organic GC](https://github.com/Agoric/agoric-sdk/issues/6360).
 *
 * XS also has multiple issues causing memory to not be collected identically
 * depending on the load from snapshot schedule. This results in organic GC
 * triggering at different times based on which snapshot the worker was created
 * from.
 *
 * Combined together, these bugs cause syscalls being emitted by liveslots at
 * different times whether the execution occurred in a worker created from a
 * more or less recent snapshot. With a strict check during transcript replay,
 * this can cause [anachrophobia errors when restarting SwingSet](https://github.com/Agoric/agoric-sdk/issues/6588),
 * or potentially when reloading a vat that was paged out.
 *
 * Thankfully the syscalls issued by liveslots for these virtual collection
 * objects are both easily identifiable and stable over time. That means their
 * response is always the same regardless when the syscall is made.
 *
 * This method enhances the basic identical check and returns sentinel values
 * (unique symbols), indicating whether a syscall during replay requires to
 * skip an entry from the transcript or perform the actual syscall because the
 * entry is missing in the transcript. This works in conjunction with
 * `simulateSyscall` which then performs the appropriate action.
 *
 * @param {any} vatID
 * @param {VatSyscallObject} originalSyscall
 * @param {VatSyscallObject} newSyscall
 * @returns {CompareSyscallsResult}
 */
export function requireIdenticalExceptStableVCSyscalls(
  vatID,
  originalSyscall,
  newSyscall,
) {
  const error = requireIdentical(vatID, originalSyscall, newSyscall);

  if (error) {
    if (
      originalSyscall[0] === 'vatstoreGet' &&
      vcSyscallRE.test(originalSyscall[1])
    ) {
      // The syscall recorded in the transcript is for a virtual collection
      // metadata get. It can be safely skipped.
      console.warn(`  mitigation: ignoring extra vc syscall`);
      return extraSyscall;
    }

    if (newSyscall[0] === 'vatstoreGet' && vcSyscallRE.test(newSyscall[1])) {
      // The syscall performed by the vat is for a virtual collection metadata
      // get. It can be safely performed during replay.
      console.warn(`  mitigation: falling through to syscall handler`);
      return missingSyscall;
    }
  }

  return error;
}

/**
 * @param {*} vatKeeper
 * @param {*} vatID
 * @param {CompareSyscalls} compareSyscalls
 */
export function makeTranscriptManager(
  vatKeeper,
  vatID,
  compareSyscalls = requireIdentical,
) {
  let weAreInReplay = false;
  let playbackSyscalls;
  let currentEntry;

  function startDispatch(d) {
    currentEntry = {
      d,
      syscalls: [],
    };
  }

  function addSyscall(d, response) {
    if (currentEntry) {
      currentEntry.syscalls.push({ d, response });
    }
  }

  function finishDispatch() {
    if (!weAreInReplay) {
      vatKeeper.addToTranscript(currentEntry);
    }
  }

  // replay

  function startReplay() {
    weAreInReplay = true;
  }

  function startReplayDelivery(syscalls) {
    playbackSyscalls = Array.from(syscalls);
  }

  function inReplay() {
    return weAreInReplay;
  }

  function finishReplay() {
    weAreInReplay = false;
  }

  let replayError;

  const failReplay = error => {
    replayError =
      error ||
      replayError ||
      new Error(`historical inaccuracy in replay of ${vatID}`);
    throw replayError;
  };

  const checkReplayError = () => {
    if (replayError) {
      throw replayError;
    }
  };

  /** @param {VatSyscallObject} newSyscall */
  function simulateSyscall(newSyscall) {
    function simulateSyscallNext() {
      if (!playbackSyscalls.length) {
        // Error if the vat performs a syscall for which we don't have a
        // corresponding entry in the transcript.

        // Note that if a vat performed an "allowed" vc metadata get syscall after
        // we reach the end of the transcript, we would error instead of
        // falling through and performing the syscall. However liveslots does not
        // perform vc metadata get syscalls unless it needs to provide an entry
        // to the program, which always results in subsequent syscalls.
        return failReplay();
      }

      // eslint-disable-next-line no-use-before-define
      return handleCompareResult(
        compareSyscalls(
          vatID,
          playbackSyscalls[0].d,
          newSyscall,
          playbackSyscalls[0].response,
        ),
      );
    }
    /**
     * @param {CompareSyscallsResult} compareError
     * @returns {VatSyscallResult | undefined}
     */
    function handleCompareResult(compareError) {
      if (compareError === missingSyscall) {
        // return `undefined` to indicate that this syscall cannot be simulated
        // and needs to be performed (virtual collection metadata get)
        return undefined;
      }

      /** @type {{d: VatSyscallObject; response: VatSyscallResult}} */
      const s = playbackSyscalls.shift();

      if (!compareError) {
        return s.response;
      } else if (compareError !== extraSyscall) {
        return failReplay(compareError);
      } else {
        // Check the next transcript entry, skipping any extra syscalls recorded
        // in the transcript (virtual collection metadata get)
        return simulateSyscallNext();
      }
    }
    return simulateSyscallNext();
  }

  function finishReplayDelivery(dnum) {
    if (playbackSyscalls.length !== 0) {
      console.log(`anachrophobia strikes vat ${vatID} on delivery ${dnum}`);
      console.log(
        `delivery completed with ${playbackSyscalls.length} expected syscalls remaining`,
      );
      for (const s of playbackSyscalls) {
        console.log(`expected:`, djson.stringify(s.d));
      }
      failReplay();
    }
  }

  return harden({
    startDispatch,
    addSyscall,
    finishDispatch,
    startReplay,
    startReplayDelivery,
    finishReplay,
    simulateSyscall,
    finishReplayDelivery,
    checkReplayError,
    inReplay,
  });
}
