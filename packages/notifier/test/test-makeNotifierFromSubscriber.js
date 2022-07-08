// @ts-check

import { test } from './prepare-test-env-ava.js';

import {
  makeEmptyPublishKit,
  makeNotifierFromSubscriber,
} from '../src/index.js';
import { delayByTurns } from './iterable-testing-tools.js';

/** @param {{conclusionMethod: 'finish' | 'fail', conclusionValue: any}} config */
const makeBatchPublishKit = ({ conclusionMethod, conclusionValue }) => {
  const { publisher, subscriber } = makeEmptyPublishKit();

  // Publish in power-of-two batches: [1], [2], [3, 4], [5, 6, 7, 8], ...
  let nextValue = 1;
  let nextBatchSize = 1;
  let done = false;
  const initialize = () => {
    publisher.publish(nextValue);
    nextValue += 1;
  };
  const publishNextBatch = () => {
    if (done) {
      return;
    }
    for (let i = 0; i < nextBatchSize; i += 1) {
      publisher.publish(nextValue);
      nextValue += 1;
    }
    nextBatchSize *= 2;
    if (nextValue > 64) {
      done = true;
      if (conclusionMethod === 'fail') {
        publisher.fail(conclusionValue);
      } else {
        publisher.finish(conclusionValue);
      }
    }
  };

  return { initialize, publishNextBatch, subscriber };
};

test('makeNotifierFromSubscriber(finishes) - for-await-of iteration', async t => {
  const { initialize, publishNextBatch, subscriber } = makeBatchPublishKit({
    conclusionMethod: 'finish',
    conclusionValue: 'done',
  });
  const notifier = await makeNotifierFromSubscriber(subscriber);
  initialize();

  const results = [];
  for await (const result of notifier) {
    results.push(result);
    publishNextBatch();
  }

  t.deepEqual(
    results,
    [1, 2, 4, 8, 16, 32],
    'only the last of values published between iteration steps should be observed',
  );
});

test('makeNotifierFromSubscriber(finishes) - getUpdateSince', async t => {
  const { initialize, publishNextBatch, subscriber } = makeBatchPublishKit({
    conclusionMethod: 'finish',
    conclusionValue: 'done',
  });
  const notifier = await makeNotifierFromSubscriber(subscriber);
  initialize();

  const results = [];
  let updateCount;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const result = await notifier.getUpdateSince(updateCount);
    ({ updateCount } = result);
    results.push(result.value);
    // eslint-disable-next-line no-await-in-loop
    t.deepEqual(await notifier.getUpdateSince(), result);
    if (updateCount === undefined) {
      break;
    }
    // eslint-disable-next-line no-await-in-loop
    await publishNextBatch();
    // eslint-disable-next-line no-await-in-loop
    t.deepEqual(await notifier.getUpdateSince(), result);
  }

  t.deepEqual(
    results,
    [1, 2, 4, 8, 16, 32, 'done'],
    'only the last of values published between iteration steps should be observed',
  );
  t.deepEqual(await notifier.getUpdateSince(), {
    value: 'done',
    updateCount: undefined,
  });
});

test('makeNotifierFromSubscriber(fails) - for-await-of iteration', async t => {
  const failure = new Error('failure');
  const { initialize, publishNextBatch, subscriber } = makeBatchPublishKit({
    conclusionMethod: 'fail',
    conclusionValue: failure,
  });
  const notifier = await makeNotifierFromSubscriber(subscriber);
  initialize();

  const results = [];
  try {
    for await (const result of notifier) {
      results.push(result);
      publishNextBatch();
    }
    throw new Error('for-await-of completed successfully');
  } catch (err) {
    t.is(err, failure, 'for-await-of should throw the failure value');
  }

  t.deepEqual(
    results,
    [1, 2, 4, 8, 16, 32],
    'only the last of values published between iteration steps should be observed',
  );
});

test('makeNotifierFromSubscriber(fails) - getUpdateSince', async t => {
  const failure = new Error('failure');
  const { initialize, publishNextBatch, subscriber } = makeBatchPublishKit({
    conclusionMethod: 'fail',
    conclusionValue: failure,
  });
  const notifier = await makeNotifierFromSubscriber(subscriber);
  initialize();

  const results = [];
  let updateCount;
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const result = await notifier.getUpdateSince(updateCount);
      ({ updateCount } = result);
      results.push(result.value);
      // eslint-disable-next-line no-await-in-loop
      t.deepEqual(await notifier.getUpdateSince(), result);
      if (updateCount === undefined) {
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await publishNextBatch();
      // eslint-disable-next-line no-await-in-loop
      t.deepEqual(await notifier.getUpdateSince(), result);
    }
    throw new Error('for-await-of completed successfully');
  } catch (err) {
    t.is(err, failure, 'await should throw the failure value');
  }

  t.deepEqual(
    results,
    [1, 2, 4, 8, 16, 32],
    'only the last of values published between iteration steps should be observed',
  );
  await t.throwsAsync(() => notifier.getUpdateSince(), { is: failure });
});

test('makeNotifierFromSubscriber - getUpdateSince timing', async t => {
  const { initialize, publishNextBatch, subscriber } = makeBatchPublishKit({
    conclusionMethod: 'finish',
    conclusionValue: 'done',
  });
  const notifier = await makeNotifierFromSubscriber(subscriber);

  const sequence = [];
  const firstP = notifier.getUpdateSince();
  firstP.then(_ => sequence.push('resolve firstP'));
  const firstP2 = notifier.getUpdateSince();
  firstP2.then(_ => sequence.push('resolve firstP2'));

  await delayByTurns(2);
  t.deepEqual(
    sequence,
    [],
    'getUpdateSince() should not settle before a value is published',
  );

  initialize();
  await delayByTurns(4);
  t.deepEqual(
    sequence,
    ['resolve firstP', 'resolve firstP2'],
    'getUpdateSince() should settle after a value is published',
  );

  publishNextBatch();
  t.deepEqual(
    [await firstP, await firstP2, await notifier.getUpdateSince()].map(
      result => result.value,
    ),
    [1, 1, 1],
    'early getUpdateSince() should resolve to the first value',
  );

  publishNextBatch();
  const lateResult = await notifier.getUpdateSince();
  t.deepEqual(
    lateResult.value,
    1,
    'late getUpdateSince() should still fulfill with the latest value',
  );
  t.deepEqual(
    [
      await notifier.getUpdateSince(lateResult.updateCount),
      await notifier.getUpdateSince(),
      await notifier.getUpdateSince(),
    ].map(result => result.value),
    [4, 4, 4],
    'getUpdateSince(updateCount) should advance to the latest value',
  );

  publishNextBatch();
  await delayByTurns(4);
  t.deepEqual(
    (await notifier.getUpdateSince(lateResult.updateCount)).value,
    4,
    'getUpdateSince(oldUpdateCount) should fulfill with the latest value',
  );
});

test('makeNotifierFromSubscriber - updateCount validation', async t => {
  const { subscriber } = makeBatchPublishKit({
    conclusionMethod: 'finish',
    conclusionValue: 'done',
  });
  const notifier = await makeNotifierFromSubscriber(subscriber);
  t.throws(() => notifier.getUpdateSince(1n));
});

test('makeNotifierFromSubscriber - getUpdateSince() promise uniqueness', async t => {
  const { initialize, publishNextBatch, subscriber } = makeBatchPublishKit({
    conclusionMethod: 'finish',
    conclusionValue: 'done',
  });
  const notifier = await makeNotifierFromSubscriber(subscriber);
  const firstP = notifier.getUpdateSince();
  t.not(
    notifier.getUpdateSince(),
    firstP,
    'early getUpdateSince() promises should be distinct',
  );

  initialize();
  await delayByTurns(4);
  const { updateCount } = await firstP;
  t.not(
    notifier.getUpdateSince(updateCount),
    notifier.getUpdateSince(updateCount),
    'getUpdateSince(updateCount) promises should be distinct',
  );

  publishNextBatch();
  await notifier.getUpdateSince(updateCount);
  t.not(
    notifier.getUpdateSince(),
    notifier.getUpdateSince(),
    'late getUpdateSince() promises should be distinct',
  );
  t.not(
    notifier.getUpdateSince(),
    notifier.getUpdateSince(updateCount),
    'getUpdateSince() promises should be distinct from getUpdateSince(updateCount) promises',
  );
});
