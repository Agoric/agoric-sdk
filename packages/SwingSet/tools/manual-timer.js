import { Fail } from '@endo/errors';
import { Far } from '@endo/far';
import { makeScalarMapStore } from '@agoric/store';
import { bindAllMethods } from '@agoric/internal';
import { TimeMath } from '@agoric/time';
import { buildRootObject } from '../src/vats/timer/vat-timer.js';

/**
 * @import {Timestamp} from '@agoric/time'
 * @import {TimerService} from '@agoric/time'
 * @import {Waker} from '../src/devices/timer/device-timer.js'
 *
 * @typedef {object} ManualTimerCallbacks
 * @property {(newTime: bigint, msg?: string) => void} [advanceTo]
 * @property {(now: bigint, when: bigint) => void} [setWakeup]
 * @property {(now: bigint) => void} [wake]
 *
 * @typedef {object} ManualTimerState
 * @property {bigint} now
 * @property {undefined | bigint} currentWakeup
 * @property {undefined | Waker} currentHandler
 */

/**
 * Adapted from 'setup()' in test-vat-timer.js
 *
 * @param {ManualTimerCallbacks} callbacks
 * @returns {{ timerService: TimerService, state: ManualTimerState }}
 */
const setup = callbacks => {
  /** @type {{ now: bigint, currentWakeup: any, currentHandler: any }} */
  const state = {
    now: 0n, // current time, updated during test
    currentWakeup: undefined,
    currentHandler: undefined,
  };
  const deviceMarker = harden({});
  const timerDeviceFuncs = harden({
    getLastPolled: () => state.now,
    setWakeup: (when, handler) => {
      callbacks.setWakeup?.(state.now, TimeMath.absValue(when));
      assert.equal(state.currentWakeup, undefined, 'one at a time');
      assert.equal(state.currentHandler, undefined, 'one at a time');
      if (state.currentWakeup !== undefined) {
        state.currentWakeup > state.now ||
          Fail`too late: ${state.currentWakeup} <= ${state.now}`;
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
 * @param {object} [options]
 * @param {Timestamp} [options.startTime]
 * @param {ManualTimerCallbacks} [options.callbacks]
 * @returns {TimerService & { advanceTo: (when: Timestamp, msg?: string) => bigint; advanceBy: (rel: import('@agoric/time').RelativeTime, msg?: string) => bigint; }}
 */
export const buildManualTimer = (options = {}) => {
  const { startTime = 0n, callbacks = {}, ...other } = options;
  const unrec = Object.getOwnPropertyNames(other).join(',');
  unrec === '' || Fail`buildManualTimer unknown options ${unrec}`;
  const { timerService, state } = setup(callbacks);

  // the type of startTime is "Timestamp", which could nominally
  // include a TimerBrand, but in practice it couldn't possibly,
  // because the only acceptable brand hasn't been created (by the
  // timer itself) yet
  const startTimeVal = TimeMath.absValue(startTime);
  assert.typeof(startTimeVal, 'bigint');
  state.now = startTimeVal;

  const wake = () => {
    if (
      state.currentWakeup !== undefined &&
      state.now >= state.currentWakeup &&
      state.currentHandler
    ) {
      callbacks.wake?.(state.now);
      state.currentHandler.wake(state.now);
    }
  };

  const advanceTo = (when, msg) => {
    when = TimeMath.absValue(when);
    callbacks.advanceTo?.(when, msg);
    assert.typeof(when, 'bigint');
    when > state.now || Fail`advanceTo(${when}) < current ${state.now}`;
    state.now = when;
    wake();
    return when;
  };

  const advanceBy = (rel, msg) => {
    return advanceTo(TimeMath.addAbsRel(state.now, rel), msg);
  };

  return Far('ManualTimer', {
    ...bindAllMethods(timerService),
    advanceTo,
    advanceBy,
  });
};
