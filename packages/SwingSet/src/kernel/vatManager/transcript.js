import djson from '../djson';

export function makeTranscriptManager(vatKeeper, vatID) {
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

  function simulateSyscall(scObj) {
    const s = playbackSyscalls.shift();

    if (djson.stringify(s.d) !== djson.stringify(scObj)) {
      console.log(`anachrophobia strikes vat ${vatID}`);
      console.log(`expected:`, djson.stringify(s.d));
      console.log(`got     :`, djson.stringify(scObj));
      if (!replayError) {
        replayError = new Error(`historical inaccuracy in replay of ${vatID}`);
      }
      throw replayError;
    }
    return s.response;
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
    checkReplayError,
    inReplay,
  });
}
