import { test } from 'tape-promise/tape';
import {
  buildTimerMap,
  curryPollFn,
  curryRepeaterBuilder,
} from '../src/devices/timer-src';

test('multiMap multi store', t => {
  const mm = buildTimerMap();
  mm.add(3, 'threeA');
  mm.add(3, 'threeB');
  const threes = mm.removeEventsThrough(4);
  t.equal(threes.size, 1);
  t.deepEqual(threes.get(3), [{ handler: 'threeA' }, { handler: 'threeB' }]);
  t.equal(mm.removeEventsThrough(10).size, 0);
  t.end();
});

test('multiMap store multiple keys', t => {
  const mm = buildTimerMap();
  mm.add(3, 'threeA');
  mm.add(13, 'threeB');
  t.equal(mm.removeEventsThrough(4).size, 1);
  t.equal(mm.removeEventsThrough(10).size, 0);
  const thirteens = mm.removeEventsThrough(13);
  t.equal(thirteens.size, 1, thirteens);
  t.end();
});

test('multiMap remove key', t => {
  const mm = buildTimerMap();
  mm.add(3, 'threeA');
  mm.add(13, 'threeB');
  t.equals(mm.remove('not There'), null);
  t.equals(mm.remove('threeA'), 'threeA');
  mm.remove(3, 'threeA');
  t.equal(mm.removeEventsThrough(10).size, 0);
  const thirteens = mm.removeEventsThrough(13);
  t.equal(thirteens.size, 1);
  t.deepEqual(thirteens.get(13), [{ handler: 'threeB' }]);
  t.end();
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

test('Timer schedule single event', t => {
  const deviceState = buildTimerMap();
  const poll = curryPollFn(fakeSO, deviceState);
  t.notOk(poll(1));
  const handler = makeHandler();
  deviceState.add(2, handler);
  t.ok(poll(4));
  t.equals(handler.getCalls(), 1);
  t.equals(handler.getArgs()[0], null);
  t.end();
});

test('Timer schedule repeated event first', t => {
  let lastPolled = 0;
  const deviceState = buildTimerMap();
  const poll = curryPollFn(fakeSO, deviceState);
  t.notOk(poll(1));
  lastPolled = 1;
  const handler = makeHandler();
  const repeaterBuilder = curryRepeaterBuilder(deviceState, () => lastPolled);
  const rptr = repeaterBuilder(5, 3);
  rptr.schedule(handler);
  t.notOk(poll(4));
  lastPolled = 4;
  t.ok(poll(5));
  t.equals(handler.getCalls(), 1);
  t.equals(handler.getArgs()[0], rptr);
  t.end();
});

test('multiMap remove repeater key', t => {
  const deviceState = buildTimerMap();
  const lastPolled = 0;
  const handler = makeHandler();
  const repeaterBuilder = curryRepeaterBuilder(deviceState, () => lastPolled);
  const rptr = repeaterBuilder(5, 3);
  rptr.schedule(handler);
  t.equals(deviceState.remove(handler), handler);
  t.end();
});

test('Timer schedule repeated event, repeatedly', t => {
  const deviceState = buildTimerMap();
  let lastPolled = 0;
  const poll = curryPollFn(fakeSO, deviceState);
  t.notOk(poll(1));
  lastPolled = 1;
  const handler = makeHandler();
  const repeaterBuilder = curryRepeaterBuilder(deviceState, () => lastPolled);
  const rptr = repeaterBuilder(5, 3);
  rptr.schedule(handler);
  t.ok(poll(5));
  lastPolled = 5;
  t.equals(handler.getCalls(), 1);
  rptr.schedule(handler);
  t.notOk(poll(7));
  lastPolled = 7;
  t.ok(poll(8));
  lastPolled = 8;
  t.equals(handler.getCalls(), 2);
  t.deepEquals(handler.getArgs(), [rptr, rptr]);
  t.end();
});

test('Timer schedule multiple events', t => {
  const deviceState = buildTimerMap();
  let lastPolled = 0;
  const poll = curryPollFn(fakeSO, deviceState);
  t.notOk(poll(1));
  lastPolled = 1;
  const repeaterBuilder = curryRepeaterBuilder(deviceState, () => lastPolled);
  // will schedule at 2, 5, 8, etc.
  const rptr = repeaterBuilder(1, 3);
  const rptrHandler = makeHandler();
  const handler1 = makeHandler();
  const handler2 = makeHandler();
  rptr.schedule(rptrHandler);
  poll(4);
  rptr.schedule(rptrHandler);
  deviceState.add(5, handler1);
  deviceState.add(6, handler2);
  poll(7);
  t.equals(rptrHandler.getCalls(), 2);
  t.deepEquals(rptrHandler.getArgs(), [rptr, rptr]);
  t.equals(handler1.getCalls(), 1);
  t.equals(handler1.getArgs()[0], null);
  t.equals(handler2.getCalls(), 1);
  t.equals(handler2.getArgs()[0], null);
  t.end();
});
