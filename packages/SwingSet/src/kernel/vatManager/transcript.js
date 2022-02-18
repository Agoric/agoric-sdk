import djson from '../djson.js';

export const requireIdentical = (vatID, originalSyscall, newSyscall) => {
  if (djson.stringify(originalSyscall) !== djson.stringify(newSyscall)) {
    console.log(`anachrophobia strikes vat ${vatID}`);
    console.log(`expected:`, djson.stringify(originalSyscall));
    console.log(`got     :`, djson.stringify(newSyscall));
    return new Error(`historical inaccuracy in replay of ${vatID}`);
  }
  return undefined;
};

export const makeTranscriptManager = (
  vatKeeper,
  vatID,
  compareSyscalls = requireIdentical,
) => {
  let weAreInReplay = false;
  let playbackSyscalls;
  let currentEntry;

  const startDispatch = d => {
    currentEntry = {
      d,
      syscalls: [],
    };
  };

  const gcSyscalls = new Set(['dropImports', 'retireImports', 'retireExports']);

  const addSyscall = (d, response) => {
    const type = d[0];
    if (gcSyscalls.has(type)) {
      return;
    }
    if (currentEntry) {
      currentEntry.syscalls.push({ d, response });
    }
  };

  const finishDispatch = () => {
    if (!weAreInReplay) {
      vatKeeper.addToTranscript(currentEntry);
    }
  };

  // replay

  const startReplay = () => {
    weAreInReplay = true;
  };

  const startReplayDelivery = syscalls => {
    playbackSyscalls = Array.from(syscalls);
  };

  const inReplay = () => weAreInReplay;

  const finishReplay = () => {
    weAreInReplay = false;
  };

  let replayError;

  const simulateSyscall = newSyscall => {
    const type = newSyscall[0];
    if (gcSyscalls.has(type)) {
      return undefined;
    }
    const s = playbackSyscalls.shift();
    const newReplayError = compareSyscalls(vatID, s.d, newSyscall);
    if (newReplayError) {
      replayError = newReplayError;
      throw replayError;
    }
    return s.response;
  };

  const finishReplayDelivery = () => {
    if (playbackSyscalls.length !== 0) {
      console.log(`anachrophobia strikes vat ${vatID}`);
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
  };

  const checkReplayError = () => {
    if (replayError) {
      throw replayError;
    }
  };

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
};
