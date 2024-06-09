import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { TimeMath } from '@agoric/time';
import buildManualTimer from '../../tools/manualTimer.js';

const { coerceTimestampRecord, coerceRelativeTimeRecord } = TimeMath;

test('manualTimer makeNotifier', async t => {
  const manualTimer = buildManualTimer(t.log);
  const toRT = rt => coerceRelativeTimeRecord(rt, manualTimer.getTimerBrand());
  const notifier = await E(manualTimer).makeNotifier(toRT(1n), toRT(1n));
  const p1 = E(notifier).getUpdateSince();
  // The notifier remains idle until it receives getUpdateSince(),
  // which schedules a response on the next interval. Using
  // E(notifier) means our getUpdateSince() hasn't arrived yet.
  await Promise.resolve();
  // that ensures it arrived, and t=0, so the wakeup is for t=1
  await manualTimer.tick();
  // now t=1 and the getUpdateSince() promise is resolved
  const update1 = await p1;
  const p2 = E(notifier).getUpdateSince(update1.updateCount);
  await Promise.resolve();
  await manualTimer.tick();
  const update2 = await p2;
  // @ts-expect-error updateCount could be undefined
  t.truthy(BigInt(update2.updateCount) > BigInt(update1.updateCount));
  t.truthy(TimeMath.compareAbs(update2.value, update1.value) > 0);
});

const makeHandler = () => {
  let calls = 0n;
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
      calls += 1n;
    },
  });
};

test('manualTimer makeRepeater', async t => {
  const manualTimer = buildManualTimer(t.log);
  const toRT = rt => coerceRelativeTimeRecord(rt, manualTimer.getTimerBrand());
  const timestamp = await E(manualTimer).getCurrentTimestamp();
  const repeater = E(manualTimer).makeRepeater(toRT(1n), toRT(1n));
  const handler = makeHandler();
  await E(repeater).schedule(handler);
  await manualTimer.tick();

  t.is(1n, handler.getCalls());
  t.truthy(TimeMath.compareAbs(handler.getArgs()[0], timestamp) > 0);
});

const stallLots = async () => {
  // it takes many cycles through the promise queue to finish this
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

test('tick does not flush by default', async t => {
  const manualTimer = buildManualTimer(t.log, 1n);
  const toTS = ts => coerceTimestampRecord(ts, manualTimer.getTimerBrand());
  let woken = toTS(666666n);
  let later = false;
  const handler = Far('handler', {
    wake: scheduled => {
      woken = scheduled;
      void stallLots().then(() => (later = true));
    },
  });
  manualTimer.setWakeup(toTS(1n), handler);
  t.deepEqual(woken, toTS(666666n));
  t.is(later, false);

  const p1 = manualTimer.tick();
  t.deepEqual(woken, toTS(666666n));
  t.is(later, false);

  // waiting on tick() cycles the promise queue once, but does not
  // wait for everything to be flushed
  await p1;
  t.deepEqual(woken, toTS(1n));
  t.is(later, false);
});

test('tick can flush promise queue', async t => {
  // .. if we provide eventLoopIteration
  const manualTimer = buildManualTimer(t.log, 1n, { eventLoopIteration });
  const toTS = ts => coerceTimestampRecord(ts, manualTimer.getTimerBrand());
  let woken = toTS(666666n);
  let later = false;
  const handler = Far('handler', {
    wake: scheduled => {
      woken = scheduled;
      void stallLots().then(() => (later = true));
    },
  });
  manualTimer.setWakeup(toTS(1n), handler);
  t.deepEqual(woken, toTS(666666n));
  t.is(later, false);
  const p1 = manualTimer.tick();

  // immediately after we tick (and before its return promise has
  // fired), nothing has happened yet, but the manual timer has a
  // callback scheduled to invoke the handler
  t.deepEqual(woken, toTS(666666n));
  t.is(later, false);

  // if we wait on tick(), both will complete
  await p1;
  t.deepEqual(woken, toTS(1n));
  t.is(later, true);
});

test('tick does not await makeRepeater by default', async t => {
  const manualTimer = buildManualTimer(t.log);
  const toRT = rt => coerceRelativeTimeRecord(rt, manualTimer.getTimerBrand());
  const toTS = ts => coerceTimestampRecord(ts, manualTimer.getTimerBrand());
  let woken = toTS(666666n);
  let later = false;
  const handler = Far('handler', {
    wake: scheduled => {
      woken = scheduled;
      void stallLots().then(() => (later = true));
    },
  });

  const r = manualTimer.makeRepeater(toRT(1n), toRT(1n));
  r.schedule(handler);
  t.deepEqual(woken, toTS(666666n));
  t.is(later, false);

  const p1 = manualTimer.tick();
  t.deepEqual(woken, toTS(666666n));
  t.is(later, false);

  // waiting on tick() cycles the promise queue once, but does not
  // wait for everything to be flushed
  await p1;
  t.deepEqual(woken, toTS(1n));
  t.is(later, false);
});

test('tick can flush makeRepeater', async t => {
  const manualTimer = buildManualTimer(t.log, 1n, { eventLoopIteration });
  const toRT = rt => coerceRelativeTimeRecord(rt, manualTimer.getTimerBrand());
  const toTS = ts => coerceTimestampRecord(ts, manualTimer.getTimerBrand());
  let woken = toTS(666666n);
  let later = false;
  const handler = Far('handler', {
    wake: scheduled => {
      woken = scheduled;
      void stallLots().then(() => (later = true));
    },
  });

  const r = manualTimer.makeRepeater(toRT(1n), toRT(1n));
  r.schedule(handler);

  t.deepEqual(woken, toTS(666666n));
  t.is(later, false);

  const p1 = manualTimer.tick();
  // callbacks are scheduled but not executed yet
  t.deepEqual(woken, toTS(666666n));
  t.is(later, false);

  // waiting on tick() flushes everything
  await p1;
  t.deepEqual(woken, toTS(2n));
  t.is(later, true);
});
