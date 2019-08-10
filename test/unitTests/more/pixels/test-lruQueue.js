import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeLruQueue } from '../../../../more/pixels/lruQueue';

test('LRU Queue creation', t => {
  const { lruQueue, lruQueueBuilder } = makeLruQueue();
  const pixel = harden({ x: 0, y: 0 });
  lruQueueBuilder.push(pixel);
  t.equals(lruQueueBuilder.isEmpty(), false);
  t.equals(lruQueue.popToTail(), lruQueue.popToTail());
  t.end();
});

test('LRU empty Queue', t => {
  const { lruQueue, lruQueueBuilder } = makeLruQueue();
  t.assert(lruQueueBuilder.isEmpty());
  t.equals(lruQueue.popToTail(), lruQueue.popToTail());
  t.end();
});

test('LRU small Queue', t => {
  const { lruQueue, lruQueueBuilder } = makeLruQueue();
  for (let i = 0; i < 2; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      lruQueueBuilder.push({ x: i, y: j });
    }
  }
  t.notOk(lruQueueBuilder.isEmpty());
  for (let i = 0; i < 2; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      t.same(lruQueue.popToTail(), { x: i, y: j });
    }
  }
  t.same({ x: 0, y: 0 }, lruQueue.popToTail());
  t.end();
});

test('LRU requeue', t => {
  const { lruQueue, lruQueueBuilder } = makeLruQueue();
  const pointsOrdered = new Map();
  for (let i = 0; i < 2; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      const aPoint = harden({ x: i, y: j });
      lruQueueBuilder.push(aPoint);
      pointsOrdered.set(2 * i + j, aPoint);
    }
  }

  // 0,1,2,3
  lruQueue.requeue(pointsOrdered.get(3));
  // 0,1,2,3
  t.same(lruQueue.popToTail(), pointsOrdered.get(0));
  // 1,2,3,0
  lruQueue.requeue(pointsOrdered.get(2));
  // 1,3,0,2
  t.same(lruQueue.popToTail(), pointsOrdered.get(1));
  // 3,0,2,1
  lruQueue.requeue(pointsOrdered.get(3));
  // 0,2,1,3
  t.same(lruQueue.popToTail(), pointsOrdered.get(0));
  // 2,1,3,0
  t.same(lruQueue.popToTail(), pointsOrdered.get(2));
  // 1,3,0,2
  t.same(lruQueue.popToTail(), pointsOrdered.get(1));

  t.end();
});

test('LRU reorder', t => {
  const { lruQueue, lruQueueBuilder } = makeLruQueue();
  const pointsOrdered = new Map();
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      const aPoint = harden({ x: i, y: j });
      lruQueueBuilder.push(aPoint);
      pointsOrdered.set(3 * i + j, aPoint);
    }
  }
  lruQueueBuilder.resortArbitrarily(9, 6);
  // 6 + 6 mod 9 chooses the third entry
  t.same(lruQueue.popToTail(), pointsOrdered.get(3));
  // 3 + 6 mod 8 chooses the first entry
  t.same(lruQueue.popToTail(), pointsOrdered.get(1));
  // 1 + 6 mod 7 chooses the zeroth entry
  t.same(lruQueue.popToTail(), pointsOrdered.get(0));
  // 0 + 6 mod 6 chooses the zeroth remaining entry
  t.same(lruQueue.popToTail(), pointsOrdered.get(2));
  // 0 + 6 mod 5 chooses the first remaining entry
  t.same(lruQueue.popToTail(), pointsOrdered.get(5));
  // 1 + 6 mod 4 chooses the third remaining entry
  t.same(lruQueue.popToTail(), pointsOrdered.get(8));
  t.same(lruQueue.popToTail(), pointsOrdered.get(4));
  t.same(lruQueue.popToTail(), pointsOrdered.get(6));
  t.same(lruQueue.popToTail(), pointsOrdered.get(7));

  t.end();
});
