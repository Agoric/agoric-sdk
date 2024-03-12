// @ts-nocheck

import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../src/index.js';
import { buildTimer } from '../src/devices/timer/timer.js';

const TimerSrc = new URL(
  '../src/devices/timer/device-timer.js',
  import.meta.url,
).pathname;

// all tests that are sensitive to GC timing (which means anything
// that exercises transcript replay or looks at activityHash) need to
// use test.serial or config.defaultManagerType='xs-worker', until we
// figure out why gcAndFinalize sometimes doesn't work (details in
// #3240 and #4617). And even test.serial doesn't seem to be enough.

test('restarting kernel does not change activityhash', async t => {
  const sourceSpec = new URL('vat-empty-setup.js', import.meta.url).pathname;
  /** @type {SwingSetConfig} */
  const config = {
    defaultManagerType: 'xs-worker',
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec,
        creationOptions: {
          enableSetup: true,
        },
      },
    },
    devices: {
      timer: {
        sourceSpec: TimerSrc,
      },
    },
  };
  const timer1 = buildTimer();
  const deviceEndowments1 = {
    timer: { ...timer1.endowments },
  };
  const { kernelStorage: ks1, debug: debug1 } = initSwingStore();
  // console.log(`--c1 build`);
  await initializeSwingset(config, [], ks1);
  const c1 = await makeSwingsetController(ks1, deviceEndowments1);
  c1.pinVatRoot('bootstrap');
  // console.log(`--c1 poll1`);
  timer1.poll(1);
  // console.log(`--c1 run1`);
  await c1.run();

  // console.log(`--c1 serialize`);
  const serialized = debug1.serialize();
  // console.log(`ah: ${c1.getActivityhash()}`);

  // console.log(`--c1 poll1`);
  timer1.poll(2);
  // console.log(`--c1 run2`);
  await c1.run();

  // console.log(`--c1 dummy()`);
  c1.queueToVatRoot('bootstrap', 'dummy', []);
  // console.log(`--c1 run3`);
  await c1.run();
  const c1ah = c1.getActivityhash();
  await c1.shutdown();
  // console.log(`--c1 shutdown`);

  // a kernel restart is loading a new kernel from the same state
  const timer2 = buildTimer();
  const deviceEndowments2 = {
    timer: { ...timer2.endowments },
  };
  const { kernelStorage: ks2 } = initSwingStore(null, { serialized });
  // console.log(`--c2 build`);
  const c2 = await makeSwingsetController(ks2, deviceEndowments2);
  // console.log(`ah: ${c2.getActivityhash()}`);

  // console.log(`--c2 poll1`);
  timer2.poll(2);
  // console.log(`--c2 run2`);
  await c2.run();

  // console.log(`--c2 dummy()`);
  c2.queueToVatRoot('bootstrap', 'dummy', []);
  // console.log(`--c2 run3`);
  await c2.run();

  const c2ah = c2.getActivityhash();
  await c2.shutdown();

  t.is(c1ah, c2ah);
});

test('comms initialize is deterministic', async t => {
  // bug #3726: comms was calling vatstoreGet('initialize') and
  // vatstoreSet('meta.o+0') during the first message after process restart,
  // which makes it a nondeterministic function of the input events.

  const sourceSpec = new URL('vat-activityhash-comms.js', import.meta.url)
    .pathname;
  const config = { defaultManagerType: 'xs-worker' };
  config.bootstrap = 'bootstrap';
  config.vats = { bootstrap: { sourceSpec } };
  const { kernelStorage: ks1, debug: debug1 } = initSwingStore();
  await initializeSwingset(config, [], ks1);
  const c1 = await makeSwingsetController(ks1, {});
  c1.pinVatRoot('bootstrap');
  // the bootstrap message will cause comms to initialize itself
  await c1.run();

  const serialized = debug1.serialize();

  // but the second message should not
  c1.queueToVatRoot('bootstrap', 'addRemote', ['remote2']);
  await c1.run();
  const c1ah = c1.getActivityhash();
  await c1.shutdown();

  // a kernel restart is loading a new kernel from the same state
  const { kernelStorage: ks2 } = initSwingStore(null, { serialized });
  const c2 = await makeSwingsetController(ks2, {});

  // the "am I already initialized?" check must be identical to the
  // non-restarted version

  c2.queueToVatRoot('bootstrap', 'addRemote', ['remote2']);
  await c2.run();
  const c2ah = c2.getActivityhash();
  await c2.shutdown();

  t.is(c1ah, c2ah);
});
