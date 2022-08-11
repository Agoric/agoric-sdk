import { Far } from '@endo/marshal';
import { makeScalarMapStore } from '@agoric/store';
import { buildRootObject } from '../src/vats/timer/vat-timer.js';

// adapted from 'setup()' in test-vat-timer.js

const setup = () => {
  const state = {
    now: 0n, // current time, updated during test
    currentWakeup: undefined,
    currentHandler: undefined,
  };
  const deviceMarker = harden({});
  const timerDeviceFuncs = harden({
    getLastPolled: () => state.now,
    setWakeup: (when, handler) => {
      assert.equal(state.currentWakeup, undefined, 'one at a time');
      assert.equal(state.currentHandler, undefined, 'one at a time');
      if (state.currentWakeup !== undefined) {
        assert(
          state.currentWakeup > state.now,
          `too late: ${state.currentWakeup} <= ${state.now}`,
        );
      }
      state.currentWakeup = when;
      state.currentHandler = handler;
      return when;
    },
    removeWakeup: _handler => {
      state.currentWakeup = undefined;
      state.currentHandler = undefined;
    },
  });
  const D = node => {
    assert.equal(node, deviceMarker, 'fake D only supports devices.timer');
    return timerDeviceFuncs;
  };
  const vatPowers = { D };

  const vatParameters = {};
  // const baggage = makeScalarBigMapStore();
  const baggage = makeScalarMapStore();

  const root = buildRootObject(vatPowers, vatParameters, baggage);
  const timerService = root.createTimerService(deviceMarker);

  return { timerService, state };
};

/**
 * A fake TimerService, for unit tests that do not use a real
 * kernel. You can make time pass by calling `advanceTo(when)`.
 *
 * @param {ManualTimerOptions} [options]
 * @returns {ManualTimer}
 */
export const buildManualTimer = (options = {}) => {
  const { startTime = 0n, ...other } = options;
  const unrec = Object.getOwnPropertyNames(other).join(',');
  assert.equal(unrec, '', `buildManualTimer unknown options ${unrec}`);
  const { timerService, state } = setup();
  assert.typeof(startTime, 'bigint');
  state.now = startTime;

  const wake = () => {
    if (state.currentHandler) {
      state.currentHandler.wake(state.now);
    }
  };

  const advanceTo = when => {
    assert.typeof(when, 'bigint');
    assert(when > state.now, `advanceTo(${when}) < current ${state.now}`);
    state.now = when;
    wake();
  };

  return Far('ManualTimer', { ...timerService, advanceTo });
};
