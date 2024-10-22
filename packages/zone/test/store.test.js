import {
  annihilate,
  getBaggage,
  test,
} from '@agoric/swingset-vat/tools/prepare-strict-test-env-ava.js';

import { initSerializedFakeSwingStoreStorage } from '@agoric/swingset-vat/tools/fakeSwingStoreStorage.js';
import { initSerializedFakeStorageFromMap } from '@agoric/swingset-liveslots/tools/fakeStorage.js';

import { makeDurableZone } from '../durable.js';
import { makeHeapZone } from '../heap.js';
import { makeVirtualZone } from '../virtual.js';

/** @import {Zone} from '../src/index.js' */

/**
 * @param {import('ava').ExecutionContext} t
 * @param {Zone} rootZone
 */
const testSetStoreOrder = (t, rootZone) => {
  const store = rootZone.setStore('test');
  store.add('\u{ff42}'); // Fullwidth Latin Small Letter B
  store.add('\u{1d5ba}'); // Mathematical Sans-Serif Small A
  store.add('\u{63}'); // Latin Small Letter C

  t.deepEqual([...store.keys()], ['\u{63}', '\u{ff42}', '\u{1d5ba}']);
};

// Failing until https://github.com/endojs/endo/issues/2113
test.failing('heapZone', t => {
  testSetStoreOrder(t, makeHeapZone());
});

test.serial('virtualZone - fake Map KVStore', t => {
  const fakeStorage = initSerializedFakeStorageFromMap();
  annihilate({ fakeStorage });
  testSetStoreOrder(t, makeVirtualZone());
});

test.serial('virtualZone - swing-store KVStore', t => {
  const fakeStorage = initSerializedFakeSwingStoreStorage();
  annihilate({ fakeStorage });
  testSetStoreOrder(t, makeVirtualZone());
});

test.serial('durableZone - fake Map KVStore', t => {
  const fakeStorage = initSerializedFakeStorageFromMap();
  annihilate({ fakeStorage });
  const rootBaggage = getBaggage();
  const rootDurableZone = makeDurableZone(rootBaggage);
  testSetStoreOrder(t, rootDurableZone);
});

test.serial('durableZone - swing-store KVStore', t => {
  const fakeStorage = initSerializedFakeSwingStoreStorage();
  annihilate({ fakeStorage });
  const rootBaggage = getBaggage();
  const rootDurableZone = makeDurableZone(rootBaggage);
  testSetStoreOrder(t, rootDurableZone);
});
