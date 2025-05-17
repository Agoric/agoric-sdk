// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { kunser } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import { buildTimer } from '../../src/devices/timer/timer.js';

const bfile = name => new URL(name, import.meta.url).pathname;

async function restartTimer(controller) {
  const fn = bfile('../../src/vats/timer/vat-timer.js');
  const bundle = await bundleSource(fn);
  const bundleID = await controller.validateAndInstallBundle(bundle);
  controller.upgradeStaticVat('timer', false, bundleID, {});
  await controller.run();
}

test('vat-timer upgrade', async t => {
  const timer = buildTimer();
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      // TODO refactor to use bootstrap-relay.js
      bootstrap: { sourceSpec: bfile('bootstrap-vat-timer-upgrade.js') },
    },
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

  const run = async (method, args = []) => {
    // await c.run(); // allow timer device/vat messages to settle
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    const result = c.kpResolution(kpid);
    t.is(status, 'fulfilled', JSON.stringify([status, result]));
    return result;
  };

  async function checkEvents(expected) {
    const cd = await run('getEvents');
    t.deepEqual(kunser(cd), expected);
  }

  // handler-based APIs can survive upgrade

  await run('installNotifier', ['a', 4n, 10n]); // 5,15,25,..
  await run('installRepeater', [6n, 10n]); // 7,17,27,..
  await run('installRepeatAfter', [8n, 10n]); // 9,19,29,..
  await run('installWakeup', [16n]);
  await run('installWakeup', [51n]);
  await run('getClock');
  await run('getBrand');

  // fire the iterator and Notifier once, to exercise their internal state
  {
    const kpid1 = c.queueToVatRoot('bootstrap', 'readIterator', ['a']);
    const kpid2 = c.queueToVatRoot('bootstrap', 'readNotifier', ['a']);
    await c.run();
    timer.poll(5n);
    await c.run();
    t.is(c.kpStatus(kpid1), 'fulfilled');
    t.deepEqual(kunser(c.kpResolution(kpid1)), { value: 5n, done: false });
    t.is(c.kpStatus(kpid2), 'fulfilled');
    t.is(kunser(c.kpResolution(kpid2)).value, 5n);
    // leave them in the inactive state (the iterator's internal
    // updateCount is set), so the next firing should be at 15n
  }

  // console.log(`-- ready for upgrade`);
  // schedule should be: 7,9,16,51

  // now upgrade vat-timer, and see if the state is retained
  await restartTimer(c);

  // check that the Clock and Brand identities are maintained
  {
    const cd = await run('checkClock');
    t.is(kunser(cd), true); // identity maintained
  }

  {
    const cd = await run('checkBrand');
    t.is(kunser(cd), true);
  }

  {
    const cd = await run('readClock');
    t.is(kunser(cd), 5n); // old Clock still functional
  }

  // check the iterator+notifier before we allow any more time to
  // pass: they should not fire right away, and should wait until 15n
  const iterKPID = c.queueToVatRoot('bootstrap', 'readIterator', ['a']);
  const notifierKPID = c.queueToVatRoot('bootstrap', 'readNotifier', ['a']);
  await c.run();
  t.is(c.kpStatus(iterKPID), 'unresolved');
  t.is(c.kpStatus(notifierKPID), 'unresolved');
  // schedule should be: repeat-7, repeatAfter-9, notifier-15,
  // iterator-15, wakeup-16, wakeup-51

  timer.poll(7n); // fires repeater
  await c.run();
  // schedule should be: repeatAfter-9, notifier-15, iterator-15,
  // wakeup-16, repeat-17, wakeup-51
  await checkEvents(['repeat-7']);

  timer.poll(9n); // fires repeatAfter
  await c.run();
  // schedule should be: notifier-15, iterator-15, wakeup-16,
  // repeat-17, repeatAfter-19, wakeup-51
  await checkEvents(['repeatAfter-9']);

  t.is(c.kpStatus(iterKPID), 'unresolved');
  timer.poll(15n); // fires iterator+notifier
  await c.run();
  // schedule should be: wakeup-16, repeat-17, repeatAfter-19,
  // wakeup-51 (repeaters automatically retrigger, but the iterator
  // and notifier do not)
  t.is(c.kpStatus(iterKPID), 'fulfilled');
  t.deepEqual(kunser(c.kpResolution(iterKPID)), {
    value: 15n,
    done: false,
  });
  t.is(c.kpStatus(notifierKPID), 'fulfilled');
  t.deepEqual(kunser(c.kpResolution(notifierKPID)).value, 15n);
  await checkEvents([]);

  // we advance time to each expected trigger one-at-a-time, rather
  // than jumping ahead to 16n, because our handlers are recording the
  // time at which they were fired, rather than the time at which they
  // were scheduled, and it would be hard to keep them distinct if
  // they all reported firing at 16n
  timer.poll(16n);
  await c.run();
  // schedule should be: repeat-17, repeatAfter-19, wakeup-51
  await checkEvents(['wake-16']);

  // cancelToken should still work
  await run('cancel'); // also does repeater.disable()
  // schedule now empty

  timer.poll(51n);
  // repeater would have fired at 27n, repeatAfter at 29n, wakeup at 51n
  await c.run();
  await checkEvents([]);

  // Latest notifier event after the stashed updateCount would have
  // been 45n, but it was cancelled, so we get the cancellation time.
  {
    const kpid = c.queueToVatRoot('bootstrap', 'readNotifier', ['a']);
    await c.run();
    t.is(c.kpStatus(kpid), 'fulfilled');
    const finished = kunser(c.kpResolution(kpid));
    t.deepEqual(finished, { value: 16n, updateCount: undefined });
  }

  // same for the iterator
  {
    const kpid = c.queueToVatRoot('bootstrap', 'readIterator', ['a']);
    await c.run();
    t.is(c.kpStatus(kpid), 'fulfilled');
    const finished = kunser(c.kpResolution(kpid));
    t.deepEqual(finished, { value: 16n, done: true });
  }

  // make a second notifier, cancel it before upgrade, then make sure
  // the cancellation sticks
  await run('installNotifier', ['b', 0n, 10n]); // 51,61,71,..
  await run('cancel'); // time of cancellation = 51

  await restartTimer(c);
  {
    const kpid = c.queueToVatRoot('bootstrap', 'readNotifier', ['b']);
    await c.run();
    t.is(c.kpStatus(kpid), 'fulfilled');
    const finished = kunser(c.kpResolution(kpid));
    t.deepEqual(finished, { value: 51n, updateCount: undefined });
  }
  {
    const kpid = c.queueToVatRoot('bootstrap', 'readIterator', ['b']);
    await c.run();
    t.is(c.kpStatus(kpid), 'fulfilled');
    const finished = kunser(c.kpResolution(kpid));
    t.deepEqual(finished, { value: 51n, done: true });
  }
});
