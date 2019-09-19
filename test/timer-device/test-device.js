import { test } from 'tape-promise/tape';
import { buildVatController } from '../../src/index';
import { buildTimer } from '../../src/devices/timer';

const TimerSrc = '../../src/devices/timer-src';

async function testSimpleWake(t, withSES) {
  const timer = buildTimer();
  const config = {
    vats: new Map(),
    devices: [['timer', require.resolve(TimerSrc), timer.endowments]],
    bootstrapIndexJS: require.resolve('./bootstrap'),
  };
  const c = await buildVatController(config, withSES, ['timer']);
  timer.poll(1);
  await c.step();
  timer.poll(5);
  await c.step();
  t.deepEqual(c.dump().log, ['starting wake test', 'handler.wake()']);
  t.end();
}

test('wake with SES', async t => {
  await testSimpleWake(t, true);
});

test('wake without SES', async t => {
  await testSimpleWake(t, false);
});

async function testRepeater(t, withSES) {
  const timer = buildTimer();
  const config = {
    vats: new Map(),
    devices: [['timer', require.resolve(TimerSrc), timer.endowments]],
    bootstrapIndexJS: require.resolve('./bootstrap'),
  };
  const c = await buildVatController(config, withSES, ['repeater']);
  timer.poll(1);
  await c.step();
  timer.poll(5);
  await c.step();
  t.deepEqual(c.dump().log, [
    'starting repeater test',
    'handler.wake(handler)',
  ]);
  t.end();
}

test('repeater with SES', async t => {
  await testRepeater(t, true);
});

test('repeater without SES', async t => {
  await testRepeater(t, false);
});

async function testRepeater2(t, withSES) {
  const timer = buildTimer();
  const config = {
    vats: new Map(),
    devices: [['timer', require.resolve(TimerSrc), timer.endowments]],
    bootstrapIndexJS: require.resolve('./bootstrap'),
  };
  const c = await buildVatController(config, withSES, ['repeater2']);
  timer.poll(1);
  await c.step();
  timer.poll(5);
  await c.step();
  timer.poll(8);
  await c.step();
  t.deepEqual(c.dump().log, [
    'starting repeater test',
    'handler.wake(handler) called 1 times.',
    'handler.wake(handler) called 2 times.',
  ]);
  t.end();
}

test('repeater2 with SES', async t => {
  await testRepeater2(t, true);
});

test('repeater2 without SES', async t => {
  await testRepeater2(t, false);
});
