import '@agoric/install-ses';
import test from 'ava';
import { makeTimerMap, curryPollFn } from '../src/devices/timer-src';

test('multiMap multi store', t => {
  const mm = makeTimerMap();
  mm.add(3, 'threeA');
  mm.add(3, 'threeB');
  const threes = mm.removeEventsThrough(4);
  t.is(threes.length, 1);
  t.deepEqual(threes[0], {
    time: 3,
    handlers: [{ handler: 'threeA' }, { handler: 'threeB' }],
  });
  t.is(mm.removeEventsThrough(10).length, 0);
});

test('multiMap store multiple keys', t => {
  const mm = makeTimerMap();
  mm.add(3, 'threeA');
  mm.add(13, 'threeB');
  t.is(mm.removeEventsThrough(4).length, 1);
  t.is(mm.removeEventsThrough(10).length, 0);
  const thirteens = mm.removeEventsThrough(13);
  t.is(thirteens.length, 1, `${thirteens}`);
});

test('multiMap remove key', t => {
  const mm = makeTimerMap();
  mm.add(3, 'threeA');
  mm.add(13, 'threeB');
  t.deepEqual(mm.remove('not There'), []);
  t.deepEqual(mm.remove('threeA'), [3]);
  mm.remove(3, 'threeA');
  t.is(mm.removeEventsThrough(10).length, 0);
  const thirteens = mm.removeEventsThrough(13);
  t.is(thirteens.length, 1);
  t.deepEqual(thirteens[0], { time: 13, handlers: [{ handler: 'threeB' }] });
});

function fakeSO(o) {
  return {
    wake(arg = null) {
      o.wake(arg);
    },
  };
}

function makeHandler() {
  let calls = 0;
  const args = [];
  return {
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
  };
}

function makeFakeTimer(initialVal) {
  let fakeTime = initialVal;
  return {
    getLastPolled() {
      return fakeTime;
    },
    setTime(t) {
      fakeTime = t;
    },
  };
}

test('Timer schedule single event', t => {
  const schedule = makeTimerMap();
  const fakeTimer = makeFakeTimer(1);
  const lastPolled = fakeTimer.getLastPolled;
  const poll = curryPollFn(fakeSO, [], schedule, lastPolled, _ => {});
  t.falsy(poll(1)); // false when nothing is woken
  const handler = makeHandler();
  schedule.add(2, handler);
  t.is(fakeTimer.getLastPolled(), 1);
  t.truthy(poll(4));
  t.is(handler.getCalls(), 1);
  t.is(handler.getArgs()[0], 2);
});

test('Timer schedule multiple events', t => {
  const schedule = makeTimerMap();
  const fakeTimer = makeFakeTimer(1);
  const lastPolled = fakeTimer.getLastPolled;
  const poll = curryPollFn(fakeSO, [], schedule, lastPolled, _ => {});
  t.falsy(poll(1)); // false when nothing is woken
  const handler1 = makeHandler();
  const handler2 = makeHandler();
  schedule.add(3, handler1);
  schedule.add(4, handler1);
  schedule.add(2, handler2);
  t.is(lastPolled(), 1);
  t.truthy(poll(4));
  t.is(handler1.getCalls(), 2);
  t.is(handler2.getCalls(), 1);
  t.deepEqual(handler1.getArgs(), [3, 4]);
  t.deepEqual(handler2.getArgs(), [2]);
});

test('Timer schedule repeated event first', t => {
  const repeaterIndex = 0;
  const schedule = makeTimerMap();
  const fakeTimer = makeFakeTimer(1);
  const lastPolled = fakeTimer.getLastPolled;
  const repeater = { startTime: 3, interval: 4 };
  const poll = curryPollFn(fakeSO, [repeater], schedule, lastPolled, _ => {});
  t.falsy(poll(1)); // false when nothing is woken
  const handler = makeHandler();
  schedule.add(5, handler, repeaterIndex);
  t.falsy(poll(4));
  t.truthy(poll(5));
  t.is(handler.getCalls(), 1);
  t.deepEqual(handler.getArgs(), [5]);
  const expected = [{ time: 7, handlers: [{ handler, index: repeaterIndex }] }];
  t.deepEqual(schedule.removeEventsThrough(8), expected);
});

test('multiMap remove repeater key', t => {
  const repeaterIndex = 0;
  const scheduleTime = 3;
  const schedule = makeTimerMap();
  const fakeTimer = makeFakeTimer(1);
  const lastPolled = fakeTimer.getLastPolled;
  const repeater = { startTime: 2, interval: 4 };
  const poll = curryPollFn(fakeSO, [repeater], schedule, lastPolled, _ => {});
  t.falsy(poll(1)); // false when nothing is woken
  const handler = makeHandler();
  schedule.add(scheduleTime, handler, repeaterIndex);
  t.deepEqual(schedule.remove(handler), [scheduleTime]);
});

test('Timer schedule repeated event, repeatedly', t => {
  const repeaterIndex = 0;
  const schedule = makeTimerMap();
  const fakeTimer = makeFakeTimer(4);
  const lastPolled = fakeTimer.getLastPolled;
  const repeater = { startTime: 6, interval: 3 };
  const poll = curryPollFn(fakeSO, [repeater], schedule, lastPolled, _ => {});
  t.falsy(poll(4)); // false when nothing is woken
  const handler = makeHandler();
  schedule.add(9, handler, repeaterIndex);

  t.is(handler.getCalls(), 0);
  fakeTimer.setTime(8);
  t.falsy(poll(8));
  t.is(handler.getCalls(), 0);

  fakeTimer.setTime(10);
  t.truthy(poll(10));
  t.is(handler.getCalls(), 1);

  fakeTimer.setTime(12);
  t.truthy(poll(12));
  t.is(handler.getCalls(), 2);
  t.deepEqual(handler.getArgs(), [9, 12]);
});

test('Timer schedule multiple repeaters', t => {
  const repeaterIndex0 = 0;
  const repeaterIndex1 = 1;
  const repeaterIndex2 = 2;
  const schedule = makeTimerMap();
  const fakeTimer = makeFakeTimer(4);
  const lastPolled = fakeTimer.getLastPolled;
  const repeater0 = { startTime: 6, interval: 3 };
  const repeater1 = { startTime: 7, interval: 5 };
  const repeater2 = { startTime: 5, interval: 4 };
  const repeaters = [repeater0, repeater1, repeater2];
  const poll = curryPollFn(fakeSO, repeaters, schedule, lastPolled, _ => {});
  const handler0 = makeHandler();
  const handler1 = makeHandler();
  const handler2 = makeHandler();
  schedule.add(9, handler0, repeaterIndex0);
  schedule.add(12, handler1, repeaterIndex1);
  schedule.add(9, handler2, repeaterIndex2);

  fakeTimer.setTime(7);
  poll(7);
  t.is(handler0.getCalls(), 0);
  t.is(handler1.getCalls(), 0);
  t.is(handler2.getCalls(), 0);

  fakeTimer.setTime(10);
  t.truthy(poll(10));
  t.is(handler0.getCalls(), 1); // 9; next is 12
  t.is(handler1.getCalls(), 0); // first is 12
  t.is(handler2.getCalls(), 1); // 9; next is 13

  repeaters[repeaterIndex0] = undefined;
  fakeTimer.setTime(12);
  t.truthy(poll(12));
  t.is(handler0.getCalls(), 2); // 12; next won't happen
  t.is(handler1.getCalls(), 1); // 12; next is 17
  t.is(handler2.getCalls(), 1); // next is 13

  fakeTimer.setTime(14);
  t.truthy(poll(14));
  t.is(handler0.getCalls(), 2); // next is not scheduled
  t.is(handler1.getCalls(), 1); // next is 17
  t.is(handler2.getCalls(), 2); // 13; next is 17

  fakeTimer.setTime(16);
  t.falsy(poll(16)); // false when nothing is woken
  t.is(handler0.getCalls(), 2); // next didn't happen
  t.is(handler1.getCalls(), 1); // next is 17
  t.is(handler2.getCalls(), 2); // next is 17

  const h = [
    { handler: handler1, index: repeaterIndex1 },
    { handler: handler2, index: repeaterIndex2 },
  ];
  t.deepEqual(schedule.cloneSchedule(), [{ time: 17, handlers: h }]);
});
