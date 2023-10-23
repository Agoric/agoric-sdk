// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { kunser } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import { buildTimer } from '../../src/devices/timer/timer.js';

const bfile = name => new URL(name, import.meta.url).pathname;

test('timer vat', async t => {
  const timer = buildTimer();
  const config = {
    bootstrap: 'bootstrap',
    vats: { bootstrap: { sourceSpec: bfile('bootstrap-timer.js') } },
    devices: { timer: { sourceSpec: timer.srcPath } },
  };

  const kernelStorage = initSwingStore().kernelStorage;
  const deviceEndowments = {
    timer: { ...timer.endowments },
  };
  await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage, deviceEndowments);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  timer.poll(1n); // initial time
  await c.run();

  // this driver program exchanges bigints with bootstrap-timer.js,
  // which converts them to (branded) Timestamp and RelativeTime
  // records for us

  const run = async (method, args = []) => {
    await c.run(); // allow timer device/vat messages to settle
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const result = c.kpResolution(kpid);
    t.is(status, 'fulfilled', JSON.stringify([status, result]));
    return result;
  };

  const cd1 = await run('installWakeup', [3n]); // baseTime=3
  t.deepEqual(kunser(cd1), 3n); // echoes the wakeup time

  const cd2 = await run('getEvents');
  t.deepEqual(kunser(cd2), []); // no wakeups yet

  timer.poll(2n); // time passes but not enough
  await c.run();

  const cd3 = await run('getEvents');
  t.deepEqual(kunser(cd3), []); // no wakeups yet

  timer.poll(4n); // yes enough
  await c.run();

  const cd4 = await run('getEvents');
  t.deepEqual(kunser(cd4), [4n]); // current time

  const cd5 = await run('installWakeup', [5n]);
  t.deepEqual(kunser(cd5), 5n);
  const cd6 = await run('installWakeup', [6n]);
  t.deepEqual(kunser(cd6), 6n);
  // you can cancel a wakeup if you provided a cancelToken
  const cd7 = await run('cancel');
  t.deepEqual(kunser(cd7), undefined);

  timer.poll(7n);
  await c.run();

  const cd8 = await run('getEvents');
  t.deepEqual(kunser(cd8), []); // cancelled before wakeup

  const cd9 = await run('banana', [10n]);
  t.deepEqual(kunser(cd9), 'bad setWakeup() handler');

  // start a repeater that should first fire at now+delay+interval, so
  // 7+20+10=27,37,47,57,..
  await run('goodRepeater', [20n, 10n]);
  timer.poll(25n);
  const cd10 = await run('getEvents');
  t.deepEqual(kunser(cd10), []);
  timer.poll(35n); // fire 27, reschedules for 37
  const cd11 = await run('getEvents');
  t.deepEqual(kunser(cd11), [35n]);
  timer.poll(40n); // fire 37, reschedules for 47
  const cd12 = await run('getEvents');
  t.deepEqual(kunser(cd12), [40n]);

  // disabling the repeater at t=40 should unschedule the t=47 event
  await run('stopRepeater');
  timer.poll(50n);
  const cd13 = await run('getEvents');
  t.deepEqual(kunser(cd13), []);

  // exercises #4282
  const cd14 = await run('repeaterBadSchedule', [60n, 10n]);
  t.deepEqual(kunser(cd14), 'bad repeater.schedule() handler');
  timer.poll(75n);
  await c.run();
  t.pass('survived timer.poll');

  // using cancel() with a bogus token is ignored
  const cd15 = await run('badCancel', []);
  t.deepEqual(kunser(cd15), undefined);
});

// DONE+TESTED 1: deleting a repeater should cancel all wakeups for it, but the next wakeup happens anyways

// DONE-BY-DESIGN 2: deleting a repeater should free all memory used by it, but
// there's an array which holds empty entries and never shrinks

// DONE+TESTED 3: attempting to repeater.schedule an invalid handler should
// throw, but succeeds and provokes a kernel panic later when poll()
// is called (and tries to invoke the handler)

// DONE(delay) 4: vat-timer.js and timer.md claim `makeRepeater(delay,
// interval)` where the first arg is delay-from-now, but
// device-timer.js provides `makeRepeater(startTime, interval)`, where
// the arg is delay-from-epoch
