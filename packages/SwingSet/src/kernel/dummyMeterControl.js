// @ts-check
import { assert } from '@agoric/assert';

export const makeDummyMeterControl = () => {
  let meteringDisabled = 0;

  const isMeteringDisabled = () => !!meteringDisabled;

  const assertIsMetered = msg => {
    assert(!meteringDisabled, msg);
  };

  const assertNotMetered = msg => {
    assert(!!meteringDisabled, msg);
  };

  const runWithoutMetering = thunk => {
    meteringDisabled += 1;
    try {
      return thunk();
    } finally {
      meteringDisabled -= 1;
    }
  };

  const runWithoutMeteringAsync = async thunk => {
    meteringDisabled += 1;
    return Promise.resolve()
      .then(() => thunk())
      .finally(() => {
        meteringDisabled -= 1;
      });
  };

  // return a version of f that runs outside metering
  const unmetered = f => {
    const wrapped = (...args) => runWithoutMetering(() => f(...args));
    return harden(wrapped);
  };

  /** @type { MeterControl } */
  const meterControl = {
    isMeteringDisabled,
    assertIsMetered,
    assertNotMetered,
    runWithoutMetering,
    runWithoutMeteringAsync,
    unmetered,
  };
  return harden(meterControl);
};
