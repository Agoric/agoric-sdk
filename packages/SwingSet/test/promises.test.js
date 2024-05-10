// @ts-nocheck
import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { kser, kslot, kunser } from '@agoric/kmarshal';
import {
  buildVatController,
  loadBasedir,
  buildKernelBundles,
} from '../src/index.js';

const bfile = name => new URL(name, import.meta.url).pathname;

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

test('flush', async t => {
  const config = await loadBasedir(
    new URL('basedir-promises', import.meta.url).pathname,
  );
  const c = await buildVatController(config, ['flush'], t.context.data);
  t.teardown(c.shutdown);
  // all promises should settle before c.run() fires
  await c.run();
  t.deepEqual(c.dump().log, ['then1', 'then2']);
});

test('E() resolve', async t => {
  const config = await loadBasedir(
    new URL('basedir-promises', import.meta.url).pathname,
  );
  const c = await buildVatController(config, ['e-then'], t.context.data);
  t.teardown(c.shutdown);

  await c.run();
  t.deepEqual(c.dump().log, [
    'left.callRight 1',
    'right 2',
    'b.resolved 3',
    'left.then 4',
  ]);
});

test('E(E(x).foo()).bar()', async t => {
  const config = await loadBasedir(
    new URL('basedir-promises', import.meta.url).pathname,
  );
  const c = await buildVatController(config, ['chain1'], t.context.data);
  t.teardown(c.shutdown);

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
  const config = await loadBasedir(
    new URL('basedir-promises', import.meta.url).pathname,
  );
  const c = await buildVatController(config, ['chain2'], t.context.data);
  t.teardown(c.shutdown);

  await c.run();
  t.deepEqual(c.dump().log, [
    'b.call2',
    'left.call2 1',
    'left.call3 2',
    'b.resolved 3',
  ]);
});

test('E(local).foo()', async t => {
  const config = await loadBasedir(
    new URL('basedir-promises', import.meta.url).pathname,
  );
  const c = await buildVatController(config, ['local1'], t.context.data);
  t.teardown(c.shutdown);

  await c.run();
  t.deepEqual(c.dump().log, ['b.local1.finish', 'local.foo 1', 'b.resolved 2']);
});

test('resolve-to-local', async t => {
  const config = await loadBasedir(
    new URL('basedir-promises', import.meta.url).pathname,
  );
  const c = await buildVatController(config, ['local2'], t.context.data);
  t.teardown(c.shutdown);

  await c.run();
  t.deepEqual(c.dump().log, [
    'b.local2.finish',
    'left.returnArg',
    'local.foo 2',
    'b.resolved 3',
  ]);
});

test('send-promise-resolve-to-local', async t => {
  const config = await loadBasedir(
    new URL('basedir-promises', import.meta.url).pathname,
  );
  const c = await buildVatController(config, ['send-promise1'], t.context.data);
  t.teardown(c.shutdown);

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
    new URL('basedir-promises-2', import.meta.url).pathname,
  );
  const c = await buildVatController(
    config,
    ['harden-promise-1'],
    t.context.data,
  );
  t.teardown(c.shutdown);

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
  const config = await loadBasedir(
    new URL('basedir-circular', import.meta.url).pathname,
  );
  const c = await buildVatController(config, [], t.context.data);
  t.teardown(c.shutdown);

  await c.run();
  const expectedPromises = [
    {
      id: 'kp40',
      state: 'fulfilled',
      refCount: 1,
      data: kser(undefined),
    },
    {
      id: 'kp42',
      state: 'fulfilled',
      refCount: 1,
      data: kser([kslot('kp44')]),
    },
    {
      id: 'kp44',
      state: 'fulfilled',
      refCount: 1,
      data: kser([kslot('kp42')]),
    },
  ];
  t.deepEqual(c.dump().promises, expectedPromises);
});

test('refcount while queued', async t => {
  const config = await loadBasedir(
    new URL('basedir-promises-3', import.meta.url).pathname,
  );
  const c = await buildVatController(config, [], t.context.data);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  // bootstrap() sets up an unresolved promise (p2, the result promise of
  // right~.one()) with vat-right as the decider, and enqueues a message
  // (p2~.four(pk)) which contains a second unresolved promise 'pk1'
  await c.run();

  // then we tell that vat to resolve pk1 to a value (4)
  c.queueToVatRoot('bootstrap', 'two', [], 'ignore');
  await c.run();

  // Now we have a resolved promise 'pk1' whose only reference is the
  // arguments of a message queued to a promise. We're exercising the promise
  // retirement reference counting: if it allows the 'pk1' refcount to reach
  // zero, the promise will be collected, and an error will occur when 'p2'
  // is resolved.

  // tell vat-right to resolve p2, which should transfer the 'four' message
  // from the p2 promise queue to the run-queue for vat-right. That message
  // will be delivered, with a new promise that is promptly resolved to '3'.
  const kpid4 = c.queueToVatRoot('right', 'three', [], 'ignore');
  await c.run();
  t.deepEqual(c.kpResolution(kpid4), kser([true, 3]));
});

test('local promises are rejected by vat upgrade', async t => {
  // TODO: Generalize packages/SwingSet/test/upgrade/upgrade.test.js
  /** @type {SwingSetConfig} */
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType: 'xs-worker',
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        sourceSpec: bfile('../tools/bootstrap-relay.js'),
      },
    },
    bundles: {
      watcher: { sourceSpec: bfile('./vat-durable-promise-watcher.js') },
    },
  };
  const c = await buildVatController(config);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const awaitRun = async kpid => {
    await c.run();
    const status = c.kpStatus(kpid);
    if (status === 'fulfilled') {
      const result = c.kpResolution(kpid);
      return kunser(result);
    }
    assert(status === 'rejected');
    const err = c.kpResolution(kpid);
    throw kunser(err);
  };

  const messageToVat = async (vatName, method, ...args) => {
    const kpid = c.queueToVatRoot(vatName, method, args);
    return awaitRun(kpid);
  };
  const messageToObject = async (presence, method, ...args) => {
    const kpid = c.queueToVatObject(presence, method, args);
    return awaitRun(kpid);
  };

  const S = Symbol.for('passable');
  const watcher = await messageToVat('bootstrap', 'createVat', {
    name: 'watcher',
    bundleCapName: 'watcher',
  });
  await messageToObject(watcher, 'watchLocalPromise', 'orphaned');
  await messageToObject(watcher, 'watchLocalPromise', 'fulfilled', S);
  await messageToObject(watcher, 'watchLocalPromise', 'rejected', undefined, S);
  const v1Settlements = await messageToObject(watcher, 'getSettlements');
  t.deepEqual(v1Settlements, {
    fulfilled: { status: 'fulfilled', value: S },
    rejected: { status: 'rejected', reason: S },
  });
  await messageToVat('bootstrap', 'upgradeVat', {
    name: 'watcher',
    bundleCapName: 'watcher',
  });
  const v2Settlements = await messageToObject(watcher, 'getSettlements');
  t.deepEqual(v2Settlements, {
    fulfilled: { status: 'fulfilled', value: S },
    rejected: { status: 'rejected', reason: S },
    orphaned: {
      status: 'rejected',
      reason: {
        name: 'vatUpgraded',
        upgradeMessage: 'vat upgraded',
        incarnationNumber: 0,
      },
    },
  });
});
