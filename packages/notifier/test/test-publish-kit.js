// @ts-check

import { test } from './prepare-test-env-ava.js';
import {
  makePublishKit,
  subscribeEach,
  subscribeLatest,
} from '../src/index.js';
import '../src/types.js';
import { invertPromiseSettlement } from './iterable-testing-tools.js';

test('makePublishKit', async t => {
  const { publisher, subscriber } = makePublishKit();

  const pubFirst = Symbol('first');
  publisher.publish(pubFirst);
  const subFirst = await subscriber.subscribeAfter();
  t.deepEqual(
    Reflect.ownKeys(subFirst).sort(),
    ['head', 'publishCount', 'tail'],
    'first iteration result keys',
  );
  t.deepEqual(
    subFirst.head,
    { value: pubFirst, done: false },
    'first iteration result head',
  );
  t.true(subFirst.publishCount > 0n, 'positive publish count');
  t.is(
    await subscriber.subscribeAfter(),
    subFirst,
    'subscribeAfter should return current result (first)',
  );

  const pubSecond = { previous: pubFirst };
  publisher.publish(pubSecond);
  const subSecondAll = await Promise.all([
    subFirst.tail,
    subscriber.subscribeAfter(subFirst.publishCount),
  ]);
  const [subSecond] = subSecondAll;
  t.deepEqual(
    new Set(subSecondAll),
    new Set([subSecond]),
    'tail and subscribeAfter(latestPublishCount) should resolve identically',
  );
  t.deepEqual(
    Reflect.ownKeys(subSecond).sort(),
    ['head', 'publishCount', 'tail'],
    'second iteration result keys',
  );
  t.deepEqual(
    subSecond.head,
    { value: pubSecond, done: false },
    'second iteration result head',
  );
  t.is(
    subSecond.publishCount,
    subFirst.publishCount + 1n,
    'publish count should increment by 1',
  );
  t.is(
    await subscriber.subscribeAfter(),
    subSecond,
    'subscribeAfter should return current result (second)',
  );

  publisher.publish(undefined);
  const subThird = await subSecond.tail;
  t.deepEqual(subThird.head, { value: undefined, done: false });
  t.is(subThird.publishCount, subSecond.publishCount + 1n);
  t.is(
    await subscriber.subscribeAfter(subFirst.publishCount),
    subThird,
    'subscribeAfter(oldPublishCount) should skip to the current result',
  );

  const pubFinal = Symbol('done');
  publisher.finish(pubFinal);
  const subFinalAll = await Promise.all([
    subThird.tail,
    subscriber.subscribeAfter(subThird.publishCount),
  ]);
  const [subFinal] = subFinalAll;
  t.deepEqual(new Set(subFinalAll), new Set([subFinal]));
  t.deepEqual(
    Reflect.ownKeys(subFinal).sort(),
    ['head', 'publishCount', 'tail'],
    'final iteration result keys',
  );
  t.deepEqual(
    subFinal.head,
    { value: pubFinal, done: true },
    'final iteration result head',
  );
  t.is(
    subFinal.publishCount,
    subThird.publishCount + 1n,
    'final publish count should increment by 1',
  );
  t.is(
    await subscriber.subscribeAfter(),
    subFinal,
    'subscribeAfter should return current result (final)',
  );
  t.is(
    await subscriber.subscribeAfter(subFirst.publishCount),
    subFinal,
    'subscribeAfter(oldPublishCount) should skip to the current result (final)',
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
    // @ts-expect-error known to be promise version of PublicationList
    subFinal.tail,
    undefined,
    'tail promise of final result should be rejected',
  );
  await t.throwsAsync(
    // @ts-expect-error known to be promise version of PublicationList
    subscriber.subscribeAfter(subFinal.publishCount),
    undefined,
    'subscribeAfter(finalPublishCount) should be rejected',
  );
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
    // @ts-expect-error known to be promise version of PublicationList
    subFinal.tail,
    undefined,
    'tail promise of final result should be rejected',
  );
  await t.throwsAsync(
    // @ts-expect-error known to be promise version of PublicationList
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
      // @ts-expect-error deliberate invalid arguments for testing
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
