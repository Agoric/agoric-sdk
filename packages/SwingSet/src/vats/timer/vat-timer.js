// @ts-check

import { E } from '@endo/eventual-send';
import { Far, passStyleOf } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';
import { Nat } from '@agoric/nat';
import { assert } from '@agoric/assert';
import {
  provideKindHandle,
  defineDurableKind,
  defineDurableKindMulti,
  makeScalarBigMapStore,
  makeScalarBigWeakMapStore,
} from '@agoric/vat-data';
import { provide, makeLegacyWeakMap } from '@agoric/store';
import { TimeMath } from './timeMath.js';

// RAM usage: O(number of outstanding delay() promises) +
// O(number of notifiers??). setWakeup() only consumes DB.

/**
 * // Handler is a Far object with .wake(time) used for callbacks
 *
 * @typedef Handler
 * @property {(scheduled: Timestamp) => unknown} wake
 * @typedef {unknown} CancelToken
 * // CancelToken must be pass-by-reference and durable, either local or remote
 * @typedef Event
 * @property {() => void} scheduleYourself
 * @property {() => void} fired
 * @property {() => void} cancel
 * @typedef {MapStore<TimestampValue, Event[]>} Schedule
 * @typedef {WeakMapStore<CancelToken, Event[]>} CancelTable
 * @typedef {unknown} PromiseEvent
 * @typedef WakeupPromiseControls
 * @property {(scheduled: Timestamp) => void} resolve
 * @property {(err: unknown) => void} reject
 * @typedef {LegacyWeakMap<PromiseEvent, WakeupPromiseControls>} WakeupPromiseTable
 */

/* Repeaters have an Event with both 'start' and 'interval'. One-shot
 * wakeups are Events with .interval = undefined. Each Event is
 * tri-state: "scheduled" (.scheduled is non-undefined), "cancelled"
 * (.cancelled=true), or "executing" (only for Repeaters, indicated by
 * .scheduled=undefined and .cancelled = false). Events are kept alive
 * by the schedule while "scheduled", by handler.wake result promise
 * callbacks while "executing", and by mostly nothing when "cancelled".
 */

// these internal functions are exported for unit tests

/**
 * Insert an event into the schedule at its given time.
 *
 * @param {Schedule} schedule
 * @param {TimestampValue} when
 * @param {Event} event
 */
function addEvent(schedule, when, event) {
  assert.typeof(when, 'bigint');
  if (!schedule.has(when)) {
    schedule.init(when, harden([event]));
  } else {
    // events track their .scheduled time, so if addEvent() is called,
    // it is safe to assume the event isn't already scheduled
    schedule.set(when, harden([...schedule.get(when), event]));
  }
}

/**
 * Remove an event from the schedule
 *
 * @param {Schedule} schedule
 * @param {TimestampValue} when
 * @param {Event} event
 */
function removeEvent(schedule, when, event) {
  if (schedule.has(when)) {
    /** @typedef { Event[] } */
    const oldEvents = schedule.get(when);
    /** @typedef { Event[] } */
    const newEvents = oldEvents.filter(ev => ev !== event);
    if (newEvents.length === 0) {
      schedule.delete(when);
    } else if (newEvents.length < oldEvents.length) {
      schedule.set(when, harden(newEvents));
    }
  }
}

/**
 * Add a CancelToken->Event registration
 *
 * @param {CancelTable} cancels
 * @param {CancelToken} cancelToken
 * @param {Event} event
 */
function addCancel(cancels, cancelToken, event) {
  if (!cancels.has(cancelToken)) {
    cancels.init(cancelToken, harden([event]));
  } else {
    const oldEvents = cancels.get(cancelToken);
    // each cancelToken can cancel multiple events, but we only
    // addCancel() for each event once, so it is safe to assume the
    // event is not already there
    const events = [...oldEvents, event];
    cancels.set(cancelToken, harden(events));
  }
}

/**
 * Remove a CancelToken->Event registration
 *
 * @param {CancelTable} cancels
 * @param {CancelToken} cancelToken
 * @param {Event} event
 */
function removeCancel(cancels, cancelToken, event) {
  assert(cancelToken !== undefined); // that would be super confusing
  // this check is to tolerate a race between cancel and timer, but it
  // also means we ignore a bogus cancelToken
  if (cancels.has(cancelToken)) {
    const oldEvents = cancels.get(cancelToken);
    const newEvents = oldEvents.filter(oldEvent => oldEvent !== event);
    if (newEvents.length === 0) {
      cancels.delete(cancelToken);
    } else if (newEvents.length < oldEvents.length) {
      cancels.set(cancelToken, harden(newEvents));
    }
  }
}

/**
 * @param {Schedule} schedule
 * @returns {TimestampValue | undefined}
 */
function firstWakeup(schedule) {
  const iter = schedule.keys()[Symbol.iterator]();
  const first = iter.next();
  if (first.done) {
    return undefined;
  }
  return first.value;
}

// if you really must replace "time <= upto" below, use this
// function timeLTE(a, b) {
//    return TimeMath.compareAbs(a, b) !== 1;
// }
// if (timeLTE(time, upto)) {

/**
 * return list of events for time <= upto
 *
 * @param {Schedule} schedule
 * @param {TimestampValue} upto
 * @returns { Event[] }
 */
function removeEventsUpTo(schedule, upto) {
  assert.typeof(upto, 'bigint');
  let ready = [];
  for (const [time, events] of schedule.entries()) {
    if (time <= upto) {
      ready = ready.concat(events);
      schedule.delete(time);
    } else {
      break; // don't walk the entire future
    }
  }
  return ready;
}

/*
 * @param {TimestampValue} start
 * @param {RelativeTimeValue} interval
 * @param {TimestampValue} now
 * @returns {TimestampValue}
 */
function nextScheduleTime(start, interval, now) {
  // used to schedule repeaters
  assert.typeof(start, 'bigint');
  assert.typeof(interval, 'bigint');
  assert.typeof(now, 'bigint');
  // return the smallest value of `start + N * interval` after now
  if (now < start) {
    return start;
  }
  return now + interval - ((now - start) % interval);
}

export function buildRootObject(vatPowers, _vatParameters, baggage) {
  const { D } = vatPowers;

  // we use baggage to retain a device reference across upgrades
  let timerDevice;
  if (baggage.has('timerDevice')) {
    timerDevice = baggage.get('timerDevice');
  }
  function insistDevice() {
    assert(timerDevice, 'TimerService used before createTimerService()');
  }

  // first, create the KindHandles for all our durable objects
  const timerServiceHandle = provideKindHandle(baggage, 'timerServiceHandle');
  const oneShotEventHandle = provideKindHandle(baggage, 'oneShotEventHandle');
  const promiseEventHandle = provideKindHandle(baggage, 'promiseEventHandle');
  const repeaterEventHandle = provideKindHandle(baggage, 'repeaterEventHandle');
  const repeaterHandle = provideKindHandle(baggage, 'repeaterHandle');
  const notifierHandle = provideKindHandle(baggage, 'notifierHandle');

  // then the two durable tables

  // The 'schedule' maps upcoming timestamps to the Event that should
  // be fired. We rely upon the earlier-vs-later sortability of BigInt
  // keys, and upon our Stores performing efficient iteration.

  /** @type {Schedule} */
  const schedule = provide(baggage, 'schedule', () =>
    makeScalarBigMapStore('schedule', { durable: true }),
  );

  // 'cancels' maps cancel handles to Events that will be
  // removed. Each event knows its own .scheduled time, so we can find
  // and remove it from 'schedule'

  /** @type {CancelTable} */
  const cancels = provide(baggage, 'cancels', () =>
    makeScalarBigWeakMapStore('cancels', { durable: true }),
  );

  // Then an *ephemeral* WeakMap to hang on to the ephemeral Promise
  // resolve/reject functions for delay/wakeAt. We can't hold these
  // bare functions in the (durable) PromiseEvent, but we *can* use
  // the PromiseEvent as a key to fetch them when the event
  // fires. It's ok for these to be ephemeral: all promises get
  // rejected (with { name: 'vatUpgraded' }) during an upgrade, so if
  // the timer fires *after* an upgrade, we no longer need to reject
  // it ourselves.

  /** @type {WakeupPromiseTable} */
  const wakeupPromises = makeLegacyWeakMap('promises');

  // populated at the end of the function
  let wakeupHandler;

  // -- helper functions

  /**
   * convert an internal TimestampValue into a branded Timestamp
   *
   * @param {TimestampValue} when
   * @returns {Timestamp}
   */
  function toTimestamp(when) {
    return TimeMath.toAbs(when); // TODO (when, brand)
  }

  /**
   * convert external (branded) Timestamp to internal bigint
   *
   * @param {Timestamp} when
   * @returns {TimestampValue}
   */
  function fromTimestamp(when) {
    return TimeMath.absValue(when); // TODO: brand
  }

  /**
   * convert external (branded) RelativeTime to internal bigint
   *
   * @param {RelativeTime} delta
   * @returns {RelativeTimeValue}
   */
  function fromRelativeTime(delta) {
    return TimeMath.relValue(delta);
  }

  function reschedule() {
    assert(wakeupHandler, 'reschedule() without wakeupHandler');
    // the first wakeup should be in the future: the device will not
    // immediately fire when given a stale request
    const newFirstWakeup = firstWakeup(schedule);
    // idempotent and ignored if not currently registered
    D(timerDevice).removeWakeup(wakeupHandler);
    if (newFirstWakeup) {
      D(timerDevice).setWakeup(newFirstWakeup, wakeupHandler);
    }
  }

  /**
   * @returns {TimestampValue}
   */
  function getNow() {
    insistDevice();
    return Nat(D(timerDevice).getLastPolled());
  }

  // this gets called when the device's wakeup message reaches us
  function processAndReschedule() {
    // first, service everything that is ready
    const now = getNow();
    removeEventsUpTo(schedule, now).forEach(event => event.fired());
    // then, reschedule for whatever is up next
    reschedule();
  }

  // we have three kinds of events in our 'schedule' table: "one-shot"
  // (one-shot handler.wake), "promise" (one-shot promise.resolve),
  // and repeaters (handler.wake)

  // -- Event (one-shot)

  /**
   * @param {TimestampValue} when
   * @param {Handler} handler
   * @param {CancelToken} [cancelToken]
   */
  function initOneShotEvent(when, handler, cancelToken) {
    const scheduled = undefined; // set by scheduleYourself()
    const cancelled = false;
    return { when, handler, scheduled, cancelled, cancelToken };
  }

  const oneShotEventBehavior = {
    scheduleYourself({ self, state }) {
      const { when, cancelToken } = state;
      state.scheduled = when; // cleared if fired/cancelled
      addEvent(schedule, when, self);
      if (cancelToken) {
        addCancel(cancels, cancelToken, self);
      }
      reschedule();
    },

    fired({ self, state }) {
      const { cancelled, scheduled, handler, cancelToken } = state;
      state.scheduled = undefined;
      if (cancelled) {
        return;
      }
      // we tell the client their scheduled wakeup time, although
      // some time may have passed since device-timer told us, and
      // more time will pass before our wake() arrives at the client
      const p = E(handler).wake(toTimestamp(scheduled));
      // one-shots ignore errors and disappear
      p.catch(_err => undefined);
      // TODO use E.sendOnly() for non-repeaters, if it existed
      if (cancelToken) {
        self.cancel(); // stop tracking cancelToken
      }
    },

    cancel({ self, state }) {
      removeCancel(cancels, state.cancelToken, self);
      state.cancelled = true;
      if (state.scheduled) {
        removeEvent(schedule, state.scheduled, self);
        state.scheduled = undefined;
        reschedule();
      }
    },
  };

  const makeOneShotEvent = defineDurableKind(
    oneShotEventHandle,
    initOneShotEvent,
    oneShotEventBehavior,
  );

  // -- Event (promise)

  function initPromiseEvent(when, cancelToken) {
    const scheduled = undefined;
    const cancelled = false;
    return { when, scheduled, cancelled, cancelToken };
  }

  const promiseEventBehavior = {
    scheduleYourself({ self, state }) {
      const { when, cancelToken } = state;
      state.scheduled = when; // cleared if fired/cancelled
      addEvent(schedule, when, self);
      if (cancelToken) {
        addCancel(cancels, cancelToken, self);
      }
      reschedule();
    },

    fired({ self, state }) {
      const { cancelled, scheduled, cancelToken } = state;
      state.scheduled = undefined;
      if (cancelled) {
        return;
      }
      if (wakeupPromises.has(self)) {
        wakeupPromises.get(self).resolve(toTimestamp(scheduled));
        // else we were upgraded and promise was rejected/disconnected
      }
      if (cancelToken) {
        self.cancel(); // stop tracking the cancelToken
      }
    },

    cancel({ self, state }) {
      const { scheduled, cancelToken } = state;
      removeCancel(cancels, cancelToken, self);
      state.cancelled = true;
      if (scheduled) {
        removeEvent(schedule, scheduled, self);
        state.scheduled = undefined;
        reschedule();
        if (wakeupPromises.has(self)) {
          wakeupPromises.get(self).reject({ name: 'TimerCancelled' });
        }
      }
    },
  };

  const makePromiseEvent = defineDurableKind(
    promiseEventHandle,
    initPromiseEvent,
    promiseEventBehavior,
  );

  // -- Event (repeaters)

  function initRepeaterEvent(startTime, interval, handler, cancelToken) {
    const scheduled = undefined;
    const cancelled = false;
    const state = {
      startTime,
      interval,
      handler,
      scheduled,
      cancelled,
      cancelToken,
    };
    return state;
  }

  const repeaterEventBehavior = {
    scheduleYourself({ self, state }) {
      // first time
      const { startTime, interval, cancelToken } = state;
      const now = getNow();
      const when = nextScheduleTime(startTime, interval, now);
      state.scheduled = when; // cleared if fired/cancelled
      addEvent(schedule, when, self);
      if (cancelToken) {
        addCancel(cancels, cancelToken, self);
      }
      reschedule();
    },

    rescheduleYourself({ self, state }) {
      const { cancelled, startTime, interval } = state;
      if (cancelled) {
        // cancelled while waiting for handler to finish
        return;
      }
      const now = getNow();
      const when = nextScheduleTime(startTime, interval, now);
      state.scheduled = when; // cleared if fired/cancelled
      addEvent(schedule, when, self);
      reschedule();
    },

    fired({ self, state }) {
      const { cancelled, scheduled, handler } = state;
      state.scheduled = undefined;
      if (cancelled) {
        return;
      }
      // repeaters stay in "waiting" until their promise resolves,
      // at which point we either reschedule or cancel
      E(handler)
        .wake(toTimestamp(scheduled))
        .then(
          _res => self.rescheduleYourself(),
          _err => self.cancel(),
        )
        .catch(err => console.log(`timer repeater error`, err));
    },

    cancel({ self, state }) {
      const { scheduled, cancelToken } = state;
      removeCancel(cancels, cancelToken, self);
      state.cancelled = true;
      if (scheduled) {
        removeEvent(schedule, scheduled, self);
        state.scheduled = undefined;
        reschedule();
      }
    },
  };

  const makeRepeaterEvent = defineDurableKind(
    repeaterEventHandle,
    initRepeaterEvent,
    repeaterEventBehavior,
  );

  // -- more helper functions

  /**
   * @param {TimestampValue} when
   * @param {CancelToken} cancelToken
   * @returns {Promise<Timestamp>}
   */
  function wakeAtInternal(when, cancelToken) {
    const event = makePromiseEvent(when, cancelToken);
    const { resolve, reject, promise } = makePromiseKit();
    const controls = harden({ resolve, reject });
    wakeupPromises.init(event, controls);
    event.scheduleYourself();
    return promise; // disconnects upon upgrade
  }

  // -- now we can define the public API functions

  /**
   * @returns {Timestamp}
   */
  function getCurrentTimestamp() {
    return toTimestamp(getNow());
  }

  /**
   * @param {Timestamp} when
   * @param {Handler} handler
   * @param {CancelToken} [cancelToken]
   * @returns {Timestamp}
   */
  function setWakeup(when, handler, cancelToken = undefined) {
    when = fromTimestamp(when);
    assert.equal(passStyleOf(handler), 'remotable', 'bad setWakeup() handler');
    if (cancelToken) {
      assert.equal(passStyleOf(cancelToken), 'remotable', 'bad cancel token');
    }

    const now = getNow();
    if (when <= now) {
      // fire it immediately and skip the rest
      E(handler)
        .wake(toTimestamp(when))
        .catch(_err => undefined);
      // TODO: we'd use E.sendOnly() if it existed
      return toTimestamp(when);
    }

    const event = makeOneShotEvent(when, handler, cancelToken);
    event.scheduleYourself();
    // TODO this is the documented behavior, but is it useful?
    return toTimestamp(when);
  }

  /**
   * wakeAt(when): return a Promise that fires (with the scheduled
   * wakeup time) somewhat after 'when'. If a 'cancelToken' is
   * provided, calling ts.cancel(cancelToken) before wakeup will cause
   * the Promise to be rejected instead.
   *
   * @param {Timestamp} when
   * @param {CancelToken} [cancelToken]
   * @returns { Promise<Timestamp> }
   */
  function wakeAt(when, cancelToken = undefined) {
    when = fromTimestamp(when);
    const now = getNow();
    if (when <= now) {
      return Promise.resolve(toTimestamp(when));
    }
    return wakeAtInternal(when, cancelToken);
  }

  /**
   * delay(delay): return a Promise that fires (with the scheduled wakeup
   * time) at 'delay' time units in the future.
   *
   * @param {RelativeTime} delay
   * @param {CancelToken} [cancelToken]
   * @returns { Promise<Timestamp> }
   */
  function addDelay(delay, cancelToken = undefined) {
    delay = fromRelativeTime(delay);
    assert(delay > 0n, 'delay must be positive');
    const now = getNow();
    const when = now + delay;
    return wakeAtInternal(when, cancelToken);
  }

  /**
   * cancel(token): Cancel an outstanding one-shot or repeater. For
   * one-shots that return Promises, the Promise is rejected with {
   * name: 'TimerCancelled' }.
   *
   * @param {CancelToken} cancelToken
   */
  function cancel(cancelToken) {
    // silently ignore multiple cancels and bogus token
    if (cancels.has(cancelToken)) {
      cancels.get(cancelToken).forEach(event => event.cancel());
    }
  }

  /**
   * Internal function to register a handler, which will be invoked as
   * handler.wake(scheduledTime) at the earliest future instance of
   * `startTime + k*interval`. When the wake() result promise
   * fulfills, the repeater will be rescheduled for the next such
   * instance (there may be gaps). If that promise rejects, the
   * repeater will be cancelled. The repeater can also be cancelled by
   * providing `cancelToken` and calling
   * `E(timerService).cancel(cancelToken)`.
   *
   * @param {TimestampValue} startTime
   * @param {RelativeTimeValue} interval
   * @param {Handler} handler
   * @param {CancelToken} [cancelToken]
   */
  function repeat(startTime, interval, handler, cancelToken) {
    assert.typeof(startTime, 'bigint');
    assert.typeof(interval, 'bigint');
    assert(interval > 0n, 'interval must be positive');
    const event = makeRepeaterEvent(startTime, interval, handler, cancelToken);
    if (cancelToken) {
      addCancel(cancels, cancelToken, event);
    }
    // computes first wakeup (which is always in future, for
    // repeaters), inserts into schedule, updates alarm
    event.scheduleYourself();
  }

  // --- Repeaters: legacy "distinct Repeater object" API ---

  // The durable Repeater object is built from (delay, interval)
  // arguments which requests a wakeup at the earliest future instance
  // of `now + delay + k*interval`. The returned object provides
  // {schedule, disable} methods. We build an Event from it.

  function initRepeater(delay, interval) {
    // first wakeup at now+delay, then now+delay+k*interval
    delay = fromRelativeTime(delay);
    assert(delay >= 0n, 'delay must be non-negative');
    interval = fromRelativeTime(interval);
    assert(interval > 0n, 'interval must be nonzero');
    const start = getNow() + delay;
    const active = false;
    return { start, interval, active };
  }
  const repeaterFacets = {
    cancel: {}, // marker
    repeater: {
      schedule({ state, facets }, handler) {
        assert(
          passStyleOf(handler) === 'remotable',
          'bad repeater.schedule() handler',
        );
        assert(!state.active, 'repeater already scheduled');
        state.active = true;
        repeat(state.start, state.interval, handler, facets.cancel);
      },
      disable({ state, facets }) {
        if (state.active) {
          cancel(facets.cancel);
          state.active = false;
        }
      },
    },
  };
  const createRepeater = defineDurableKindMulti(
    repeaterHandle,
    initRepeater,
    repeaterFacets,
  );
  function makeRepeater(delay, interval) {
    return createRepeater(delay, interval).repeater;
  }

  /**
   * @param {RelativeTime} delay
   * @param {RelativeTime} interval
   * @param {Handler} handler
   * @param {CancelToken} [cancelToken]
   */
  function repeatAfter(delay, interval, handler, cancelToken) {
    // first wakeup at now+delay, then now+delay+k*interval
    delay = fromRelativeTime(delay);
    interval = fromRelativeTime(interval);
    const now = getNow();
    const startTime = now + delay;
    return repeat(startTime, interval, handler, cancelToken);
  }

  // -- notifiers

  /**
   * @param {RelativeTime} delay
   * @param {RelativeTime} interval
   * @param {CancelToken} [cancelToken]
   */
  function initNotifier(delay, interval, cancelToken = undefined) {
    // first wakeup at now+delay, then now+delay+k*interval
    delay = TimeMath.relValue(delay);
    assert(delay >= 0n, 'delay must be non-negative');
    interval = TimeMath.relValue(interval);
    assert(interval > 0n, 'interval must be nonzero');
    const now = getNow();
    const start = now + delay;
    if (cancelToken) {
      assert.equal(passStyleOf(cancelToken), 'remotable', 'bad cancel token');
    }
    return { start, interval, cancelToken };
  }

  const notifierFacets = {
    notifier: {
      [Symbol.asyncIterator]({ facets }) {
        return facets.iterator;
      },
      getUpdateSince({ state }, _updateCount) {
        const { start, interval, cancelToken } = state;
        const now = getNow();
        const when = nextScheduleTime(start, interval, now);
        const p = wakeAtInternal(when, cancelToken);
        return p.then(value => ({ value, updateCount: fromTimestamp(value) }));
      },
    },
    iterator: {
      next({ facets }) {
        const p = facets.notifier.getUpdateSince();
        return p.then(({ value }) => ({ value, done: false }));
      },
    },
  };

  /**
   * @param {RelativeTime} delay
   * @param {RelativeTime} interval
   * @param {CancelToken} [cancelToken]
   * @returns { { notifier: BaseNotifier<Timestamp>, iterator: Iterator<Timestamp> } }
   */
  const createNotifier = defineDurableKindMulti(
    notifierHandle,
    initNotifier,
    notifierFacets,
  );

  /**
   * makeNotifier(delay, interval): return a Notifier that fires on
   * the same schedule as makeRepeater()
   *
   * @param {RelativeTimeValue} delay
   * @param {RelativeTimeValue} interval
   * @param {CancelToken} cancelToken
   * @returns { BaseNotifier<Timestamp> }
   */
  function makeNotifier(delay, interval, cancelToken = undefined) {
    return createNotifier(delay, interval, cancelToken).notifier;
  }

  // -- now we finally build the TimerService

  // The TimerService has no state: this module only supports a single
  // instance (one TimerService per vat), and both the TimerDevice and
  // the supporting collections are closed over by the singleton.

  function initService() {
    return {};
  }

  function noContext(f) {
    return (context, ...args) => f(...args);
  }

  const serviceFacets = {
    wakeupHandler: {
      wake: _context => processAndReschedule(),
    },
    service: {
      getCurrentTimestamp: noContext(getCurrentTimestamp),
      // one-shot with handler
      setWakeup: noContext(setWakeup),
      // one-shot with Promise
      wakeAt: noContext(wakeAt), // absolute
      delay: noContext(addDelay), // relative
      // repeater with Repeater control object (old)
      makeRepeater: noContext(makeRepeater),
      // repeater without control object
      repeatAfter: noContext(repeatAfter),
      // Notifier
      makeNotifier: noContext(makeNotifier),
      // cancel setWakeup/wakeAt/delay/repeat
      cancel: noContext(cancel),
      // get attenuated read-only clock facet
      getClock: ({ facets }) => facets.clock,
      getTimerBrand: ({ facets }) => facets.brand,
    },
    clock: {
      getCurrentTimestamp: noContext(getCurrentTimestamp),
      getTimerBrand: ({ facets }) => facets.brand,
    },
    brand: {
      isMyTimerService: ({ facets }, alleged) => alleged === facets.service,
    },
  };

  const makeServiceFacets = defineDurableKindMulti(
    timerServiceHandle,
    initService,
    serviceFacets,
  );

  const timerServiceFacets = provide(
    baggage,
    'timerServiceFacets',
    makeServiceFacets,
  );
  wakeupHandler = timerServiceFacets.wakeupHandler;

  /**
   * createTimerService() registers devices.timer and returns the
   * timer service. This must called at least once, to connect the
   * device, but we don't prohibit it from being called again (to
   * replace the device), just in case that's useful someday
   *
   * @returns {Promise<TimerService>}
   */

  // TODO: maybe change the name though
  async function createTimerService(timerNode) {
    timerDevice = timerNode;
    if (baggage.has('timerDevice')) {
      baggage.set('timerDevice', timerDevice);
    } else {
      baggage.init('timerDevice', timerDevice);
    }
    return timerServiceFacets.service;
  }

  return Far('root', { createTimerService });
}

export const debugTools = harden({
  addEvent,
  removeEvent,
  addCancel,
  removeCancel,
  removeEventsUpTo,
  firstWakeup,
  nextScheduleTime,
});

// TODO: canceltoken1 serves two repeaters, one is killed because wake() throws, other should still be running, and cancellable
