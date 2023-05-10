import { test } from './prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { heapZone } from '../heap.js';
import { virtualZone } from '../virtual.js';
import { makeDurableZone } from '../durable.js';

/** @typedef {import('../src/index.js').Zone} Zone */

/**
 * @param {string} label
 * @param {Zone} rootZone
 */
const testOnce = (label, rootZone) => {
  test(`${label} once`, t => {
    const subZone = rootZone.subZone('sub');
    const a = subZone.once('a', () => 'A');
    t.is(a, 'A');
    const detStores = rootZone.detached();
    const b = detStores.once('b', () => 'B');
    t.is(b, 'B');
  });
};

testOnce('heapZone', heapZone);
testOnce('virtualZone', virtualZone);

const rootBaggage = makeScalarBigMapStore('rootBaggage', { durable: false });
const rootDurableZone = makeDurableZone(rootBaggage);
testOnce('durableZone', rootDurableZone);
