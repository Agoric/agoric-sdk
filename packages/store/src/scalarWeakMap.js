// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { Far, passStyleOf } from '@agoric/marshal';
import './types.js';

const assertKey = key => {
  harden(key); // TODO: Just a transition kludge. Remove when possible.
  assert.equal(
    passStyleOf(key),
    'remotable',
    X`WeakStores accept only identity-based keys: ${key}`,
  );
};

const assertValue = value => {
  harden(value); // TODO: Just a transition kludge. Remove when possible.
  passStyleOf(value); // asserts that value is passable
};

/**
 * This is a *scalar* map in that the keys can only be atomic values, primitives
 * or remotables. Other storeMaps will accept, for example, copyArrays and
 * copyRecords, as keys and look them up based on equality of their contents.
 *
 * TODO For now, this scalarWeakMap accepts only remotables, reflecting the
 * constraints of the underlying JavaScript WeakMap it uses internally. But
 * it should accept the primitives as well, storing them in a separate internal
 * map. What makes it "weak" is that it provides no API for enumerating what's
 * there. Though note that this only enables collection of the remotables, since
 * the other primitives may always appear.
 *
 * @template K,V
 * @param {string} [keyName='key']
 * @param {Partial<StoreOptions>=} options
 * @returns {WeakStore<K, V>}
 */
export const makeScalarWeakMap = (
  keyName = 'key',
  { longLived = true } = {},
) => {
  const wm = new (longLived ? WeakMap : Map)();
  const assertKeyDoesNotExist = key =>
    assert(!wm.has(key), X`${q(keyName)} already registered: ${key}`);
  const assertKeyExists = key =>
    assert(wm.has(key), X`${q(keyName)} not found: ${key}`);
  const scalarWeakMap = Far(`scalarWeakMap of ${q(keyName)}`, {
    has: key => {
      // Check if a key exists. The key can be any JavaScript value,
      // though the answer will always be false for keys that cannot be found
      // in this map.
      return wm.has(key);
    },
    init: (key, value) => {
      assertKey(key);
      assertValue(value);
      assertKeyDoesNotExist(key);
      wm.set(key, value);
    },
    get: key => {
      assertKeyExists(key);
      return wm.get(key);
    },
    set: (key, value) => {
      assertKeyExists(key);
      assertValue(value);
      wm.set(key, value);
    },
    delete: key => {
      assertKeyExists(key);
      wm.delete(key);
    },
  });
  return harden(scalarWeakMap);
};
harden(makeScalarWeakMap);
