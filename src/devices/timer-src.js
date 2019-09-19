/**
 * A Timer device that provides a capability that can be used to schedule wake()
 * calls at particular times. The simpler form is an object w with a wake()
 * function can be passed to D(timer).setWakeup(300, w) to be woken after 5
 * minutes. The other form allows one to create a repeater object with
 * r = D(timer).createRepeater(120, 3600) which can be scheduled hourly starting
 * in two minutes. Each time r.schedule(w) is called, w.wake(r) will be
 * scheduled to be called after the next multiple of an hour since the initial
 * time. This doesn't guarantee that the wake() calls will come at the right
 * time, but repeated scheduling will not accumulate drift.
 *
 * The main entry point is setup. The other exports are for testing.
 * setup(...) calls makeDeviceSlots(..., makeRootDevice, ...), which calls
 * deviceSlots' build() function (which invokes makeRootDevice) to create the
 * root device. Selected vats that need to schedule events can be given access
 * to the device.
 *
 * This code runs in the inner half of the device vat. It handles kernel objects
 * in serialized format, and uses SO() to send messages to them.
 */

import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { insist } from '../insist';

/**
 * A MultiMap from times to one or more values. In addition to add() and
 * remove(), removeEventsThrough() supports removing (and returning) all the
 * key-value pairs with keys (deadlines) less than or equal to some value. The
 * values are either a handler (stored as { handler }) or a handler and a
 * repeater (stored as { handler, repeater }).
 *
 * To support quiescent solo vats (which normally only run if there's an
 * incoming event), we'd want to tell the host loop when we should next be
 * scheduled. It might be cheaper to find the smallest index in a sorted map.
 */
function buildTimerMap() {
  const numberToList = new Map();

  function add(time, handler, repeater = undefined) {
    const handlerRecord = repeater ? { handler, repeater } : { handler };
    if (!numberToList.has(time)) {
      numberToList.set(time, [handlerRecord]);
    } else {
      numberToList.get(time).push(handlerRecord);
    }
  }

  // We don't expect this to be called often, so we don't optimize for it.
  // There's some question as to whether it's important to invoke the handlers
  // in the order of their deadlines. If so, we should probably ensure that the
  // recorded deadlines don't have finer granularity than the turns.
  function remove(targetHandler) {
    for (const [time, handlers] of numberToList) {
      if (handlers.length === 1) {
        if (handlers[0].handler === targetHandler) {
          numberToList.delete(time);
          return targetHandler;
        }
      } else {
        // Nothing prevents a particular handler from appearing more than once
        for (const { handler } of handlers) {
          if (handler === targetHandler && handlers.indexOf(handler) !== -1) {
            handlers.splice(handlers.indexOf(handler), 1);
          }
        }
        if (handlers.length === 0) {
          numberToList.delete(time);
        }
        return targetHandler;
      }
    }
    return null;
  }

  // Remove and return all pairs indexed by numbers up to target
  function removeEventsThrough(target) {
    const returnValues = new Map();
    for (const [time, handlers] of numberToList) {
      if (time <= target) {
        returnValues.set(time, handlers);
        numberToList.delete(time);
      }
    }
    return returnValues;
  }
  return harden({ add, remove, removeEventsThrough });
}

// curryPollFn provided at top level so it can be exported and tested.
function curryPollFn(SO, deadlines) {
  // poll() is intended to be called by the host loop. Now might be Date.now(),
  // or it might be a block height.
  function poll(now) {
    const timeAndEvents = deadlines.removeEventsThrough(now);
    let wokeAnything = false;
    timeAndEvents.forEach(events => {
      for (const event of events) {
        if (event.repeater) {
          SO(event.handler).wake(event.repeater);
        } else {
          SO(event.handler).wake();
        }
        wokeAnything = true;
      }
    });
    return wokeAnything;
  }

  return poll;
}

// bind the repeater builder over deadlines so it can be exported and tested.
function curryRepeaterBuilder(deadlines, getLastPolled) {
  // An object whose presence can be shared with Vat code to enable reliable
  // repeating schedules. There's no guarantee that the handler will be called
  // at the precise desired time, but the repeated calls won't accumulate timing
  // drift, so the trigger point will be reached at consistent intervals.
  function buildRepeater(startTime, interval) {
    let disabled = false;
    const repeater = harden({
      schedule(handler) {
        if (disabled) {
          return;
        }
        const lastPolled = getLastPolled();
        // nextTime is the smallest startTime + N * interval after lastPolled
        const nextTime =
          lastPolled + interval - ((lastPolled - startTime) % interval);
        deadlines.add(nextTime, handler, repeater);
      },
      disable() {
        disabled = true;
      },
    });
    return repeater;
  }

  return buildRepeater;
}

export default function setup(syscall, state, helpers, endowments) {
  function makeRootDevice({ SO, getDeviceState, setDeviceState }) {
    const initialDeviceState = getDeviceState();

    // A MultiMap from times to schedule objects, with optional repeaters
    // { time: [{handler}, {handler, repeater}, ... ], ... }
    const deadlines = initialDeviceState
      ? initialDeviceState.deadlines
      : buildTimerMap();

    // The latest time poll() was called. This might be a block height or it
    // might be a time from Date.now(). The current time is not reflected back
    // to the user.
    let lastPolled = initialDeviceState ? initialDeviceState.lastPolled : 0;

    function updateState(time) {
      insist(
        time > lastPolled,
        `Time is monotonic. ${time} must be greater than ${lastPolled}`,
      );
      lastPolled = time;
      setDeviceState(harden({ lastPolled, deadlines }));
    }

    const innerPoll = curryPollFn(SO, deadlines);
    const poll = t => {
      updateState(t);
      return innerPoll(t);
    };
    endowments.registerDevicePollFunction(poll);

    const buildRepeater = curryRepeaterBuilder(deadlines, () => lastPolled);

    // The Root Device Node
    return harden({
      setWakeup(delaySecs, handler) {
        deadlines.add(lastPolled + Nat(delaySecs), handler);
        setDeviceState(harden({ lastPolled, deadlines }));
      },
      removeWakeup(handler) {
        deadlines.remove(handler);
        setDeviceState(harden({ lastPolled, deadlines }));
      },
      createRepeater(delaySecs, interval) {
        return buildRepeater(lastPolled + Nat(delaySecs), Nat(interval));
      },
    });
  }

  // return dispatch object
  return helpers.makeDeviceSlots(syscall, state, makeRootDevice, helpers.name);
}

// exported for testing. Only the default export is intended for production use.
export { buildTimerMap, curryPollFn, curryRepeaterBuilder };
