import { test, getBaggage, nextLife } from './prepare-test-env-ava.js';

import { makeDurableZone } from '../durable.js';
import { makeHeapZone } from '../heap.js';
import { makeVirtualZone } from '../virtual.js';

/** @typedef {import('../src/index.js').Zone} Zone */

/**
 * @param {import('ava').Assertions} t
 * @param {Zone} rootZone
 */
const testOnce = (t, rootZone) => {
  const subZone = rootZone.subZone('sub');
  const a = subZone.makeOnce('a', () => 'A');
  t.is(a, 'A');
  t.throws(() => subZone.makeOnce('a', () => 'A'), {
    message: /has already been used/,
  });
  const nonPassable = harden({
    hello() {
      return 'world';
    },
  });
  t.is(rootZone.isStorable(nonPassable), false);
  t.is(subZone.isStorable(123), true);
  t.throws(() => rootZone.makeOnce('nonPassable', () => nonPassable), {
    message: /is not storable/,
  });
};

test('heapZone', t => {
  testOnce(t, makeHeapZone());
});

test.serial('virtualZone', t => {
  testOnce(t, makeVirtualZone());
});

test.serial('durableZone', t => {
  const rootBaggage = getBaggage();
  const rootDurableZone = makeDurableZone(rootBaggage);
  testOnce(t, rootDurableZone);

  if (false) {
    const secondDurableZone = makeDurableZone(rootBaggage);
    // FIXME: This test should fail, because we used the same baggage twice.
    testOnce(t, secondDurableZone);
    const subDurableZone = makeDurableZone(rootBaggage).subZone('sub');
    t.is(
      subDurableZone.makeOnce('a', () => 'B'),
      'A',
    );
    t.throws(() => subDurableZone.makeOnce('a', () => 'B'), {
      message: /has already been used/,
    });
  }

  nextLife();
  const thirdDurableZone = makeDurableZone(getBaggage());
  testOnce(t, thirdDurableZone);
});
