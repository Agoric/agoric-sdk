// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { E } from '@endo/far';
import { publishToChainNode } from '../src/lib-chainPublish.js';

test('publishToChainNode', async t => {
  // eslint-disable-next-line no-use-before-define
  const inputs = getMockInputs(t);
  const {
    // external facets
    storageNode,
    timerService,
    customAsyncIterable,
    // internal facets
    nodeValueHistory,
    advanceTimer,
    supplyIterationResult,
  } = inputs;
  publishToChainNode(customAsyncIterable, storageNode, { timerService }).catch(
    err => t.fail(`unexpected error: ${err}`),
  );
  await E(Promise).resolve();

  supplyIterationResult('foo');
  await E(Promise).resolve().then();
  t.is(nodeValueHistory.length, 1, 'first result is sent promptly');
  t.deepEqual(
    JSON.parse(nodeValueHistory[0]),
    [['0', 'foo']],
    'first result has index 0',
  );

  supplyIterationResult('bar');
  await E(Promise).resolve().then();
  t.is(nodeValueHistory.length, 2, 'second result is sent promptly');
  t.deepEqual(
    JSON.parse(nodeValueHistory[1]),
    [
      ['0', 'foo'],
      ['1', 'bar'],
    ],
    'second result is appended',
  );

  advanceTimer();
  supplyIterationResult('baz');
  await E(Promise).resolve().then();
  t.is(
    nodeValueHistory.length,
    3,
    'result following timer advance is sent promptly',
  );
  t.deepEqual(
    JSON.parse(nodeValueHistory[2]),
    [
      ['0', 'foo'],
      ['1', 'bar'],
      ['2', 'baz'],
    ],
    'last-batch results are preserved after timer advance',
  );

  advanceTimer();
  advanceTimer();
  advanceTimer();
  supplyIterationResult('qux');
  await E(Promise).resolve().then();
  t.is(
    nodeValueHistory.length,
    4,
    'results following multiple timer advances are sent promptly',
  );
  t.deepEqual(
    JSON.parse(nodeValueHistory[3]),
    [
      ['2', 'baz'],
      ['3', 'qux'],
    ],
    'batches older than the previous are dropped when a new result is supplied',
  );

  supplyIterationResult('quux');
  await E(Promise).resolve().then();
  t.is(nodeValueHistory.length, 5);
  t.deepEqual(
    JSON.parse(nodeValueHistory[4]),
    [
      ['2', 'baz'],
      ['3', 'qux'],
      ['4', 'quux'],
    ],
    'batches older than the previous are dropped when a second new result is supplied',
  );

  advanceTimer();
  advanceTimer();
  advanceTimer();
  supplyIterationResult('corge');
  await E(Promise).resolve().then();
  t.is(nodeValueHistory.length, 6);
  t.deepEqual(
    JSON.parse(nodeValueHistory[5]),
    [
      ['3', 'qux'],
      ['4', 'quux'],
      ['5', 'corge'],
    ],
    'the full previous batch is preserved after multiple timer advances',
  );
});

test('publishToChainNode captures finish value', async t => {
  // eslint-disable-next-line no-use-before-define
  const inputs = getMockInputs(t);
  const {
    // external facets
    storageNode,
    timerService,
    customAsyncIterable,
    // internal facets
    nodeValueHistory,
    supplyIterationResult,
  } = inputs;
  publishToChainNode(customAsyncIterable, storageNode, { timerService }).catch(
    err => t.fail(`unexpected error: ${err}`),
  );
  await E(Promise).resolve();

  supplyIterationResult.finish('foo');
  await E(Promise).resolve().then();
  t.is(nodeValueHistory.length, 1, 'finish is sent promptly');
  t.deepEqual(
    JSON.parse(nodeValueHistory[0]),
    [['finish', 'foo']],
    'result has index "finish"',
  );
});

test('publishToChainNode captures fail value', async t => {
  // eslint-disable-next-line no-use-before-define
  const inputs = getMockInputs(t);
  const {
    // external facets
    storageNode,
    timerService,
    customAsyncIterable,
    // internal facets
    nodeValueHistory,
    supplyIterationResult,
  } = inputs;
  publishToChainNode(customAsyncIterable, storageNode, { timerService }).catch(
    err => t.fail(`unexpected error: ${err}`),
  );
  await E(Promise).resolve();

  supplyIterationResult.fail('foo');
  await E(Promise).resolve().then();
  t.is(nodeValueHistory.length, 1, 'fail is sent promptly');
  t.deepEqual(
    JSON.parse(nodeValueHistory[0]),
    [['fail', 'foo']],
    'result has index "fail"',
  );
});

test('publishToChainNode custom serialization', async t => {
  // eslint-disable-next-line no-use-before-define
  const inputs = getMockInputs(t);
  const {
    // external facets
    storageNode,
    timerService,
    customAsyncIterable,
    // internal facets
    nodeValueHistory,
    supplyIterationResult,
  } = inputs;
  const serializeInputHistory = [];
  const serialize = val => {
    const length = serializeInputHistory.push(val);
    return String(length);
  };
  publishToChainNode(customAsyncIterable, storageNode, {
    timerService,
    serialize,
  }).catch(err => t.fail(`unexpected error: ${err}`));
  await E(Promise).resolve();

  supplyIterationResult('foo');
  await E(Promise).resolve().then();
  t.is(serializeInputHistory.length, 1, 'first result is serialized promptly');
  t.deepEqual(
    serializeInputHistory[0],
    [['0', 'foo']],
    'first result has index 0',
  );
  t.is(nodeValueHistory.length, 1, 'first result is sent promptly');
  t.is(nodeValueHistory[0], '1', 'first result is output from serialize()');

  supplyIterationResult('bar');
  await E(Promise).resolve().then();
  t.is(serializeInputHistory.length, 2, 'second result is serialized promptly');
  t.deepEqual(
    serializeInputHistory[1],
    [
      ['0', 'foo'],
      ['1', 'bar'],
    ],
    'second result is appended',
  );
  t.is(nodeValueHistory.length, 2, 'second result is sent promptly');
  t.is(nodeValueHistory[1], '2', 'second result is output from serialize()');

  supplyIterationResult.finish('baz');
  await E(Promise).resolve().then();
  t.is(serializeInputHistory.length, 3, 'finish result is serialized promptly');
  t.deepEqual(
    serializeInputHistory[2],
    [
      ['0', 'foo'],
      ['1', 'bar'],
      ['finish', 'baz'],
    ],
    'finish result is appended',
  );
  t.is(nodeValueHistory.length, 3, 'finish result is sent promptly');
  t.is(nodeValueHistory[2], '3', 'finish result is output from serialize()');
});

test('publishToChainNode does not drop values', async t => {
  // eslint-disable-next-line no-use-before-define
  const { storageNode, nodeValueHistory } = getMockInputs(t);

  // This approach is a little intricate...
  // We start by producing a sequence of increasing nonnegative values,
  // and switch to decreasing negative values upon the response to a
  // timerService delay call being fulfilled.
  // The delay response intentionally takes many turns to fulfill,
  // and we expect at least one negative value to be consumed between its
  // fulfillment and acknowledgement thereof by the caller (i.e., new block
  // detection).
  // We then verify that the first dropped batch included at least one
  // negative value.
  let nextValue = 0;
  let step = 1;
  const timerService = {
    delay() {
      if (step < 0) return Promise.resolve();
      let slow = Promise.resolve();
      for (let i = 0; i < 10; i += 1) slow = slow.then();
      return slow.then(() => {
        nextValue = -1;
        step = -1;
      });
    },
  };
  let oldestIndex;
  let oldestValue;
  const batchDropped = () => {
    if (!nodeValueHistory.length) return false;
    const lastSent = JSON.parse(nodeValueHistory[nodeValueHistory.length - 1]);
    [oldestIndex, oldestValue] = lastSent[0];
    return oldestIndex !== '0' || oldestValue !== 0;
  };
  const source = (async function* makeSource() {
    while (!batchDropped()) {
      if (Math.abs(nextValue) >= 1e5) throw new Error('too many iterations');
      yield nextValue;
      nextValue += step;
    }
  })();
  await publishToChainNode(source, storageNode, { timerService }).catch(err =>
    t.fail(`unexpected error: ${err}`),
  );
  t.true(
    Number(oldestIndex) > 0 && Number(oldestValue) < 0,
    `result after first dropped batch should have positive index and negative value: ${JSON.stringify(
      [oldestIndex, oldestValue],
    )}`,
  );
});

// TODO: Move to a testing library.
function getMockInputs(t) {
  // Mock a chainStorage node.
  const nodeValueHistory = [];
  const storageNode = {
    setValue(val) {
      nodeValueHistory.push(val);
    },
  };

  // Mock a timerService.
  let advanceTimerP;
  let advanceTimerR = () => {};
  const advanceTimer = () => {
    advanceTimerR();
    advanceTimerP = new Promise(resolve => {
      advanceTimerR = resolve;
    });
  };
  const timerService = {
    delay(n) {
      t.is(n, 1n);
      return advanceTimerP;
    },
  };

  // Create an async iterable with a function for supplying results.
  const pendingResults = [{ resolve() {} }];
  const supplyIterationResult = value => {
    const nextDeferred = {};
    nextDeferred.promise = new Promise((resolve, reject) => {
      nextDeferred.resolve = resolve;
      nextDeferred.reject = reject;
    });
    const newLength = pendingResults.push(nextDeferred);
    pendingResults[newLength - 2].resolve({ value });
  };
  supplyIterationResult.finish = value => {
    pendingResults[pendingResults.length - 1].resolve({ value, done: true });
  };
  supplyIterationResult.fail = value => {
    pendingResults[pendingResults.length - 1].reject(value);
  };
  const customAsyncIterable = (async function* makeCustomAsyncIterable() {
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const iterationResult = await pendingResults[0].promise;
      pendingResults.shift();
      if (iterationResult.done) {
        return iterationResult.value;
      }
      yield iterationResult.value;
    }
  })();

  // Initialize.
  advanceTimer();
  supplyIterationResult();
  pendingResults.shift();

  return {
    // external facets
    storageNode,
    timerService,
    customAsyncIterable,
    // internal facets
    nodeValueHistory,
    advanceTimer,
    supplyIterationResult,
  };
}
