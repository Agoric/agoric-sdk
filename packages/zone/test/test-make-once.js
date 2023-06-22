import { test as rawTest } from './prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { makeHeapZone } from '../heap.js';
import { makeVirtualZone } from '../virtual.js';
import { makeDurableZone } from '../durable.js';

/** @typedef {import('../src/index.js').Zone} Zone */

/** @type {import('ava').TestFn<ReturnType<makeContext>>} */
const test = rawTest;

const makeContext = () => {
  const heapZone = makeHeapZone();
  const virtualZone = makeVirtualZone();
  const rootBaggage = virtualZone.detached().mapStore('rootBaggage');
  const rootDurableZone = makeDurableZone(rootBaggage);
  return {
    heapZone,
    virtualZone,
    rootBaggage,
    rootDurableZone,
  };
};

test.before(t => {
  t.context = makeContext();
});

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
  const { heapZone } = t.context;
  testOnce(t, heapZone);
});

test('virtualZone', t => {
  const { virtualZone } = t.context;
  testOnce(t, virtualZone);
});

test('durableZone', t => {
  const { rootBaggage, rootDurableZone } = t.context;
  testOnce(t, rootDurableZone);
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
});
