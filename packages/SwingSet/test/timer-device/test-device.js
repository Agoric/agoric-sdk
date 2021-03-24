/* global require */
import { test } from '../../tools/prepare-test-env-ava';

// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store-simple';

import { initializeSwingset, makeSwingsetController } from '../../src/index';
import { buildTimer } from '../../src/devices/timer';

const TimerSrc = require.resolve('../../src/devices/timer-src');

const timerConfig = {
  bootstrap: 'bootstrap',
  vats: {
    bootstrap: {
      sourceSpec: require.resolve('./bootstrap'),
    },
  },
  devices: {
    timer: {
      sourceSpec: TimerSrc,
    },
  },
};

test('wake', async t => {
  const timer = buildTimer();
  const deviceEndowments = {
    timer: { ...timer.endowments },
  };
  const hostStorage = initSwingStore().storage;

  await initializeSwingset(timerConfig, ['timer'], hostStorage);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  timer.poll(1);
  await c.step();
  timer.poll(5);
  await c.step();
  t.deepEqual(c.dump().log, ['starting wake test', 'handler.wake()']);
});

test('repeater', async t => {
  const timer = buildTimer();
  const deviceEndowments = {
    timer: { ...timer.endowments },
  };
  const hostStorage = initSwingStore().storage;

  await initializeSwingset(timerConfig, ['repeater', 3, 2], hostStorage);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  timer.poll(1);
  await c.step();
  timer.poll(5);
  await c.step();
  t.deepEqual(c.dump().log, [
    'starting repeater test',
    'next scheduled time: 3',
    'handler.wake(3) called 1 times.',
  ]);
});

test('repeater2', async t => {
  const timer = buildTimer();
  const deviceEndowments = {
    timer: { ...timer.endowments },
  };
  const hostStorage = initSwingStore().storage;

  await initializeSwingset(timerConfig, ['repeater', 3, 2], hostStorage);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  timer.poll(1n);
  await c.step();
  timer.poll(5n);
  await c.step();
  timer.poll(8n);
  await c.step();
  t.deepEqual(c.dump().log, [
    'starting repeater test',
    'next scheduled time: 3',
    'handler.wake(3) called 1 times.',
    'handler.wake(7) called 2 times.',
  ]);
});

test('repeaterZero', async t => {
  const timer = buildTimer();
  const deviceEndowments = {
    timer: { ...timer.endowments },
  };
  const hostStorage = initSwingStore().storage;

  await initializeSwingset(timerConfig, ['repeater', 0, 3], hostStorage);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  timer.poll(1);
  await c.step();
  timer.poll(2);
  await c.step();
  timer.poll(3);
  await c.step();
  timer.poll(4);
  await c.step();
  timer.poll(5);
  await c.step();
  timer.poll(6);
  await c.step();
  timer.poll(7);
  await c.step();
  timer.poll(8);
  await c.step();
  timer.poll(9);
  await c.step();
  timer.poll(10);
  await c.step();
  t.deepEqual(c.dump().log, [
    'starting repeater test',
    'next scheduled time: 3',
    'handler.wake(3) called 1 times.',
    'handler.wake(6) called 2 times.',
    'handler.wake(9) called 3 times.',
  ]);
});
