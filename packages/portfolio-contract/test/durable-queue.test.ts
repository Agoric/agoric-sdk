import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeHeapZone } from '@agoric/zone';
import { M } from '@endo/patterns';
import { prepareDurableQueue } from '../src/durable-queue.exo.ts';

const makeQueue = () => {
  const zone = makeHeapZone();
  const makeDurableQueue = prepareDurableQueue<string>(zone, 'TestQueue', {
    valueShape: M.string(),
  });
  return makeDurableQueue('queueStore');
};

test('durable queue preserves FIFO order', t => {
  const queue = makeQueue();
  t.true(queue.isEmpty());
  t.is(queue.size(), 0);

  queue.enqueue('alpha');
  queue.enqueue('beta');
  queue.enqueue('gamma');

  t.false(queue.isEmpty());
  t.is(queue.size(), 3);
  t.is(queue.peek(), 'alpha');

  t.deepEqual(queue.getIndices(), { head: 0n, tail: 3n });

  t.deepEqual(queue.entries(), [
    { index: 0n, value: 'alpha' },
    { index: 1n, value: 'beta' },
    { index: 2n, value: 'gamma' },
  ]);

  t.is(queue.dequeue(), 'alpha');
  t.is(queue.dequeue(), 'beta');
  t.is(queue.dequeue(), 'gamma');
  t.true(queue.isEmpty());
  t.is(queue.size(), 0);
  t.is(queue.dequeue(), undefined);
});

test('durable queue clear and guards', t => {
  const queue = makeQueue();

  queue.enqueue('one');
  queue.enqueue('two');

  queue.clear();
  t.true(queue.isEmpty());
  t.deepEqual(queue.getIndices(), { head: 0n, tail: 0n });

  const entries = queue.entries();
  t.deepEqual(entries, []);

  t.throws(() => queue.enqueue(123 as any), {
    message: /string/i,
  });
});
