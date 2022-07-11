// @ts-check

import { Far } from '@endo/marshal';

const { details: X, quote: q } = assert;

/**
 * @template K,V
 * @typedef {object} CurrentKeysKit
 * @property {(k: K, v?: V) => void} assertUpdateOnAdd
 * @property {(k: K) => void} assertUpdateOnDelete
 * @property {Iterable<K>} iterableKeys
 */

/**
 * @template K,V
 * @param {() => Iterable<K>} getRawKeys
 * @param {(k: K) => boolean} checkHas
 * @param {RankCompare} compare
 * @param {(k: K, v?: V) => void} assertOkToAdd
 * @param {((k: K) => void)=} assertOkToDelete
 * @param {string=} keyName
 * @returns {CurrentKeysKit<K,V>}
 */
export const makeCurrentKeysKit = (
  getRawKeys,
  checkHas,
  compare,
  assertOkToAdd,
  assertOkToDelete = undefined,
  keyName = 'key',
) => {
  let updateCount = 0;
  let sortedKeysMemo;

  const assertUpdateOnAdd = (k, v = undefined) => {
    assertOkToAdd(k, v);
    updateCount += 1;
    sortedKeysMemo = undefined;
  };

  const assertUpdateOnDelete = k => assertOkToDelete && assertOkToDelete(k);

  const getSortedKeys = () => {
    if (sortedKeysMemo === undefined) {
      sortedKeysMemo = harden([...getRawKeys()].sort(compare));
    }
    return sortedKeysMemo;
  };

  const iterableKeys = Far('Iterable of keys', {
    [Symbol.iterator]: () => {
      const generation = updateCount;
      getSortedKeys();
      const len = sortedKeysMemo.length;
      let i = 0;
      return Far('Iterator of keys', {
        next: () => {
          assert.equal(
            generation,
            updateCount,
            X`Store ${q(keyName)} cursor stale`,
          );
          // If they're equal, then the sortedKeyMemo is the same one
          // we started with.
          for (;;) {
            if (i < len) {
              const value = sortedKeysMemo[i];
              i += 1;
              if (checkHas(value)) {
                return harden({ done: false, value });
              }
            } else {
              return harden({ done: true, value: undefined });
            }
          }
        },
      });
    },
  });

  return harden({
    assertUpdateOnAdd,
    assertUpdateOnDelete,
    iterableKeys,
  });
};
harden(makeCurrentKeysKit);

/**
 * Call `provide` to get or make the value associated with the key.
 * If there already is one, return that. Otherwise,
 * call `makeValue(key)`, remember it as the value for
 * that key, and return it.
 *
 * @template K,V
 * @param {WeakMapStore<K,V>} mapStore
 * @param {K} key
 * @param {(key: K) => V} makeValue
 * @returns {V}
 */
export const provide = (mapStore, key, makeValue) => {
  if (!mapStore.has(key)) {
    mapStore.init(key, makeValue(key));
  }
  return mapStore.get(key);
};
harden(provide);

/**
 * Helper for use cases in which the maker function is async. For two provide
 * calls with the same key, one may be making when the other call starts and it
 * would make again. (Then there'd be a collision when the second tries to store
 * the key.) This prevents that race condition by immediately storing a Promise
 * for the maker in an ephemeral store.
 *
 * When the `store` argument is durable storage, note that it's possible for
 * termination to happen after the make completes and before it reaches durable
 * storage.
 *
 * @template K
 * @template V
 * @param {WeakMapStore<K, V>} store
 */
export const makeAtomicProvider = store => {
  /** @type {Map<K, Promise<V>>} */
  const pending = new Map();

  /**
   * Call `provideAsync` to get or make the value associated with the key,
   * when the maker is asynchronous.
   * If there already is one, return that. Otherwise,
   * call `makeValue(key)`, remember it as the value for
   * that key, and return it.
   *
   * @param {K} key
   * @param {(key: K) => Promise<V>} makeValue make the value for the store if it hasn't been made yet or the last make failed
   * @param {(key: K, value: V) => Promise<void>} [finishValue] runs exactly once after a new value is added to the store
   * @returns {Promise<V>}
   */
  const provideAsync = (key, makeValue, finishValue) => {
    if (store.has(key)) {
      return Promise.resolve(store.get(key));
    }
    if (!pending.has(key)) {
      const valP = makeValue(key)
        .then(v => {
          store.init(key, v);
          return v;
        })
        .then(v => {
          if (finishValue) {
            return finishValue(key, v).then(() => v);
          }
          return v;
        })
        .finally(() => {
          pending.delete(key);
        });
      pending.set(key, valP);
    }
    const valP = pending.get(key);
    assert(valP);
    return valP;
  };

  return harden({ provideAsync });
};
harden(makeAtomicProvider);
/**
 * @template K
 * @template V
 * @typedef {ReturnType<typeof makeAtomicProvider<K, V>>} AtomicProvider<K, V>
 */
