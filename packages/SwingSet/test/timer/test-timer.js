import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { parse } from '@endo/marshal';
import { provideHostStorage } from '../../src/controller/hostStorage.js';
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

  const hostStorage = provideHostStorage();
  const deviceEndowments = {
    timer: { ...timer.endowments },
  };
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  c.pinVatRoot('bootstrap');
  timer.poll(1n); // initial time
  await c.run();

  const run = async (method, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    t.is(status, 'fulfilled', JSON.stringify([status, capdata]));
    return capdata;
  };

  const cd1 = await run('installWakeup', [3n]); // baseTime=3
  t.deepEqual(parse(cd1.body), 3n); // echoes the wakeup time

  const cd2 = await run('getEvents');
  t.deepEqual(parse(cd2.body), []); // no wakeups yet

  timer.poll(2n); // time passes but not enough
  await c.run();

  const cd3 = await run('getEvents');
  t.deepEqual(parse(cd3.body), []); // no wakeups yet

  timer.poll(4n); // yes enough
  await c.run();

  const cd4 = await run('getEvents');
  t.deepEqual(parse(cd4.body), [3n]); // scheduled time

  const cd5 = await run('installWakeup', [5n]);
  t.deepEqual(parse(cd5.body), 5n);
  const cd6 = await run('installWakeup', [6n]);
  t.deepEqual(parse(cd6.body), 6n);
  // If you added the same handler multiple times, removeWakeup()
  // would remove them all. It returns a list of wakeup timestamps.
  const cd7 = await run('removeWakeup');
  t.deepEqual(parse(cd7.body), [5n, 6n]);

  timer.poll(7n);
  await c.run();

  const cd8 = await run('getEvents');
  t.deepEqual(parse(cd8.body), []); // cancelled before wakeup

  const cd9 = await run('banana', [10n]);
  t.deepEqual(parse(cd9.body), 'bad setWakeup() handler');
});
