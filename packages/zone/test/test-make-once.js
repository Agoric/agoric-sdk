import {
  test,
  getBaggage,
  nextLife,
  annihilate,
} from './prepare-test-env-ava.js';

import { makeDurableZone } from '../durable.js';
import { makeVirtualZone } from '../virtual.js';
import { makeHeapZone } from '../heap.js';

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
  const zone = makeHeapZone();
  testOnce(t, zone);
});

test.serial('virtualZone', t => {
  nextLife();
  const zone = makeVirtualZone();
  testOnce(t, zone);
});

test.serial('durableZone', t => {
  annihilate();
  const rootBaggage = getBaggage();
  const rootDurableZone = makeDurableZone(rootBaggage);
  testOnce(t, rootDurableZone);

  // Do we actually want to refuse to use the same baggage twice?
  const secondDurableZone = makeDurableZone(rootBaggage);
  testOnce(t, secondDurableZone);
  const subDurableZone = makeDurableZone(rootBaggage).subZone('sub');
  t.is(
    subDurableZone.makeOnce('a', () => 'B'),
    'A',
  );
  t.throws(() => subDurableZone.makeOnce('a', () => 'B'), {
    message: /has already been used/,
  });

  nextLife();
  const thirdDurableZone = makeDurableZone(getBaggage());
  testOnce(t, thirdDurableZone);
});
