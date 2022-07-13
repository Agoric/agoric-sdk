// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';
import { makeScalarMapStore } from '@agoric/store';
import { buildRootObject, debugTools } from '../src/vats/timer/vat-timer.js';
import { waitUntilQuiescent } from '../src/lib-nodejs/waitUntilQuiescent.js';

test('schedule', t => {
  const schedule = makeScalarMapStore();

  function addEvent(when, event) {
    return debugTools.addEvent(schedule, when, event);
  }
  function removeEvent(when, event) {
    return debugTools.removeEvent(schedule, when, event);
  }
  function firstWakeup() {
    return debugTools.firstWakeup(schedule);
  }
  function removeEventsUpTo(upto) {
    return debugTools.removeEventsUpTo(schedule, upto);
  }

  // exercise the ordered list, without concern about the durability
  // the handlers
  addEvent(10n, 'e10');
  addEvent(30n, 'e30');
  addEvent(20n, 'e20');
  addEvent(30n, 'e30x');
  t.deepEqual(schedule.get(10n), ['e10']);
  t.deepEqual(schedule.get(20n), ['e20']);
  t.deepEqual(schedule.get(30n), ['e30', 'e30x']);
  t.is(firstWakeup(), 10n);

  let done = removeEventsUpTo(5n);
  t.deepEqual(done, []);
  done = removeEventsUpTo(10n);
  t.deepEqual(done, ['e10']);
  t.is(firstWakeup(), 20n);
  done = removeEventsUpTo(10n);
  t.deepEqual(done, []);
  done = removeEventsUpTo(35n);
  t.deepEqual(done, ['e20', 'e30', 'e30x']);
  t.is(firstWakeup(), undefined);
  done = removeEventsUpTo(40n);
  t.deepEqual(done, []);

  addEvent(50n, 'e50');
  addEvent(50n, 'e50x');
  addEvent(60n, 'e60');
  addEvent(70n, 'e70');
  addEvent(70n, 'e70x');
  t.deepEqual(schedule.get(50n), ['e50', 'e50x']);
  t.is(firstWakeup(), 50n);
  removeEvent(50n, 'e50');
  t.deepEqual(schedule.get(50n), ['e50x']);
  // removing a bogus event is ignored
  removeEvent('50n', 'bogus');
  t.deepEqual(schedule.get(50n), ['e50x']);
  removeEvent(50n, 'e50x');
  t.not(schedule.has(50n));
  t.is(firstWakeup(), 60n);
});

test('cancels', t => {
  const cancels = makeScalarMapStore();
  function addCancel(cancelToken, event) {
    return debugTools.addCancel(cancels, cancelToken, event);
  }
  function removeCancel(cancelToken, event) {
    return debugTools.removeCancel(cancels, cancelToken, event);
  }

  const cancel1 = Far('cancel token', {});
  const cancel2 = Far('cancel token', {});
  const cancel3 = Far('cancel token', {});
  addCancel(cancel1, 'e10');
  addCancel(cancel2, 'e20');
  addCancel(cancel3, 'e30');
  addCancel(cancel3, 'e30x'); // cancels can be shared among events

  t.deepEqual(cancels.get(cancel1), ['e10']);
  t.deepEqual(cancels.get(cancel2), ['e20']);
  t.deepEqual(cancels.get(cancel3), ['e30', 'e30x']);

  removeCancel(cancel1, 'e10');
  t.not(cancels.has(cancel1));

  // bogus cancels are ignored
  removeCancel('bogus', 'e20');
  t.deepEqual(cancels.get(cancel2), ['e20']);
  // unrecognized events are ignored
  removeCancel(cancel2, 'bogus');
  t.deepEqual(cancels.get(cancel2), ['e20']);

  removeCancel(cancel3, 'e30x');
  t.deepEqual(cancels.get(cancel3), ['e30']);
  removeCancel(cancel3, 'e30');
  t.not(cancels.has(cancel3));

  t.throws(() => removeCancel(undefined)); // that would be confusing
});

test('nextScheduleTime', t => {
  const nst = debugTools.nextScheduleTime; // nst(start, interval, now)
  let start = 0n;
  const interval = 10n;

  t.is(nst(start, interval, 0n), 10n);
  t.is(nst(start, interval, 1n), 10n);
  t.is(nst(start, interval, 9n), 10n);
  t.is(nst(start, interval, 10n), 20n);
  t.is(nst(start, interval, 11n), 20n);

  start = 5n;
  t.is(nst(start, interval, 0n), 5n);
  t.is(nst(start, interval, 4n), 5n);
  t.is(nst(start, interval, 5n), 15n);
  t.is(nst(start, interval, 14n), 15n);
  t.is(nst(start, interval, 15n), 25n);

  start = 63n;
  t.is(nst(start, interval, 0n), 63n);
  t.is(nst(start, interval, 9n), 63n);
  t.is(nst(start, interval, 62n), 63n);
  t.is(nst(start, interval, 63n), 73n);
  t.is(nst(start, interval, 72n), 73n);
  t.is(nst(start, interval, 73n), 83n);
});

async function setup() {
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
  function D(node) {
    assert.equal(node, deviceMarker, 'fake D only supports devices.timer');
    return timerDeviceFuncs;
  }
  const vatPowers = { D };

  const vatParameters = {};
  // const baggage = makeScalarBigMapStore();
  const baggage = makeScalarMapStore();

  const root = buildRootObject(vatPowers, vatParameters, baggage);
  const ts = await E(root).createTimerService(deviceMarker);

  const fired = {};
  function makeHandler(which) {
    return Far('handler', {
      wake(time) {
        fired[which] = time;
      },
    });
  }

  function thenFire(p, which) {
    p.then(
      value => (fired[which] = ['fulfill', value]),
      err => (fired[which] = ['reject', err]),
    );
  }

  return { ts, state, fired, makeHandler, thenFire };
}

test('getCurrentTimestamp', async t => {
  // now = ts.getCurrentTimestamp()
  const { ts, state } = await setup();
  t.not(ts, undefined);
  state.now = 10n;
  t.is(await E(ts).getCurrentTimestamp(), 10n);
  t.is(await E(ts).getCurrentTimestamp(), 10n);
  state.now = 20n;
  t.is(await E(ts).getCurrentTimestamp(), 20n);
});

test('brand', async t => {
  // ts.getTimerBrand(), brand.isMyTimerService()
  const { ts } = await setup();
  const brand = await E(ts).getTimerBrand();

  t.is(await E(ts).getTimerBrand(), brand);
  t.truthy(await E(brand).isMyTimerService(ts));
  t.falsy(await E(brand).isMyTimerService({}));
  t.falsy(await E(brand).isMyTimerService(brand));
});

test('clock', async t => {
  // clock.getCurrentTimestamp() (and nothing else)
  const { ts, state } = await setup();
  const clock = E(ts).getClock();

  state.now = 10n;
  t.is(await E(clock).getCurrentTimestamp(), 10n);
  t.is(await E(clock).getCurrentTimestamp(), 10n);
  state.now = 20n;
  t.is(await E(clock).getCurrentTimestamp(), 20n);

  t.is(clock.setWakeup, undefined);
  t.is(clock.wakeAt, undefined);
  t.is(clock.makeRepeater, undefined);

  const brand = await E(ts).getTimerBrand();
  t.is(await E(clock).getTimerBrand(), brand);
});

test('setWakeup', async t => {
  // ts.setWakeup(when, handler, cancelToken) -> when
  const { ts, state, fired, makeHandler } = await setup();

  t.not(ts, undefined);
  t.is(state.currentWakeup, undefined);

  t.is(await E(ts).getCurrentTimestamp(), state.now);

  // the first setWakeup sets the alarm
  const t30 = await E(ts).setWakeup(30n, makeHandler(30));
  t.is(t30, 30n);
  t.is(state.currentWakeup, 30n);
  t.not(state.currentHandler, undefined);

  // an earlier setWakeup brings the alarm forward
  const cancel20 = Far('cancel token', {});
  await E(ts).setWakeup(20n, makeHandler(20), cancel20);
  t.is(state.currentWakeup, 20n);

  // deleting the earlier pushes the alarm back
  await E(ts).cancel(cancel20);
  t.is(state.currentWakeup, 30n);

  // later setWakeups do not change the alarm
  await E(ts).setWakeup(40n, makeHandler(40));
  await E(ts).setWakeup(50n, makeHandler(50));
  await E(ts).setWakeup(50n, makeHandler('50x'));
  // cancel tokens can be shared
  const cancel6x = Far('cancel token', {});
  await E(ts).setWakeup(60n, makeHandler(60n), cancel6x);
  await E(ts).setWakeup(60n, makeHandler('60x'));
  await E(ts).setWakeup(61n, makeHandler(61n), cancel6x);
  t.is(state.currentWakeup, 30n);

  // wake up exactly on time (30n)
  state.now = 30n;
  await E(state.currentHandler).wake(30n);
  await waitUntilQuiescent();
  t.is(fired[20], undefined); // was removed
  t.is(fired[30], 30n); // fired
  t.is(fired[40], undefined); // not yet fired
  // resets wakeup to next alarm
  t.is(state.currentWakeup, 40n);
  t.not(state.currentHandler, undefined);

  // wake up a little late (41n), then message takes a while to arrive
  // (51n), all wakeups before/upto the arrival time are fired
  state.now = 51n;
  await E(state.currentHandler).wake(41n);
  await waitUntilQuiescent();
  t.is(fired[40], 40n);
  t.is(fired[50], 50n);
  t.is(fired['50x'], 50n);
  t.is(fired[60], undefined);
  t.is(state.currentWakeup, 60n);
  t.not(state.currentHandler, undefined);

  // a setWakeup in the past will be fired immediately
  await E(ts).setWakeup(21n, makeHandler(21));
  t.is(fired[21], 21n);

  // the remaining time-entry handler should still be there
  state.now = 65n;
  await E(state.currentHandler).wake(state.now);
  await waitUntilQuiescent();
  t.is(fired['60x'], 60n);
});

test('wakeAt', async t => {
  // p = ts.wakeAt(absolute, cancelToken=undefined)
  const { ts, state, fired, thenFire } = await setup();

  const cancel10 = Far('cancel token', {});
  const cancel20 = Far('cancel token', {});
  thenFire(ts.wakeAt(10n, cancel10), '10');
  thenFire(ts.wakeAt(10n), '10x');
  thenFire(ts.wakeAt(20n, cancel20), '20');

  t.is(state.currentWakeup, 10n);

  state.now = 10n;
  await E(state.currentHandler).wake(10n);
  await waitUntilQuiescent();
  t.deepEqual(fired['10'], ['fulfill', 10n]);
  t.deepEqual(fired['10x'], ['fulfill', 10n]);
  t.deepEqual(fired['20'], undefined);

  // late cancel is ignored
  ts.cancel(cancel10);

  // adding a wakeAt in the past will fire immediately
  thenFire(ts.wakeAt(5n), '5');
  await waitUntilQuiescent();
  t.deepEqual(fired['5'], ['fulfill', 5n]);

  // cancelling a wakeAt causes the promise to reject
  ts.cancel(cancel20);
  await waitUntilQuiescent();
  t.deepEqual(fired['20'], ['reject', { name: 'TimerCancelled' }]);

  // duplicate cancel is ignored
  ts.cancel(cancel20);
});

test('delay', async t => {
  // p = ts.delay(relative, cancelToken=undefined)
  const { ts, state, fired, thenFire } = await setup();

  state.now = 100n;

  const cancel10 = Far('cancel token', {});
  const cancel20 = Far('cancel token', {});
  thenFire(ts.delay(10n, cancel10), '10'); // =110
  thenFire(ts.delay(10n), '10x'); // =110
  thenFire(ts.delay(20n, cancel20), '20'); // =120

  t.is(state.currentWakeup, 110n);

  state.now = 110n;
  await E(state.currentHandler).wake(110n);
  await waitUntilQuiescent();
  t.deepEqual(fired['10'], ['fulfill', 110n]);
  t.deepEqual(fired['10x'], ['fulfill', 110n]);
  t.deepEqual(fired['20'], undefined);

  // late cancel is ignored
  ts.cancel(cancel10);

  // delay must be positive non-negative
  t.throws(() => ts.delay(0n), { message: 'delay must be positive' });
  t.throws(() => ts.delay(-1n), { message: '-1 is negative' });

  // cancelling a delay causes the promise to reject
  ts.cancel(cancel20);
  await waitUntilQuiescent();
  t.deepEqual(fired['20'], ['reject', { name: 'TimerCancelled' }]);

  // duplicate cancel is ignored
  ts.cancel(cancel20);
});

test('makeRepeater', async t => {
  // r=ts.makeRepeater(delay, interval); r.schedule(handler); r.disable();
  const { ts, state, fired, makeHandler } = await setup();

  state.now = 3n;

  // fire at T=25,35,45,..
  const r1 = ts.makeRepeater(22n, 10n);
  t.is(state.currentWakeup, undefined); // not scheduled yet
  // interval starts at now+delay as computed during ts.makeRepeater,
  // not recomputed during r1.schedule()
  state.now = 4n;
  r1.schedule(makeHandler(1));
  t.is(state.currentWakeup, 25n);

  // duplicate .schedule throws
  const h2 = makeHandler(2);
  t.throws(() => r1.schedule(h2), { message: 'repeater already scheduled' });

  state.now = 1n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(fired[1], undefined); // not yet

  state.now = 24n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(fired[1], undefined); // wait for it

  state.now = 25n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(fired[1], 25n); // fired
  t.is(state.currentWakeup, 35n); // primed for next time

  // if we miss a couple, next wakeup is in the future
  state.now = 50n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(fired[1], 35n);
  t.is(state.currentWakeup, 55n);

  // likewise if device-timer message takes a while to reach vat-timer
  state.now = 60n;
  // sent at T=50, received by vat-timer at T=60
  state.currentHandler.wake(50n);
  await waitUntilQuiescent();
  t.is(fired[1], 55n);
  t.is(state.currentWakeup, 65n);

  r1.disable();
  t.is(state.currentWakeup, undefined);

  // duplicate .disable is ignored
  r1.disable();

  ts.setWakeup(70n, makeHandler(70));
  t.is(state.currentWakeup, 70n);
  state.now = 70n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(fired[70], 70n);
  t.is(fired[1], 55n); // not re-fired
  t.is(state.currentWakeup, undefined);

  let pk = makePromiseKit();
  let slowState = 'uncalled';
  const slowHandler = Far('slow', {
    wake(time) {
      slowState = time;
      return pk.promise;
    },
  });
  // we can .schedule a new handler if the repeater is not active
  r1.schedule(slowHandler);
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 75n);

  state.now = 80n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();

  // while the handler is running, the repeater is not scheduled
  t.is(slowState, 75n);
  t.is(state.currentWakeup, undefined);

  // if time passes while the handler is running..
  state.now = 100n;
  // .. then the repeater will skip some intervals
  pk.resolve('ignored');
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 105n); // not 85n

  r1.disable();

  // if the handler rejects, the repeater is cancelled
  const brokenHandler = Far('broken', {
    wake(_time) {
      throw Error('expected error');
    },
  });
  r1.schedule(brokenHandler);
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 105n);

  state.now = 110n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(state.currentWakeup, undefined); // no longer scheduled

  const h115 = makeHandler(115);

  // TODO: unfortunately, a handler rejection puts the repeater in a
  // funny state where we can't directly restart
  // it. `repeaterFacets.repeater` tracks its own state.active, which
  // is not cleared when a handler rejection does cancel() . I'd like
  // to see this fixed some day, but I don't think it's too important
  // right now, especially because unless the client is catching their
  // own exceptions, they have no way to discover the cancellation.

  t.throws(() => r1.schedule(h115), { message: 'repeater already scheduled' });

  // however, we *can* .disable() and then re-.schedule()
  r1.disable();
  r1.schedule(makeHandler(115));
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 115n);
  state.now = 115n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(fired[115], 115n);

  r1.disable();
  r1.schedule(brokenHandler);
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 125n);
  state.now = 130n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(state.currentWakeup, undefined);
  r1.disable();

  // we can .disable() while the handler is running
  pk = makePromiseKit();
  slowState = 'uncalled';
  r1.schedule(slowHandler);
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 135n);
  state.now = 140n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(slowState, 135n);
  r1.disable();
  pk.resolve('ignored');
  await waitUntilQuiescent();
  t.is(state.currentWakeup, undefined);
});

test('repeatAfter', async t => {
  // ts.repeatAfter(delay, interval, handler, cancelToken);
  const { ts, state, fired, makeHandler } = await setup();

  state.now = 3n;

  // fire at T=25,35,45,..
  const cancel1 = Far('cancel', {});
  ts.repeatAfter(22n, 10n, makeHandler(1), cancel1);
  t.is(state.currentWakeup, 25n);

  state.now = 4n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(fired[1], undefined); // not yet

  state.now = 24n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(fired[1], undefined); // wait for it

  state.now = 25n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(fired[1], 25n); // fired
  t.is(state.currentWakeup, 35n); // primed for next time

  // if we miss a couple, next wakeup is in the future
  state.now = 50n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(fired[1], 35n);
  t.is(state.currentWakeup, 55n);

  // likewise if device-timer message takes a while to reach vat-timer
  state.now = 60n;
  // sent at T=50, received by vat-timer at T=60
  state.currentHandler.wake(50n);
  await waitUntilQuiescent();
  t.is(fired[1], 55n);
  t.is(state.currentWakeup, 65n);

  // we can cancel the repeater while it is scheduled
  ts.cancel(cancel1);
  await waitUntilQuiescent();
  t.is(state.currentWakeup, undefined);

  // duplicate cancel is ignored
  ts.cancel(cancel1);

  ts.setWakeup(70n, makeHandler(70));
  t.is(state.currentWakeup, 70n);
  state.now = 70n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(fired[70], 70n);
  t.is(fired[1], 55n); // not re-fired
  t.is(state.currentWakeup, undefined);

  let pk = makePromiseKit();
  let slowState = 'uncalled';
  const slowHandler = Far('slow', {
    wake(time) {
      slowState = time;
      return pk.promise;
    },
  });

  const cancel2 = Far('cancel', {});
  ts.repeatAfter(5n, 10n, slowHandler, cancel2);
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 75n);

  state.now = 80n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();

  // while the handler is running, the repeater is not scheduled
  t.is(slowState, 75n);
  t.is(state.currentWakeup, undefined);

  // if time passes while the handler is running..
  state.now = 100n;
  // .. then the repeater will skip some intervals
  pk.resolve('ignored');
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 105n); // not 85n

  ts.cancel(cancel2);
  await waitUntilQuiescent();

  // if the handler rejects, the repeater is cancelled
  const brokenHandler = Far('broken', {
    wake(_time) {
      throw Error('expected error');
    },
  });
  // we can re-use cancel tokens too
  ts.repeatAfter(5n, 10n, brokenHandler, cancel1);
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 105n);

  state.now = 110n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(state.currentWakeup, undefined); // no longer scheduled

  // cancel is ignored, already cancelled
  ts.cancel(cancel1);
  await waitUntilQuiescent();

  // we can cancel while the handler is running
  pk = makePromiseKit();
  slowState = 'uncalled';
  const cancel3 = Far('cancel', {});
  ts.repeatAfter(5n, 10n, slowHandler, cancel3);
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 115n);
  state.now = 120n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.is(slowState, 115n);
  ts.cancel(cancel3); // while handler is running
  await waitUntilQuiescent();
  pk.resolve('ignored');
  await waitUntilQuiescent();
  t.is(state.currentWakeup, undefined);
  // still ignores duplicate cancels
  ts.cancel(cancel3);
});

test('notifier', async t => {
  // n = ts.makeNotifier(delay, interval, cancelToken);
  const { ts, state } = await setup();

  state.now = 100n;

  // fire at T=125,135,145,..
  const cancel1 = Far('cancel', {});
  const n = ts.makeNotifier(25n, 10n, cancel1);
  t.is(state.currentWakeup, undefined); // not active yet

  // native interface
  const p1 = n.getUpdateSince(undefined);
  let done1;
  p1.then(res => (done1 = res));
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 125n);

  state.now = 130n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.deepEqual(done1, { value: 125n, updateCount: 125n });
  // inactive until polled again
  t.is(state.currentWakeup, undefined);

  // fast handler turnaround gets the next event
  const p2 = n.getUpdateSince(done1.updateCount);
  let done2;
  p2.then(res => (done2 = res));
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 135n);

  state.now = 140n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.deepEqual(done2, { value: 135n, updateCount: 135n });
  t.is(state.currentWakeup, undefined);

  // slow handler turnaround misses an event
  state.now = 150n;
  const p3 = n.getUpdateSince(done2.updateCount);
  let done3;
  p3.then(res => (done3 = res));
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 155n);

  state.now = 160n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.deepEqual(done3, { value: 155n, updateCount: 155n });
  t.is(state.currentWakeup, undefined);

  // iterator interface
  const iter = n[Symbol.asyncIterator]();
  const p4 = iter.next();
  let done4;
  p4.then(res => (done4 = res));
  await waitUntilQuiescent();
  t.is(state.currentWakeup, 165n);

  state.now = 170n;
  state.currentHandler.wake(state.now);
  await waitUntilQuiescent();
  t.deepEqual(done4, { value: 165n, done: false });
  t.is(state.currentWakeup, undefined);

  // sample loop
  const results = [];
  async function drain5() {
    for await (const x of n) {
      results.push(x);
      if (results.length >= 5) {
        break;
      }
    }
  }

  const p5 = drain5();
  t.deepEqual(results, []);

  for (let now = 180n; now < 300n; now += 10n) {
    state.now = now;
    if (state.currentWakeup && state.currentHandler) {
      state.currentHandler.wake(state.now);
    }
    // eslint-disable-next-line no-await-in-loop
    await waitUntilQuiescent();
  }
  await p5;
  t.deepEqual(results, [175n, 185n, 195n, 205n, 215n]);
});
