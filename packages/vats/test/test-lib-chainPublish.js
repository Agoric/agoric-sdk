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
  publishToChainNode(customAsyncIterable, storageNode, { timerService });
  await E(Promise).resolve();

  supplyIterationResult('foo');
  await E(Promise).resolve().then();
  t.is(nodeValueHistory.length, 1, 'first result is communicated promptly');
  t.deepEqual(
    nodeValueHistory.pop(),
    [['0', 'foo']],
    'first result has index 0',
  );

  supplyIterationResult('bar');
  await E(Promise).resolve().then();
  t.is(nodeValueHistory.length, 1, 'second result is communicated promptly');
  t.deepEqual(
    nodeValueHistory.pop(),
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
    1,
    'result following timer advance is communicated promptly',
  );
  t.deepEqual(
    nodeValueHistory.pop(),
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
    1,
    'results following multiple timer advances are communicated promptly',
  );
  t.deepEqual(
    nodeValueHistory.pop(),
    [
      ['2', 'baz'],
      ['3', 'qux'],
    ],
    'batches older than the previous are dropped when a new result is supplied',
  );

  supplyIterationResult('quux');
  await E(Promise).resolve().then();
  t.is(nodeValueHistory.length, 1);
  t.deepEqual(
    nodeValueHistory.pop(),
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
  t.is(nodeValueHistory.length, 1);
  t.deepEqual(
    nodeValueHistory.pop(),
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
  publishToChainNode(customAsyncIterable, storageNode, { timerService });
  await E(Promise).resolve();

  supplyIterationResult.finish('foo');
  await E(Promise).resolve().then();
  t.is(nodeValueHistory.length, 1, 'finish is communicated promptly');
  t.deepEqual(
    nodeValueHistory.pop(),
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
  publishToChainNode(customAsyncIterable, storageNode, { timerService });
  await E(Promise).resolve();

  supplyIterationResult.fail('foo');
  await E(Promise).resolve().then();
  t.is(nodeValueHistory.length, 1, 'fail is communicated promptly');
  t.deepEqual(
    nodeValueHistory.pop(),
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
  });
  await E(Promise).resolve();

  supplyIterationResult('foo');
  await E(Promise).resolve().then();
  t.is(serializeInputHistory.length, 1, 'first result is serialized promptly');
  t.deepEqual(
    serializeInputHistory[0],
    [['0', 'foo']],
    'first result has index 0',
  );
  t.is(nodeValueHistory.length, 1, 'first result is communicated promptly');
  t.is(nodeValueHistory[0], 1, 'first result is output from serialize()');

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
  t.is(nodeValueHistory.length, 2, 'second result is communicated promptly');
  t.is(nodeValueHistory[1], 2, 'second result is output from serialize()');

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
  t.is(nodeValueHistory.length, 3, 'finish result is communicated promptly');
  t.is(nodeValueHistory[2], 3, 'finish result is output from serialize()');
});

// TODO: Move to a testing library.
function getMockInputs(t) {
  // Mock a chainStorage node.
  const nodeValueHistory = [];
  const storageNode = {
    setValue(val) {
      nodeValueHistory.push(JSON.parse(val));
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
