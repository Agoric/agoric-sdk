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

  supplyIterationResult('foo');
  await E(Promise).resolve();
  t.is(nodeValueHistory.length, 1, 'first result is communicated promptly');
  t.deepEqual(
    nodeValueHistory.pop(),
    [['0', 'foo']],
    'first result has index 0',
  );

  supplyIterationResult('bar');
  await E(Promise).resolve();
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
  await E(Promise).resolve();
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
  await E(Promise).resolve();
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
  await E(Promise).resolve();
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
  await E(Promise).resolve();
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
  let nextResultP;
  let nextResultR = _result => {};
  const supplyIterationResult = result => {
    nextResultR(result);
    nextResultP = new Promise(resolve => {
      nextResultR = resolve;
    });
  };
  const customAsyncIterable = (async function* makeCustomAsyncIterable() {
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      yield await nextResultP;
    }
  })();

  // Initialize.
  advanceTimer();
  supplyIterationResult();

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
