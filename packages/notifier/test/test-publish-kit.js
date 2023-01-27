/* eslint-disable @typescript-eslint/prefer-ts-expect-error -- https://github.com/Agoric/agoric-sdk/issues/4620 */
/* eslint-disable no-void */

import '@agoric/swingset-vat/tools/prepare-test-env.js';
import test from 'ava';
import { E } from '@endo/far';
import {
  buildKernelBundles,
  initializeSwingset,
  makeSwingsetController,
} from '@agoric/swingset-vat';
import { initSwingStore } from '@agoric/swing-store';
import { kunser } from '@agoric/swingset-vat/src/lib/kmarshal.js';
import { makeScalarBigMapStore } from '@agoric/vat-data/src/vat-data-bindings.js';
import {
  makePublishKit,
  subscribeEach,
  subscribeLatest,
  prepareDurablePublishKit,
} from '../src/index.js';
import '../src/types-ambient.js';
import { invertPromiseSettlement } from './iterable-testing-tools.js';

/** @typedef {import('../src/index.js').makePublishKit} makePublishKit */

const { ownKeys } = Reflect;
const { quote: q } = assert;

const bfile = name => new URL(name, import.meta.url).pathname;

const makeBaggage = () => makeScalarBigMapStore('baggage', { durable: true });

const makers = {
  publishKit: makePublishKit,
  durablePublishKit: prepareDurablePublishKit(
    makeBaggage(),
    'DurablePublishKit',
  ),
};

const assertTransmission = async (t, publishKit, value, method = 'publish') => {
  const { publisher, subscriber } = publishKit;
  publisher[method](value);
  if (method === 'fail') {
    const reason = await invertPromiseSettlement(subscriber.subscribeAfter());
    t.is(reason, value, `value is transmitted through ${method}`);
  } else {
    const cell = await subscriber.subscribeAfter();
    t.is(cell.head.value, value, `value is transmitted through ${method}`);
  }
};

const assertCells = (t, label, cells, publishCount, result, options = {}) => {
  const { strict = true } = options;
  const firstCell = cells[0];
  t.deepEqual(
    Reflect.ownKeys(firstCell).sort(),
    ['head', 'publishCount', 'tail'],
    `${label} cell property keys`,
  );
  t.deepEqual(firstCell.head, result, `${label} cell result`);
  t.is(firstCell.head.value, result.value, `${label} cell value`);
  // `publishCount` values *should* be considered opaque,
  // but de facto they are a gap-free sequence of bigints
  // that starts at 1.
  // t.truthy(firstCell.publishCount, `${label} cell publishCount`);
  t.is(firstCell.publishCount, publishCount, `${label} cell publishCount`);

  if (strict) {
    t.deepEqual(
      new Set(cells),
      new Set([firstCell]),
      `all ${label} cells must referentially match`,
    );
  } else {
    const { tail: _tail, ...props } = cells[0];
    cells.slice(1).forEach((cell, i) => {
      t.like(cell, props, `${label} cell ${i + 1} must match cell 0`);
    });
  }
};

// eslint-disable-next-line no-shadow
const verifyPublishKit = test.macro(async (t, makePublishKit) => {
  const publishKit = /** @type {makePublishKit} */ (makePublishKit)();
  t.deepEqual(ownKeys(publishKit).sort(), ['publisher', 'subscriber']);
  const { publisher, subscriber } = publishKit;

  const cells = new Map();
  const getLatestPromises = () => {
    const promises = [subscriber.subscribeAfter()];
    promises.push(subscriber.subscribeAfter(undefined));
    const publishCounts = [...cells.keys()];
    for (const publishCount of publishCounts) {
      promises.push(subscriber.subscribeAfter(publishCount));
    }
    if (publishCounts.length) {
      promises.push(cells.get(publishCounts.pop()).tail);
    }
    return promises;
  };

  const firstCellsP = getLatestPromises();
  const firstVal = Symbol.for('first');
  publisher.publish(firstVal);
  firstCellsP.push(...getLatestPromises());
  const firstCells = await Promise.all(firstCellsP);
  firstCells.push(...(await Promise.all(getLatestPromises())));
  assertCells(t, 'first', firstCells, 1n, { value: firstVal, done: false });
  const { publishCount: firstPublishCount } = firstCells[0];
  cells.set(firstPublishCount, firstCells[0]);

  const secondCellsP = [subscriber.subscribeAfter(firstPublishCount)];
  const secondVal = { previous: firstVal };
  publisher.publish(secondVal);
  const thirdVal = Symbol.for('third');
  publisher.publish(thirdVal);
  const thirdCellsP = getLatestPromises().slice(0, -1);
  secondCellsP.push(firstCells[0].tail);
  const secondCells = await Promise.all(secondCellsP);
  secondCells.push(await firstCells[0].tail);
  assertCells(t, 'second', secondCells, 2n, { value: secondVal, done: false });
  const { publishCount: secondPublishCount } = secondCells[0];
  t.false(cells.has(secondPublishCount), 'second publishCount must be new');
  cells.set(secondPublishCount, secondCells[0]);
  thirdCellsP.push(...getLatestPromises());
  const thirdCells = await Promise.all(thirdCellsP);
  thirdCells.push(...(await Promise.all(getLatestPromises())));
  assertCells(t, 'third', thirdCells, 3n, { value: thirdVal, done: false });
  const { publishCount: thirdPublishCount } = thirdCells[0];
  t.false(cells.has(thirdPublishCount), 'third publishCount must be new');
  cells.set(thirdPublishCount, thirdCells[0]);

  t.throws(
    // @ts-ignore deliberate testing of invalid invocation
    () => subscriber.subscribeAfter(Number(secondPublishCount)),
    {
      message: /bigint/,
    },
  );

  const fourthVal = { position: 'fourth', deepPayload: [Symbol.match] };
  publisher.publish(fourthVal);
  const fifthVal = { position: 'fifth' };
  publisher.publish(fifthVal);
  const leapfrogCellsP = getLatestPromises().slice(0, -1);
  const leapfrogCells = await Promise.all(leapfrogCellsP);
  leapfrogCells.push(...(await Promise.all(getLatestPromises().slice(0, -1))));
  assertCells(t, 'leapfrog', leapfrogCells, 5n, {
    value: fifthVal,
    done: false,
  });
  const { publishCount: leapfrogPublishCount } = leapfrogCells[0];
  t.false(cells.has(leapfrogPublishCount), 'leapfrog publishCount must be new');
  cells.set(leapfrogPublishCount, leapfrogCells[0]);

  const finalVal = 'FIN';
  publisher.finish(finalVal);
  const finalCellsP = getLatestPromises();
  const finalCells = await Promise.all(finalCellsP);
  finalCells.push(...(await Promise.all(getLatestPromises())));
  assertCells(t, 'final', finalCells, 6n, { value: finalVal, done: true });
  const { publishCount: finalPublishCount } = finalCells[0];
  t.false(cells.has(finalPublishCount), 'final publishCount must be new');

  for (const methodName of ['publish', 'fail', 'finish']) {
    t.throws(
      () => publisher[methodName](finalVal),
      { message: 'Cannot update state after termination.' },
      `${methodName} fails after the final value`,
    );
  }
});

// eslint-disable-next-line no-shadow
const verifySubscribeAfter = test.macro(async (t, makePublishKit) => {
  const { publisher, subscriber } = /** @type {makePublishKit} */ (
    makePublishKit
  )();
  for (const badCount of [1n, 0, '', false, Symbol('symbol'), {}]) {
    t.throws(
      // @ts-ignore deliberate invalid arguments for testing
      () => subscriber.subscribeAfter(badCount),
      undefined,
      `subscribeAfter must reject invalid publish count: ${typeof badCount} ${q(
        badCount,
      )}`,
    );
  }
  const subFirstP = subscriber.subscribeAfter(-999n);
  publisher.publish('published');
  const subFirst = await subFirstP;
  t.deepEqual(subFirst.head, { value: 'published', done: false });
});

for (const [type, maker] of Object.entries(makers)) {
  test(type, verifyPublishKit, maker);
  test(`${type} subscribeAfter`, verifySubscribeAfter, maker);
}

test('publish kit allows non-durable values', async t => {
  const publishKit = makePublishKit();
  const nonPassable = { [Symbol('key')]: Symbol('value'), method() {} };
  await assertTransmission(t, publishKit, nonPassable);
  await assertTransmission(t, publishKit, nonPassable, 'finish');
  await assertTransmission(t, makePublishKit(), nonPassable, 'fail');
});
test('durable publish kit rejects non-durable values', async t => {
  const makeDurablePublishKit = prepareDurablePublishKit(
    makeBaggage(),
    'DurablePublishKit',
  );
  const publishKit = makeDurablePublishKit();
  const { publisher } = publishKit;
  const nonPassable = { [Symbol('key')]: Symbol('value') };
  t.throws(() => publisher.publish(nonPassable));
  t.throws(() => publisher.finish(nonPassable));
  t.throws(() => publisher.fail(nonPassable));
  await assertTransmission(t, publishKit, Symbol.for('value'));
});

test('durable publish kit upgrade trauma (full-vat integration)', async t => {
  const config = {
    includeDevDependencies: true, // for vat-data
    defaultManagerType:
      /** @type {import('@agoric/swingset-vat/src/types-external.js').ManagerType} */ (
        'xs-worker'
      ), // 'local',
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        sourceSpec: bfile('../../SwingSet/test/bootstrap-relay.js'),
      },
    },
    bundles: {
      pubsub: { sourceSpec: bfile('vat-integration/vat-pubsub.js') },
    },
  };
  const { kernelStorage } = initSwingStore();
  const { kernel: kernelBundle, ...kernelBundles } = await buildKernelBundles();
  const initOpts =
    /** @type {{kernelBundles: Record<string, import('@agoric/swingset-vat/src/types-external.js').Bundle>}} */ ({
      kernelBundles,
    });
  const runtimeOpts = { kernelBundle };
  await initializeSwingset(config, [], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (method, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
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

  // Create the vat and get its subscriber.
  await run('createVat', [
    {
      name: 'pubsub',
      bundleCapName: 'pubsub',
      vatParameters: { version: 'v1' },
    },
  ]);
  t.is(
    await run('messageVat', [{ name: 'pubsub', methodName: 'getVersion' }]),
    'v1',
  );
  const sub1 = await run('messageVat', [
    { name: 'pubsub', methodName: 'getSubscriber' },
  ]);

  // Verify receipt of a published value.
  const value1 = Symbol.for('value1');
  await run('messageVat', [
    { name: 'pubsub', methodName: 'publish', args: [value1] },
  ]);
  const v1FirstCell = await run('messageVatObject', [
    { presence: sub1, methodName: 'subscribeAfter' },
  ]);
  assertCells(t, 'v1 first', [v1FirstCell], 1n, { value: value1, done: false });

  // Verify receipt of a second published value via both tail and subscribeAfter.
  const value2 = Symbol.for('value2');
  await run('messageVat', [
    { name: 'pubsub', methodName: 'publish', args: [value2] },
  ]);
  await run('messageVatObject', [
    { presence: sub1, methodName: 'subscribeAfter' },
  ]);
  const v1SecondCells = [
    await run('awaitVatObject', [{ presence: v1FirstCell.tail }]),
    await run('messageVatObject', [
      { presence: sub1, methodName: 'subscribeAfter' },
    ]),
    await run('messageVatObject', [
      { presence: sub1, methodName: 'subscribeAfter' },
    ]),
  ];
  assertCells(
    t,
    'v1 second',
    v1SecondCells,
    2n,
    { value: value2, done: false },
    { strict: false },
  );

  // Upgrade the vat, breaking promises from v1.
  await run('upgradeVat', [
    {
      name: 'pubsub',
      bundleCapName: 'pubsub',
      vatParameters: { version: 'v2' },
    },
  ]);
  t.is(
    await run('messageVat', [{ name: 'pubsub', methodName: 'getVersion' }]),
    'v2',
  );
  const sub2 = await run('messageVat', [
    { name: 'pubsub', methodName: 'getSubscriber' },
  ]);
  await run('awaitVatObject', [{ presence: v1SecondCells[0].tail }]).then(
    (...args) =>
      t.deepEqual(args, undefined, 'tail promise of old vat must be rejected'),
    failure =>
      t.deepEqual(failure, {
        incarnationNumber: 1,
        name: 'vatUpgraded',
        upgradeMessage: 'vat upgraded',
      }),
  );

  // Verify receipt of the last published value from v1.
  const v2FirstCell = await run('messageVatObject', [
    { presence: sub2, methodName: 'subscribeAfter' },
  ]);
  assertCells(t, 'v2 first', [v2FirstCell], 2n, { value: value2, done: false });

  // Verify receipt of a published value from v2.
  const value3 = Symbol.for('value3');
  await run('messageVat', [
    { name: 'pubsub', methodName: 'publish', args: [value3] },
  ]);
  const v2SecondCells = [
    await run('awaitVatObject', [{ presence: v2FirstCell.tail }]),
    await run('messageVatObject', [
      { presence: sub2, methodName: 'subscribeAfter' },
    ]),
    await run('messageVatObject', [
      { presence: sub2, methodName: 'subscribeAfter' },
    ]),
  ];
  assertCells(
    t,
    'v2 second',
    v2SecondCells,
    3n,
    { value: value3, done: false },
    { strict: false },
  );
});

// TODO: Find a way to test virtual object rehydration
// without the overhead of vats.
// https://github.com/Agoric/agoric-sdk/pull/6502#discussion_r1008492055
test.skip('durable publish kit upgrade trauma', async t => {
  const baggage = makeBaggage();
  const makeDurablePublishKit = prepareDurablePublishKit(
    baggage,
    'DurablePublishKit',
  );
  const kit1 = makeDurablePublishKit();
  const { publisher: pub1, subscriber: sub1 } = kit1;
  const value = Symbol.for('value');
  await assertTransmission(t, kit1, value);
  // THEN A MIRACLE OCCURS...
  // @ts-expect-error
  // eslint-disable-next-line no-undef
  const kit2 = recoverPublishKit(baggage);
  const { publisher: pub2, subscriber: sub2 } = kit2;
  t.not(pub2, pub1);
  t.not(sub2, sub1);
  const recoveredCell = await sub2.subscribeAfter();
  t.is(recoveredCell.head.value, value, 'published value must be recovered');
  const finalValue = Symbol.for('final');
  await assertTransmission(t, kit2, finalValue, 'finish');
  // @ts-expect-error
  // eslint-disable-next-line no-undef
  const kit3 = recoverPublishKit(baggage);
  const { publisher: pub3, subscriber: sub3 } = kit3;
  t.false([pub1, pub2].includes(pub3));
  t.false([sub1, sub2].includes(sub3));
  const recoveredFinalCell = await sub3.subscribeAfter();
  t.deepEqual(
    recoveredFinalCell.head,
    { value: finalValue, done: true },
    'final value must be recovered',
  );
});

const verifyPublishKitTermination = test.macro(
  // eslint-disable-next-line no-shadow
  async (t, makePublishKit, config = {}) => {
    const { publisher, subscriber } = /** @type {makePublishKit} */ (
      makePublishKit
    )();

    const getLatestPromises = () => [
      subscriber.subscribeAfter(),
      subscriber.subscribeAfter(undefined),
    ];
    const { method = 'finish', getExtraFinalPromises = getLatestPromises } =
      /** @type {object} */ (config);

    const cellsP = [...(await getExtraFinalPromises(publisher, subscriber))];
    const value = Symbol.for('termination');
    publisher[method](value);
    const promiseMapper = method === 'fail' ? invertPromiseSettlement : p => p;
    const results = await Promise.all(
      [...cellsP, ...getLatestPromises()].map(promiseMapper),
    );
    results.push(
      ...(await Promise.all(getLatestPromises().map(promiseMapper))),
    );
    if (method === 'fail') {
      t.is(results[0], value, 'terminal value must be correct');
      t.deepEqual(
        new Set(results),
        new Set(results.slice(0, 1)),
        'all terminal values must referentially match',
      );
    } else {
      assertCells(t, 'final', results, 1n, { value, done: true });
      await t.throwsAsync(
        async () => results[0].tail,
        { message: 'Cannot read past end of iteration.' },
        'tail promise of final cell must be rejected',
      );
      await t.throwsAsync(
        async () => subscriber.subscribeAfter(results[0].publishCount),
        { message: 'Cannot read past end of iteration.' },
        'subscribeAfter(finalPublishCount) must be rejected',
      );
    }

    for (const methodName of ['publish', 'fail', 'finish']) {
      t.throws(
        () => publisher[methodName](value),
        { message: 'Cannot update state after termination.' },
        `${methodName} must not be allowed after finalization`,
      );
    }
  },
);

for (const [type, maker] of Object.entries(makers)) {
  test(`${type} - immediate finish`, verifyPublishKitTermination, maker);
  test(`${type} - immediate fail`, verifyPublishKitTermination, maker, {
    method: 'fail',
  });
  test(`${type} - fail`, verifyPublishKitTermination, maker, {
    method: 'fail',
    getExtraFinalPromises: async (publisher, subscriber) => {
      publisher.publish(undefined);
      const cell = await subscriber.subscribeAfter();
      return [cell.tail, subscriber.subscribeAfter(cell.publishCount)];
    },
  });
}

// eslint-disable-next-line no-shadow
const verifySubscribeLatest = test.macro(async (t, makePublishKit) => {
  const { publisher, subscriber } = /** @type {makePublishKit} */ (
    makePublishKit
  )();
  const latestIterator = subscribeLatest(subscriber);

  // Publish in geometric batches: [1], [2], [3, 4], [5, 6, 7, 8], ...
  let nextValue = 1;
  publisher.publish(nextValue);
  nextValue += 1;
  const results = [];
  for await (const result of latestIterator) {
    results.push(result);
    for (let i = 0; i < result; i += 1) {
      publisher.publish(nextValue);
      nextValue += 1;
    }
    if (nextValue > 64) {
      publisher.finish('done');
    }
  }

  t.deepEqual(
    results,
    [1, 2, 4, 8, 16, 32],
    'only the last of values published between iteration steps should be observed',
  );
});

for (const [type, maker] of Object.entries(makers)) {
  test(`subscribeLatest(${type} subscriber)`, verifySubscribeLatest, maker);
}

// eslint-disable-next-line no-shadow
const verifySubscribeEach = test.macro(async (t, makePublishKit) => {
  const { publisher, subscriber } = /** @type {makePublishKit} */ (
    makePublishKit
  )();
  const latestIterator = subscribeEach(subscriber);

  // Publish in geometric batches: [1], [2], [3, 4], [5, 6, 7, 8], ...
  const expectedResults = [];
  let donePublishing = false;
  let nextValue = 1;
  expectedResults.push(nextValue);
  publisher.publish(nextValue);
  nextValue += 1;
  const results = [];
  for await (const result of latestIterator) {
    results.push(result);
    if (!donePublishing) {
      for (let i = 0; i < result; i += 1) {
        expectedResults.push(nextValue);
        publisher.publish(nextValue);
        nextValue += 1;
      }
      if (nextValue > 16) {
        donePublishing = true;
        publisher.finish('done');
      }
    }
  }

  t.deepEqual(
    results,
    expectedResults,
    'all values published between iteration steps should be observed',
  );
});

for (const [type, maker] of Object.entries(makers)) {
  test(`subscribeEach(${type} subscriber)`, verifySubscribeEach, maker);
}

// eslint-disable-next-line no-shadow
const verifySubscribeAfterSequencing = test.macro(async (t, makePublishKit) => {
  // Demonstrate sequencing by publishing to two destinations.
  const { publisher: pub1, subscriber: sub1 } = /** @type {makePublishKit} */ (
    makePublishKit
  )();
  const { publisher: pub2, subscriber: sub2 } = /** @type {makePublishKit} */ (
    makePublishKit
  )();
  const sub2LIFO = [];

  const sub1FirstAll = [];
  E.when(sub1.subscribeAfter(), cell => void sub1FirstAll.push(cell), t.fail);
  E.when(sub1.subscribeAfter(), cell => void sub1FirstAll.push(cell), t.fail);

  pub2.publish(undefined);
  sub2LIFO.unshift(await sub2.subscribeAfter());
  t.deepEqual(sub1FirstAll, [], 'there must be no results before publication');

  const pub1First = Symbol.for('pub1First');
  pub1.publish(pub1First);
  sub1FirstAll.push(await sub1.subscribeAfter());
  t.is(
    sub1FirstAll.length,
    3,
    'each initial subscribeAfter must provide a result',
  );
  const firstResult = { value: pub1First, done: false };
  assertCells(t, 'initial', sub1FirstAll, 1n, firstResult);

  const sub1FirstLateAll = [];
  const sub1SecondAll = [];
  E.when(
    sub1.subscribeAfter(),
    cell => void sub1FirstLateAll.push(cell),
    t.fail,
  );
  E.when(
    sub1.subscribeAfter(0n),
    cell => void sub1FirstLateAll.push(cell),
    t.fail,
  );
  E.when(
    sub1.subscribeAfter(sub1FirstAll[0].publishCount),
    cell => void sub1SecondAll.push(cell),
    t.fail,
  );

  pub2.publish(undefined);
  sub2LIFO.unshift(await sub2.subscribeAfter(sub2LIFO[0].publishCount));
  t.is(sub1FirstLateAll.length, 2, 'current results must resolve promptly');
  assertCells(t, 'initial (late)', sub1FirstLateAll, 1n, firstResult);
  t.deepEqual(
    sub1SecondAll,
    [],
    'there must be no future results before another publication',
  );

  const pub1Second = Symbol.for('pub1Second');
  pub1.publish(pub1Second);
  pub2.publish(undefined);
  sub2LIFO.unshift(await sub2.subscribeAfter(sub2LIFO[0].publishCount));
  sub1SecondAll.push(await sub1.subscribeAfter());
  t.is(sub1FirstLateAll.length, 2, 'there must be no further "first" results');
  t.is(sub1SecondAll.length, 2);
  const secondResult = { value: pub1Second, done: false };
  assertCells(t, 'second', sub1SecondAll, 2n, secondResult);

  const sub1SecondLateAll = [];
  const sub1FinalAll = [];
  for (const p of [sub1.subscribeAfter(), sub1.subscribeAfter(0n)]) {
    E.when(p, cell => void sub1SecondLateAll.push(cell), t.fail);
  }
  E.when(
    sub1.subscribeAfter(sub1SecondAll[0].publishCount),
    result => void sub1FinalAll.push(result),
    t.fail,
  );

  pub2.publish(undefined);
  sub2LIFO.unshift(await sub2.subscribeAfter(sub2LIFO[0].publishCount));
  t.is(
    sub1SecondLateAll.length,
    2,
    'current results must resolve promptly (again)',
  );
  assertCells(t, 'second (late)', sub1SecondLateAll, 2n, secondResult);
  t.deepEqual(sub1FinalAll, [], 'there must be no final results before finish');

  const pub1Final = Symbol.for('pub1Final');
  pub1.finish(pub1Final);
  pub2.publish(undefined);
  sub2LIFO.unshift(await sub2.subscribeAfter(sub2LIFO[0].publishCount));
  sub1FinalAll.push(await sub1.subscribeAfter());
  t.is(
    sub1SecondLateAll.length,
    2,
    'there must be no further "second" results',
  );
  t.is(sub1FinalAll.length, 2);
  assertCells(t, 'final', sub1FinalAll, 3n, { value: pub1Final, done: true });
});

for (const [type, maker] of Object.entries(makers)) {
  test(
    `${type} subscribeAfter resolution sequencing`,
    verifySubscribeAfterSequencing,
    maker,
  );
}
