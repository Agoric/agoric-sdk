// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import { initSwingStore } from '@agoric/swing-store';
import { kunser } from '@agoric/kmarshal';
import {
  buildKernelBundles,
  initializeSwingset,
  makeSwingsetController,
} from '@agoric/swingset-vat';

/**
 * @import {Bundle, SwingSetConfig} from '@agoric/swingset-vat/src/types-external.js';
 */

const bfile = name => new URL(name, import.meta.url).pathname;

const assertCells = (t, label, cells, publishCount, expected, options = {}) => {
  const { strict = true, iterationResults = {} } = options;
  const firstCell = cells[0];
  t.deepEqual(
    Reflect.ownKeys(firstCell).sort(),
    ['head', 'publishCount', 'tail'],
    `${label} cell property keys`,
  );
  t.deepEqual(firstCell.head, expected, `${label} cell result`);
  t.is(firstCell.head.value, expected.value, `${label} cell value`);
  t.is(firstCell.publishCount, publishCount, `${label} cell publishCount`);

  if (strict) {
    const { head, ...otherProps } = firstCell;
    for (const [headKey, headValue] of Object.entries(head)) {
      t.deepEqual(
        new Set(cells.map(cell => cell.head[headKey])),
        new Set([headValue]),
        `the head ${headKey} of each ${label} cell must referentially match`,
      );
    }
    for (const [key, value] of Object.entries(otherProps)) {
      t.deepEqual(
        new Set(cells.map(cell => cell[key])),
        new Set([value]),
        `the ${key} of each ${label} cell must referentially match`,
      );
    }
  } else {
    const { tail: _tail, ...props } = firstCell;
    // We need an element and an index here, which for..of does not give us in one go
    // eslint-disable-next-line github/array-foreach
    cells.slice(1).forEach((cell, i) => {
      t.like(cell, props, `${label} cell ${i + 1} must match cell 0`);
    });
  }

  for (const [resultLabel, result] of Object.entries(iterationResults)) {
    t.deepEqual(result, expected, `${label} ${resultLabel} result`);
  }
};

test('durable publish kit upgrade trauma (full-vat integration)', async t => {
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
      pubsub: { sourceSpec: bfile('notifier/vat-pubsub.js') },
    },
  };
  const { kernelStorage } = initSwingStore();
  const { kernel: kernelBundle, ...kernelBundles } = await buildKernelBundles();
  const initOpts = /** @type {{kernelBundles: Record<string, Bundle>}} */ ({
    kernelBundles,
  });
  const runtimeOpts = { kernelBundle };
  await initializeSwingset(config, [], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, {}, runtimeOpts);
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
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot(vatName, method, args);
    return awaitRun(kpid);
  };
  const messageToObject = async (presence, method, ...args) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatObject(presence, method, args);
    return awaitRun(kpid);
  };

  // Create the vat and get its subscriber.
  const pubsubRoot = await messageToVat('bootstrap', 'createVat', {
    name: 'pubsub',
    bundleCapName: 'pubsub',
    vatParameters: { version: 'v1' },
  });
  const pubsub2Root = await messageToVat('bootstrap', 'createVat', {
    name: 'pubsub2',
    bundleCapName: 'pubsub',
  });
  t.is(await messageToObject(pubsubRoot, 'getVersion'), 'v1');
  const sub1 = await messageToObject(pubsubRoot, 'getSubscriber');
  const eachIterable = await messageToObject(
    pubsub2Root,
    'subscribeEach',
    sub1,
  );
  const eachIterator1 = await messageToObject(
    eachIterable,
    Symbol.asyncIterator,
  );
  const latestIterable = await messageToObject(
    pubsub2Root,
    'subscribeLatest',
    sub1,
  );
  const latestIterator1 = await messageToObject(
    latestIterable,
    Symbol.asyncIterator,
  );

  /**
   * Advances the publisher.
   *
   * @param {unknown} value
   * @returns {Promise<void>}
   */
  const publish = async value => {
    await messageToObject(pubsubRoot, 'publish', value);
  };

  // Verify receipt of a published value via subscribeAfter
  // and async iterators.
  const value1 = Symbol.for('value1');
  await publish(value1);
  const expectedV1FirstResult = { value: value1, done: false };
  const v1FirstCell = await messageToObject(sub1, 'subscribeAfter');
  assertCells(t, 'v1 first', [v1FirstCell], 1n, expectedV1FirstResult);
  const eachIteratorFirstResult = await messageToObject(eachIterator1, 'next');
  t.deepEqual(
    eachIteratorFirstResult,
    expectedV1FirstResult,
    'v1 eachIterator first result',
  );
  // Don't ask the latest iterator for its first result so we can observe
  // that it skips intermediate results.
  // const latestIteratorFirstResult = await messageToObject(latestIterator1, 'next');
  // t.deepEqual(
  //   latestIteratorFirstResult,
  //   expectedV1FirstResult,
  //   'v1 latestIterator first result',
  // );

  // Verify receipt of a second published value via tail and subscribeAfter
  // and async iterators.
  const value2 = Symbol.for('value2');
  await publish(value2);
  const expectedV1SecondResult = { value: value2, done: false };
  await messageToObject(sub1, 'subscribeAfter');
  const v1SecondCells = [
    await messageToVat('bootstrap', 'awaitVatObject', v1FirstCell.tail),
    await messageToObject(sub1, 'subscribeAfter'),
    await messageToObject(sub1, 'subscribeAfter'),
  ];
  const v1SecondIterationResults = {
    eachIterator: await messageToObject(eachIterator1, 'next'),
    latestIterator: await messageToObject(latestIterator1, 'next'),
  };
  assertCells(t, 'v1 second', v1SecondCells, 2n, expectedV1SecondResult, {
    strict: false,
    iterationResults: v1SecondIterationResults,
  });

  // Upgrade the vat, breaking promises from v1.
  await messageToVat('bootstrap', 'upgradeVat', {
    name: 'pubsub',
    bundleCapName: 'pubsub',
    vatParameters: { version: 'v2' },
  });
  t.is(await messageToObject(pubsubRoot, 'getVersion'), 'v2');
  const sub2 = await messageToObject(pubsubRoot, 'getSubscriber');
  const eachIterator2 = await messageToObject(
    eachIterable,
    Symbol.asyncIterator,
  );

  const assertDisconnection = (p, label) => {
    const expected = {
      incarnationNumber: 0,
      name: 'vatUpgraded',
      upgradeMessage: 'vat upgraded',
    };
    return p.then(
      // @ts-expect-error Argument of type 'undefined' is not assignable to parameter of type 'any[]'.
      (...args) => t.is(args, undefined, `${label} must be rejected`),
      failure =>
        t.deepEqual(failure, expected, `${label} must indicate disconnection`),
    );
  };
  await assertDisconnection(
    messageToVat('bootstrap', 'awaitVatObject', v1SecondCells[0].tail),
    'tail promise of old vat',
  );

  // Verify receipt of the last published value from v1.
  const v2FirstCell = await messageToObject(sub2, 'subscribeAfter');
  const v2FirstIterationResults = {
    eachIterator: await messageToObject(eachIterator2, 'next'),
  };
  assertCells(t, 'v2 first', [v2FirstCell], 2n, expectedV1SecondResult, {
    iterationResults: v2FirstIterationResults,
  });

  // Verify receipt of a published value from v2.
  const value3 = Symbol.for('value3');
  await publish(value3);
  const expectedV2SecondResult = { value: value3, done: false };
  const v2SecondCells = [
    await messageToVat('bootstrap', 'awaitVatObject', v2FirstCell.tail),
    await messageToObject(sub2, 'subscribeAfter'),
    await messageToObject(sub2, 'subscribeAfter'),
  ];
  const v2SecondIterationResults = {
    eachIterator1: await messageToObject(eachIterator1, 'next'),
    eachIterator2: await messageToObject(eachIterator2, 'next'),
    latestIterator: await messageToObject(latestIterator1, 'next'),
  };
  assertCells(t, 'v2 second', v2SecondCells, 3n, expectedV2SecondResult, {
    strict: false,
    iterationResults: v2SecondIterationResults,
  });
});
