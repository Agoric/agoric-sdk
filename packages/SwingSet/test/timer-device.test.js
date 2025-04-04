// @ts-nocheck
import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@endo/far';
import {
  makeTimerMap,
  curryPollFn,
} from '../src/devices/timer/device-timer.js';

test('multiMap multi store', t => {
  const mm = makeTimerMap();
  mm.add(3n, 'threeA');
  mm.add(3n, 'threeB');
  const threes = mm.removeEventsThrough(4n);
  t.is(threes.length, 1);
  t.deepEqual(threes[0], {
    time: 3n,
    handlers: [{ handler: 'threeA' }, { handler: 'threeB' }],
  });
  t.is(mm.removeEventsThrough(10n).length, 0);
});

test('multiMap store multiple keys', t => {
  const mm = makeTimerMap();
  mm.add(3n, 'threeA');
  mm.add(13n, 'threeB');
  t.is(mm.removeEventsThrough(4n).length, 1);
  t.is(mm.removeEventsThrough(10n).length, 0);
  const thirteens = mm.removeEventsThrough(13n);
  t.is(thirteens.length, 1, `${thirteens}`);
});

test('multiMap remove key', t => {
  const mm = makeTimerMap();
  mm.add(3n, 'threeA');
  mm.add(13n, 'threeB');
  t.deepEqual(mm.remove('not There'), []);
  t.deepEqual(mm.remove('threeA'), [3n]);
  mm.remove(3n, 'threeA');
  t.is(mm.removeEventsThrough(10n).length, 0);
  const thirteens = mm.removeEventsThrough(13n);
  t.is(thirteens.length, 1);
  t.deepEqual(thirteens[0], { time: 13n, handlers: [{ handler: 'threeB' }] });
});

function fakeSO(o) {
  return Far('fake SO', {
    wake(arg = null) {
      o.wake(arg);
    },
  });
}

function makeHandler() {
  let calls = 0;
  const args = [];
  return Far('wake handler', {
    getCalls() {
      return calls;
    },
    getArgs() {
      return args;
    },
    wake(arg) {
      args.push(arg);
      calls += 1;
    },
  });
}

function makeFakeTimer(initialVal) {
  let fakeTime = initialVal;
  return Far('fake timer', {
    getLastPolled() {
      return fakeTime;
    },
    setTime(t) {
      fakeTime = t;
    },
  });
}

test('Timer schedule single event', t => {
  const schedule = makeTimerMap();
  const fakeTimer = makeFakeTimer(1n);
  const lastPolled = fakeTimer.getLastPolled;
  const poll = curryPollFn(fakeSO, [], schedule, lastPolled, _ => {});
  t.falsy(poll(1n)); // false when nothing is woken
  const handler = makeHandler();
  schedule.add(2n, handler);
  t.is(fakeTimer.getLastPolled(), 1n);
  t.truthy(poll(4n));
  t.is(handler.getCalls(), 1);
  t.is(handler.getArgs()[0], 2n);
});

test('Timer schedule multiple events', t => {
  const schedule = makeTimerMap();
  const fakeTimer = makeFakeTimer(1);
  const lastPolled = fakeTimer.getLastPolled;
  const poll = curryPollFn(fakeSO, [], schedule, lastPolled, _ => {});
  t.falsy(poll(1n)); // false when nothing is woken
  const handler1 = makeHandler();
  const handler2 = makeHandler();
  schedule.add(3n, handler1);
  schedule.add(4n, handler1);
  schedule.add(2n, handler2);
  t.is(lastPolled(), 1);
  t.truthy(poll(4n));
  t.is(handler1.getCalls(), 2);
  t.is(handler2.getCalls(), 1);
  t.deepEqual(handler1.getArgs(), [3n, 4n]);
  t.deepEqual(handler2.getArgs(), [2n]);
});

test('Timer schedule repeated event first', t => {
  const repeaterIndex = 0;
  const schedule = makeTimerMap();
  const fakeTimer = makeFakeTimer(1n);
  const lastPolled = fakeTimer.getLastPolled;
  const repeater = { startTime: 3n, interval: 4n };
  const poll = curryPollFn(fakeSO, [repeater], schedule, lastPolled, _ => {});
  t.falsy(poll(1n)); // false when nothing is woken
  const handler = makeHandler();
  schedule.add(5n, handler, repeaterIndex);
  t.falsy(poll(4n));
  t.truthy(poll(5n));
  t.is(handler.getCalls(), 1);
  t.deepEqual(handler.getArgs(), [5n]);
  const expected = [
    { time: 7n, handlers: [{ handler, index: repeaterIndex }] },
  ];
  t.deepEqual(schedule.removeEventsThrough(8n), expected);
});

test('multiMap remove repeater key', t => {
  const repeaterIndex = 0;
  const scheduleTime = 3n;
  const schedule = makeTimerMap();
  const fakeTimer = makeFakeTimer(1);
  const lastPolled = fakeTimer.getLastPolled;
  const repeater = { startTime: 2n, interval: 4n };
  const poll = curryPollFn(fakeSO, [repeater], schedule, lastPolled, _ => {});
  t.falsy(poll(1n)); // false when nothing is woken
  const handler = makeHandler();
  schedule.add(scheduleTime, handler, repeaterIndex);
  t.deepEqual(schedule.remove(handler), [scheduleTime]);
});

test('Timer schedule repeated event, repeatedly', t => {
  const repeaterIndex = 0;
  const schedule = makeTimerMap();
  const fakeTimer = makeFakeTimer(4n);
  const lastPolled = fakeTimer.getLastPolled;
  const repeater = { startTime: 6n, interval: 3n };
  const poll = curryPollFn(fakeSO, [repeater], schedule, lastPolled, _ => {});
  t.falsy(poll(4n)); // false when nothing is woken
  const handler = makeHandler();
  schedule.add(9n, handler, repeaterIndex);

  t.is(handler.getCalls(), 0);
  fakeTimer.setTime(8n);
  t.falsy(poll(8n));
  t.is(handler.getCalls(), 0);

  fakeTimer.setTime(10n);
  t.truthy(poll(10n));
  t.is(handler.getCalls(), 1);

  fakeTimer.setTime(12n);
  t.truthy(poll(12n));
  t.is(handler.getCalls(), 2);
  t.deepEqual(handler.getArgs(), [9n, 12n]);
});

test('Timer schedule multiple repeaters', t => {
  const repeaterIndex0 = 0;
  const repeaterIndex1 = 1;
  const repeaterIndex2 = 2;
  const schedule = makeTimerMap();
  const fakeTimer = makeFakeTimer(4);
  const lastPolled = fakeTimer.getLastPolled;
  const repeater0 = { startTime: 6n, interval: 3n };
  const repeater1 = { startTime: 7n, interval: 5n };
  const repeater2 = { startTime: 5n, interval: 4n };
  const repeaters = [repeater0, repeater1, repeater2];
  const poll = curryPollFn(fakeSO, repeaters, schedule, lastPolled, _ => {});
  const handler0 = makeHandler();
  const handler1 = makeHandler();
  const handler2 = makeHandler();
  schedule.add(9n, handler0, repeaterIndex0);
  schedule.add(12n, handler1, repeaterIndex1);
  schedule.add(9n, handler2, repeaterIndex2);

  fakeTimer.setTime(7n);
  poll(7n);
  t.is(handler0.getCalls(), 0);
  t.is(handler1.getCalls(), 0);
  t.is(handler2.getCalls(), 0);

  fakeTimer.setTime(10n);
  t.truthy(poll(10n));
  t.is(handler0.getCalls(), 1); // 9; next is 12
  t.is(handler1.getCalls(), 0); // first is 12
  t.is(handler2.getCalls(), 1); // 9; next is 13

  repeaters[repeaterIndex0] = undefined;
  fakeTimer.setTime(12n);
  t.truthy(poll(12n));
  t.is(handler0.getCalls(), 2); // 12; next won't happen
  t.is(handler1.getCalls(), 1); // 12; next is 17
  t.is(handler2.getCalls(), 1); // next is 13

  fakeTimer.setTime(14n);
  t.truthy(poll(14n));
  t.is(handler0.getCalls(), 2); // next is not scheduled
  t.is(handler1.getCalls(), 1); // next is 17
  t.is(handler2.getCalls(), 2); // 13; next is 17

  fakeTimer.setTime(16n);
  t.falsy(poll(16n)); // false when nothing is woken
  t.is(handler0.getCalls(), 2); // next didn't happen
  t.is(handler1.getCalls(), 1); // next is 17
  t.is(handler2.getCalls(), 2); // next is 17

  const h = [
    { handler: handler1, index: repeaterIndex1 },
    { handler: handler2, index: repeaterIndex2 },
  ];
  t.deepEqual(schedule.cloneSchedule(), [{ time: 17n, handlers: h }]);
});

test('multiMap initialize with state', t => {
  const handlerA = makeHandler();
  const handlerB = makeHandler();
  const initialState = [
    { time: 3n, handlers: [{ handler: handlerA }] },
    { time: 5n, handlers: [{ handler: handlerB }, { handler: handlerA }] },
  ];
  const mm = makeTimerMap(initialState);

  // Verify initial state is loaded correctly
  const events = mm.removeEventsThrough(10n);
  t.is(events.length, 2);
  t.deepEqual(events[0], { time: 3n, handlers: [{ handler: handlerA }] });
  t.deepEqual(events[1], {
    time: 5n,
    handlers: [{ handler: handlerB }, { handler: handlerA }],
  });

  // Ensure the initial state wasn't mutated by makeTimerMap or removeEventsThrough
  t.deepEqual(initialState, [
    { time: 3n, handlers: [{ handler: handlerA }] },
    { time: 5n, handlers: [{ handler: handlerB }, { handler: handlerA }] },
  ]);
});

test.failing('multiMap remove edge cases', t => {
  const mm = makeTimerMap();
  const handlerA = makeHandler();
  const handlerB = makeHandler();
  const handlerC = makeHandler();

  // Remove from empty map
  t.deepEqual(mm.remove(handlerA), []);

  // Add multiple handlers for the same time
  mm.add(5n, handlerA);
  mm.add(5n, handlerB);
  mm.add(7n, handlerC);

  // Remove one handler when multiple exist for that time
  t.deepEqual(mm.remove(handlerA), [5n]);
  let events = mm.removeEventsThrough(6n);
  t.is(events.length, 1);
  t.deepEqual(events[0], { time: 5n, handlers: [{ handler: handlerB }] });

  // Add the same handler multiple times for the same time
  mm.add(8n, handlerC);
  mm.add(8n, handlerC); // Add C again at time 8, right after the other C
  mm.add(8n, handlerB); // Cause a gap between 2 occurences of C
  mm.add(8n, handlerC);

  t.deepEqual(mm.cloneSchedule(), [
    {
      time: 7n,
      handlers: [{ handler: handlerC }],
    },
    {
      time: 8n,
      handlers: [
        { handler: handlerC },
        { handler: handlerC },
        { handler: handlerB },
        { handler: handlerC },
      ],
    },
  ]);

  // Remove should remove all instances of the handler for that time
  t.deepEqual(mm.remove(handlerC), [7n, 8n, 8n, 8n]);
  events = mm.removeEventsThrough(10n);
  t.is(events.length, 1);
  // The only handlerC at time 7n was removed.
  // All handlerCs at time 8n were removed.
  t.deepEqual(events[0], { time: 8n, handlers: [{ handler: handlerB }] });
  t.deepEqual(mm.cloneSchedule(), []);
});

test('multiMap removeEventsThrough edge cases', t => {
  const mm = makeTimerMap();
  const handlerA = makeHandler();
  const handlerB = makeHandler();
  const handlerC = makeHandler();

  // Remove from empty map
  t.deepEqual(mm.removeEventsThrough(10n), []);

  mm.add(5n, handlerA);
  mm.add(10n, handlerB);
  mm.add(15n, handlerC);

  // Remove up to time before any events
  t.deepEqual(mm.removeEventsThrough(4n), []);
  t.deepEqual(mm.cloneSchedule(), [
    { time: 5n, handlers: [{ handler: handlerA }] },
    { time: 10n, handlers: [{ handler: handlerB }] },
    { time: 15n, handlers: [{ handler: handlerC }] },
  ]);

  // Remove up to time exactly matching first event
  let events = mm.removeEventsThrough(5n);
  t.is(events.length, 1);
  t.deepEqual(events[0], { time: 5n, handlers: [{ handler: handlerA }] });
  t.deepEqual(mm.cloneSchedule(), [
    { time: 10n, handlers: [{ handler: handlerB }] },
    { time: 15n, handlers: [{ handler: handlerC }] },
  ]);

  // Remove multiple events at once
  events = mm.removeEventsThrough(15n);
  t.is(events.length, 2);
  t.deepEqual(events[0], { time: 10n, handlers: [{ handler: handlerB }] });
  t.deepEqual(events[1], { time: 15n, handlers: [{ handler: handlerC }] });
  t.deepEqual(mm.cloneSchedule(), []);
});

test('multiMap cloneSchedule', t => {
  const mm = makeTimerMap();
  const handlerA = makeHandler();
  const handlerB = makeHandler();

  // Clone empty schedule
  const clone1 = mm.cloneSchedule();
  t.deepEqual(clone1, []);
  mm.add(5n, handlerA); // Modify original
  t.deepEqual(clone1, []); // Clone should be unaffected

  // Clone schedule with items
  mm.add(10n, handlerB);
  const clone2 = mm.cloneSchedule();
  t.deepEqual(clone2, [
    { time: 5n, handlers: [{ handler: handlerA }] },
    { time: 10n, handlers: [{ handler: handlerB }] },
  ]);

  // Modify original schedule
  mm.removeEventsThrough(7n);
  mm.add(12n, handlerA);

  // Verify clone2 is unaffected (deep copy of arrays)
  t.deepEqual(clone2, [
    { time: 5n, handlers: [{ handler: handlerA }] },
    { time: 10n, handlers: [{ handler: handlerB }] },
  ]);

  // Verify handlers themselves are not cloned (shallow copy of contents)
  t.is(clone2[0].handlers[0].handler, handlerA);
  t.is(clone2[1].handlers[0].handler, handlerB);

  // Modify a handler array within the clone
  clone2[0].handlers.push({ handler: handlerB });
  // Verify original schedule is unaffected
  t.deepEqual(mm.cloneSchedule(), [
    { time: 10n, handlers: [{ handler: handlerB }] },
    { time: 12n, handlers: [{ handler: handlerA }] },
  ]);
});
