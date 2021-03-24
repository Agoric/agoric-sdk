/* global __dirname */
import { test } from '../tools/prepare-test-env-ava';

// eslint-disable-next-line import/order
import path from 'path';
import {
  buildVatController,
  loadBasedir,
  buildKernelBundles,
} from '../src/index';

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

test('flush', async t => {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, ['flush'], t.context.data);
  // all promises should settle before c.step() fires
  await c.step();
  t.deepEqual(c.dump().log, ['then1', 'then2']);
});

test('E() resolve', async t => {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, ['e-then'], t.context.data);

  await c.run();
  t.deepEqual(c.dump().log, [
    'left.callRight 1',
    'right 2',
    'b.resolved 3',
    'left.then 4',
  ]);
});

test('E(E(x).foo()).bar()', async t => {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, ['chain1'], t.context.data);

  /*
  while (true) {
    console.log('--- STEP ----------------------------------------------------------------');
    await c.step();
    console.log(c.dump());
    if (!c.dump().runQueue.length)
      break;
  } */
  await c.run();

  t.deepEqual(c.dump().log, [
    'b.call2',
    'left.call2 1',
    'left.call3 2',
    'b.resolved 3',
  ]);
});

test('E(Promise.resolve(presence)).foo()', async t => {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, ['chain2'], t.context.data);

  await c.run();
  t.deepEqual(c.dump().log, [
    'b.call2',
    'left.call2 1',
    'left.call3 2',
    'b.resolved 3',
  ]);
});

test('E(local).foo()', async t => {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, ['local1'], t.context.data);

  await c.run();
  t.deepEqual(c.dump().log, ['b.local1.finish', 'local.foo 1', 'b.resolved 2']);
});

test('resolve-to-local', async t => {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, ['local2'], t.context.data);

  await c.run();
  t.deepEqual(c.dump().log, [
    'b.local2.finish',
    'left.returnArg',
    'local.foo 2',
    'b.resolved 3',
  ]);
});

test('send-promise-resolve-to-local', async t => {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-promises'));
  const c = await buildVatController(config, ['send-promise1'], t.context.data);

  await c.run();
  t.deepEqual(c.dump().log, [
    'b.send-promise1.finish',
    'left.takePromise',
    'left.takePromise.then',
    'local.foo 1',
    'b.resolved 4',
  ]);
});

test('send-harden-promise-1', async t => {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-promises-2'),
  );
  const c = await buildVatController(
    config,
    ['harden-promise-1'],
    t.context.data,
  );

  await c.run();
  t.deepEqual(c.dump().log, [
    'p2 frozen true',
    'p3 frozen true',
    // TODO: p4 = x!foo(), and we'd like it to be frozen, but the Handled
    // Promise API does not currently provide a place for us to freeze it.
    // See #95 for details.
    // 'p4 frozen true',
    // 'o1 frozen true',
    'o1 frozen true',
    'o1 frozen true',
    'b.harden-promise-1.finish',
  ]);
});

test('circular promise resolution data', async t => {
  const config = await loadBasedir(path.resolve(__dirname, 'basedir-circular'));
  const c = await buildVatController(config, [], t.context.data);

  await c.run();
  const expectedPromises = [
    {
      id: 'kp40',
      state: 'fulfilled',
      refCount: 1,
      data: {
        body: '{"@qclass":"undefined"}',
        slots: [],
      },
    },
    {
      id: 'kp45',
      state: 'fulfilled',
      refCount: 1,
      data: {
        body: '[{"@qclass":"slot","index":0}]',
        slots: ['kp46'],
      },
    },
    {
      id: 'kp46',
      state: 'fulfilled',
      refCount: 1,
      data: {
        body: '[{"@qclass":"slot","index":0}]',
        slots: ['kp45'],
      },
    },
  ];
  t.deepEqual(c.dump().promises, expectedPromises);
});
