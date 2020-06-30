import '@agoric/install-ses';
import { test } from 'tape-promise/tape';
import { buildVatController } from '../../src/index';
import { buildTimer } from '../../src/devices/timer';

const TimerSrc = '../../src/devices/timer-src';

async function testSimpleWake(t) {
  const timer = buildTimer();
  const config = {
    vats: new Map(),
    devices: [['timer', require.resolve(TimerSrc), timer.endowments]],
    bootstrapIndexJS: require.resolve('./bootstrap'),
  };
  const c = await buildVatController(config, ['timer']);
  timer.poll(1);
  await c.step();
  timer.poll(5);
  await c.step();
  t.deepEqual(c.dump().log, ['starting wake test', 'handler.wake()']);
  t.end();
}

test('wake', async t => {
  await testSimpleWake(t);
});

async function testRepeater(t) {
  const timer = buildTimer();
  const config = {
    vats: new Map(),
    devices: [['timer', require.resolve(TimerSrc), timer.endowments]],
    bootstrapIndexJS: require.resolve('./bootstrap'),
  };
  const c = await buildVatController(config, ['repeater', 3, 2]);
  timer.poll(1);
  await c.step();
  timer.poll(5);
  await c.step();
  t.deepEqual(c.dump().log, [
    'starting repeater test',
    'handler.wake(3) called 1 times.',
  ]);
  t.end();
}

test('repeater', async t => {
  await testRepeater(t);
});

async function testRepeater2(t) {
  const timer = buildTimer();
  const config = {
    vats: new Map(),
    devices: [['timer', require.resolve(TimerSrc), timer.endowments]],
    bootstrapIndexJS: require.resolve('./bootstrap'),
  };
  const c = await buildVatController(config, ['repeater', 3, 2]);
  timer.poll(1);
  await c.step();
  timer.poll(5);
  await c.step();
  timer.poll(8);
  await c.step();
  t.deepEqual(c.dump().log, [
    'starting repeater test',
    'handler.wake(3) called 1 times.',
    'handler.wake(7) called 2 times.',
  ]);
  t.end();
}

test('repeater2', async t => {
  await testRepeater2(t);
});

async function testRepeaterZero(t) {
  const timer = buildTimer();
  const config = {
    vats: new Map(),
    devices: [['timer', require.resolve(TimerSrc), timer.endowments]],
    bootstrapIndexJS: require.resolve('./bootstrap'),
  };
  const c = await buildVatController(config, ['repeater', 0, 3]);
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
    'handler.wake(3) called 1 times.',
    'handler.wake(6) called 2 times.',
    'handler.wake(9) called 3 times.',
  ]);
  t.end();
}

test('repeaterZero', async t => {
  await testRepeaterZero(t);
});
