import { test } from './prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { makeHeapZone } from '../heap.js';
import { makeVirtualZone } from '../virtual.js';
import { makeDurableZone } from '../durable.js';

/** @typedef {import('../src/index.js').Zone} Zone */

/**
 * @param {string} label
 * @param {Zone} rootZone
 * @param {boolean} [heapOnlyZone]
 */
const testOnce = (label, rootZone, heapOnlyZone = false) => {
  test(`${label} once`, t => {
    const subZone = rootZone.subZone('sub');
    const a = subZone.makeOnce('a', () => 'A');
    t.is(a, 'A');
    t.throws(() => subZone.makeOnce('a', () => 'A'));
    const heapValue = harden({
      hello() {
        return 'world';
      },
    });
    if (heapOnlyZone) {
      t.is(
        rootZone.makeOnce('heap', () => heapValue),
        heapValue,
      );
    } else {
      t.throws(() => rootZone.makeOnce('heap', () => heapValue));
    }
  });
};

const heapZone = makeHeapZone();
const virtualZone = makeVirtualZone();
testOnce('heapZone', heapZone, true);
testOnce('virtualZone', virtualZone);

const rootBaggage = virtualZone.detached().mapStore('rootBaggage');
const rootDurableZone = makeDurableZone(rootBaggage);
testOnce('durableZone', rootDurableZone);
testOnce('durableZone second incarnation', makeDurableZone(rootBaggage));
