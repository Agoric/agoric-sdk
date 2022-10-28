// @ts-check
/* eslint-disable @typescript-eslint/prefer-ts-expect-error -- https://github.com/Agoric/agoric-sdk/issues/4620 */

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeScalarMapStore as makeBaggage } from '@agoric/store';
import {
  makePublishKit,
  subscribeEach,
  subscribeLatest,
  vivifyDurablePublishKit,
} from '../src/index.js';
import '../src/types.js';
import { invertPromiseSettlement } from './iterable-testing-tools.js';

const { ownKeys } = Reflect;

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

const assertCells = (t, label, cells, publishCount, result) => {
  const firstCell = cells[0];
  const len = cells.length;
  for (let i = 0; i < len; i += 1) {
    const cell = cells[i];
    const cellLabel = `${label} cell ${i + 1} of ${len}`;
    t.deepEqual(
      Reflect.ownKeys(cell).sort(),
      ['head', 'publishCount', 'tail'],
      `${cellLabel} property keys`,
    );
    t.deepEqual(cell.head, result, `${label} cell result`);
    // `publishCount` values *should* be considered opaque,
    // but de facto they are a gap-free sequence of bigints
    // that starts at 1.
    // t.truthy(cell.publishCount, `${cellLabel} publishCount`);
    t.is(cell.publishCount, publishCount, `${cellLabel} publishCount`);

    t.deepEqual(cell, firstCell, `${cellLabel} must deeply equal cell 1`);
    t.is(
      cell.head.value,
      firstCell.head.value,
      `${cellLabel} value reference must match cell 1`,
    );
    t.is(
      cell.tail,
      firstCell.tail,
      `${cellLabel} tail reference must match cell 1`,
    );
  }
};

// TODO: Replace with test.macro once that works with prepare-test-env-ava.
// https://github.com/avajs/ava/blob/main/docs/01-writing-tests.md#reusing-test-logic-through-macros
// eslint-disable-next-line no-shadow
const verifyPublishKit = async (t, makePublishKit) => {
  const publishKit = makePublishKit();
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

  // @ts-ignore deliberate testing of invalid invocation
  t.throws(() => subscriber.subscribeAfter(Number(secondPublishCount)), {
    message: /bigint/,
  });

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
};

test('makePublishKit', verifyPublishKit, makePublishKit);
test(
  'durablePublishKit',
  verifyPublishKit,
  vivifyDurablePublishKit(makeBaggage(), 'DurablePublishKit'),
);

test('publishKit allows non-durable values', async t => {
  const publishKit = makePublishKit();
  const nonPassable = { [Symbol('key')]: Symbol('value') };
  await assertTransmission(t, publishKit, nonPassable);
  await assertTransmission(t, publishKit, nonPassable, 'finish');
  await assertTransmission(t, makePublishKit(), nonPassable, 'fail');
});
test('durablePublishKit rejects non-durable values', async t => {
  const makeDurablePublishKit = vivifyDurablePublishKit(
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

test('makePublishKit - immediate finish', async t => {
  const { publisher, subscriber } = makePublishKit();

  const pubFinal = Symbol('done');
  publisher.finish(pubFinal);
  const subFinalAll = await Promise.all([
    subscriber.subscribeAfter(),
    subscriber.subscribeAfter(0n),
  ]);
  const [subFinal] = subFinalAll;
  t.deepEqual(new Set(subFinalAll), new Set([subFinal]));
  t.deepEqual(
    Reflect.ownKeys(subFinal).sort(),
    ['head', 'publishCount', 'tail'],
    'iteration result keys',
  );
  t.deepEqual(
    subFinal.head,
    { value: pubFinal, done: true },
    'iteration result head',
  );
  t.is(
    await subscriber.subscribeAfter(),
    subFinal,
    'subscribeAfter should return current result (final)',
  );
  t.throws(
    () => publisher.publish('extra publish'),
    undefined,
    'publication should not be allowed after finalization',
  );
  t.throws(
    () => publisher.finish('final final'),
    undefined,
    'finalization should not be allowed after finalization',
  );
  t.throws(
    () => publisher.fail(new Error('reason')),
    undefined,
    'failure should not be allowed after finalization',
  );
  await t.throwsAsync(
    // @ts-ignore known to be promise version of PublicationList
    subFinal.tail,
    undefined,
    'tail promise of final result should be rejected',
  );
  await t.throwsAsync(
    // @ts-ignore known to be promise version of PublicationList
    subscriber.subscribeAfter(subFinal.publishCount),
    undefined,
    'subscribeAfter(finalPublishCount) should be rejected',
  );
});

test('makePublishKit - fail', async t => {
  const { publisher, subscriber } = makePublishKit();

  publisher.publish(undefined);
  const subFirst = await subscriber.subscribeAfter();

  const pubFailure = Symbol('fail');
  publisher.fail(pubFailure);
  const subFinalAll = await Promise.all(
    [subFirst.tail, subscriber.subscribeAfter(subFirst.publishCount)].map(
      invertPromiseSettlement,
    ),
  );
  const [subFinal] = subFinalAll;
  t.deepEqual(
    new Set(subFinalAll),
    new Set([subFinal]),
    'tail and subscribeAfter(latestPublishCount) should resolve identically (fail)',
  );
  t.is(subFinal, pubFailure);
  t.is(
    await invertPromiseSettlement(subscriber.subscribeAfter()),
    subFinal,
    'subscribeAfter should return current result (fail)',
  );
  t.throws(
    () => publisher.publish('extra publish'),
    undefined,
    'publication should not be allowed after finalization',
  );
  t.throws(
    () => publisher.finish('final final'),
    undefined,
    'finalization should not be allowed after finalization',
  );
  t.throws(
    () => publisher.fail(new Error('reason')),
    undefined,
    'failure should not be allowed after finalization',
  );
});

test('makePublishKit - immediate fail', async t => {
  const { publisher, subscriber } = makePublishKit();

  const pubFailure = Symbol('fail');
  publisher.fail(pubFailure);
  const subFinalAll = await Promise.all(
    [subscriber.subscribeAfter(), subscriber.subscribeAfter(0n)].map(
      invertPromiseSettlement,
    ),
  );
  const [subFinal] = subFinalAll;
  t.deepEqual(
    new Set(subFinalAll),
    new Set([subFinal]),
    'tail and subscribeAfter(0n) should be rejected identically',
  );
  t.is(subFinal, pubFailure);
  t.throws(
    () => publisher.publish('extra publish'),
    undefined,
    'publication should not be allowed after finalization',
  );
  t.throws(
    () => publisher.finish('final final'),
    undefined,
    'finalization should not be allowed after finalization',
  );
  t.throws(
    () => publisher.fail(new Error('reason')),
    undefined,
    'failure should not be allowed after finalization',
  );
});

test('subscribeLatest', async t => {
  const { publisher, subscriber } = makePublishKit();
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

test('subscribeEach', async t => {
  const { publisher, subscriber } = makePublishKit();
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

test('subscribeAfter bounds checking', async t => {
  const { publisher, subscriber } = makePublishKit();

  for (const badCount of [1n, 0, '', false]) {
    const repr =
      typeof badCount === 'string' ? JSON.stringify(badCount) : badCount;
    t.throws(
      // @ts-ignore deliberate invalid arguments for testing
      () => subscriber.subscribeAfter(badCount),
      undefined,
      `subscribeAfter should reject invalid publish count: ${typeof badCount} ${repr}`,
    );
  }
  const subFirstP = subscriber.subscribeAfter(-999n);
  publisher.publish(undefined);
  const subFirst = await subFirstP;
  t.deepEqual(subFirst.head, { value: undefined, done: false });
});

test('subscribeAfter resolution sequencing', async t => {
  // Demonstrate sequencing by publishing to two destinations.
  const { publisher: pub1, subscriber: sub1 } = makePublishKit();
  const { publisher: pub2, subscriber: sub2 } = makePublishKit();
  const sub2LIFO = [];

  const sub1FirstAll = [];
  Promise.resolve(sub1.subscribeAfter())
    .then(result => sub1FirstAll.push(result))
    .catch(t.fail);
  Promise.resolve(sub1.subscribeAfter(0n))
    .then(result => sub1FirstAll.push(result))
    .catch(t.fail);

  pub2.publish(undefined);
  sub2LIFO.unshift(await sub2.subscribeAfter());
  t.deepEqual(
    sub1FirstAll,
    [],
    'there should be no results before publication',
  );

  const pub1First = Symbol('pub1First');
  pub1.publish(pub1First);
  sub1FirstAll.push(await sub1.subscribeAfter());
  t.is(
    sub1FirstAll.length,
    3,
    'each initial subscribeAfter should provide a result',
  );
  t.deepEqual(
    new Set(sub1FirstAll),
    new Set([sub1FirstAll[0]]),
    'initial results should be identical',
  );
  t.deepEqual(sub1FirstAll[0].head, { value: pub1First, done: false });

  const sub1FirstLateAll = [];
  const sub1SecondAll = [];
  Promise.resolve(sub1.subscribeAfter())
    .then(result => sub1FirstLateAll.push(result))
    .catch(t.fail);
  Promise.resolve(sub1.subscribeAfter(0n))
    .then(result => sub1FirstLateAll.push(result))
    .catch(t.fail);
  Promise.resolve(sub1.subscribeAfter(sub1FirstAll[0].publishCount))
    .then(result => sub1SecondAll.push(result))
    .catch(t.fail);

  pub2.publish(undefined);
  sub2LIFO.unshift(await sub2.subscribeAfter(sub2LIFO[0].publishCount));
  t.is(sub1FirstLateAll.length, 2, 'current results should resolve promptly');
  t.deepEqual(
    new Set(sub1FirstLateAll),
    new Set([sub1FirstLateAll[0]]),
    'current results should be identical',
  );
  t.deepEqual(
    sub1SecondAll,
    [],
    'there should be no future results before another publication',
  );

  const pub1Second = Symbol('pub1Second');
  pub1.publish(pub1Second);
  pub2.publish(undefined);
  sub2LIFO.unshift(await sub2.subscribeAfter(sub2LIFO[0].publishCount));
  sub1SecondAll.push(await sub1.subscribeAfter());
  t.is(
    sub1FirstLateAll.length,
    2,
    'there should be no further "first" results',
  );
  t.is(sub1SecondAll.length, 2);
  t.deepEqual(
    new Set(sub1SecondAll),
    new Set([sub1SecondAll[0]]),
    'second results should be identical',
  );
  t.deepEqual(sub1SecondAll[0].head, { value: pub1Second, done: false });

  const sub1SecondLateAll = [];
  const sub1FinalAll = [];
  Promise.resolve(sub1.subscribeAfter())
    .then(result => sub1SecondLateAll.push(result))
    .catch(t.fail);
  Promise.resolve(sub1.subscribeAfter(0n))
    .then(result => sub1SecondLateAll.push(result))
    .catch(t.fail);
  Promise.resolve(sub1.subscribeAfter(sub1SecondAll[0].publishCount))
    .then(result => sub1FinalAll.push(result))
    .catch(t.fail);

  pub2.publish(undefined);
  sub2LIFO.unshift(await sub2.subscribeAfter(sub2LIFO[0].publishCount));
  t.is(
    sub1SecondLateAll.length,
    2,
    'current results should resolve promptly (again)',
  );
  t.deepEqual(
    new Set(sub1SecondLateAll),
    new Set([sub1SecondLateAll[0]]),
    'current results should be identical (again)',
  );
  t.deepEqual(
    sub1FinalAll,
    [],
    'there should be no final results before finish',
  );

  const pub1Final = Symbol('pub1Final');
  pub1.finish(pub1Final);
  pub2.publish(undefined);
  sub2LIFO.unshift(await sub2.subscribeAfter(sub2LIFO[0].publishCount));
  sub1FinalAll.push(await sub1.subscribeAfter());
  t.is(
    sub1SecondLateAll.length,
    2,
    'there should be no further "second" results',
  );
  t.is(sub1FinalAll.length, 2);
  t.deepEqual(
    new Set(sub1FinalAll),
    new Set([sub1FinalAll[0]]),
    'final results should be identical',
  );
  t.deepEqual(sub1FinalAll[0].head, { value: pub1Final, done: true });
});
