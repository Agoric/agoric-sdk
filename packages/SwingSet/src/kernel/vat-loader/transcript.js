import djson from '../../lib/djson.js';

export const missingSyscall = Symbol('missing transcript syscall');
export const extraSyscall = Symbol('extra transcript syscall');

/** @typedef {typeof missingSyscall | typeof extraSyscall | Error | undefined} CompareSyscallsResult */

/**
 * @param {any} vatID
 * @param {object} originalSyscall
 * @param {object} newSyscall
 * @returns {CompareSyscallsResult}
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
 * @param {any} vatID
 * @param {object} originalSyscall
 * @param {object} newSyscall
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
      console.warn(`  mitigation: ignoring extra vc syscall`);
      return extraSyscall;
    }

    if (newSyscall[0] === 'vatstoreGet' && vcSyscallRE.test(newSyscall[1])) {
      console.warn(`  mitigation: falling through to syscall handler`);
      return missingSyscall;
    }
  }

  return error;
}

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

  function simulateSyscall(newSyscall) {
    while (playbackSyscalls.length) {
      const compareError = compareSyscalls(
        vatID,
        playbackSyscalls[0].d,
        newSyscall,
        playbackSyscalls[0].response,
      );

      if (compareError === missingSyscall) {
        return missingSyscall;
      }

      const s = playbackSyscalls.shift();

      if (!compareError) {
        return s.response;
      } else if (compareError !== extraSyscall) {
        replayError = compareError;
        break;
      }
    }

    if (!replayError) {
      replayError = new Error(`historical inaccuracy in replay of ${vatID}`);
    }
    throw replayError;
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
      if (!replayError) {
        replayError = new Error(`historical inaccuracy in replay of ${vatID}`);
      }
      throw replayError;
    }
  }

  function checkReplayError() {
    if (replayError) {
      throw replayError;
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
