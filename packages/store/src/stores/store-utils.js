// @ts-check

const { details: X, quote: q } = assert;

/**
 * @template K,V
 * @typedef {Object} CurrentKeysKit
 * @property {(k: K, v?: V) => void} assertUpdateOnAdd
 * @property {(k: K) => void} assertUpdateOnDelete
 * @property {Iterable<K>} iterableKeys
 */

/**
 * @template K,V
 * @param {() => Iterable<K>} getRawKeys
 * @param {CompareRank} compare
 * @param {(k: K, v?: V) => void} assertOkToAdd
 * @param {((k: K) => void)=} assertOkToDelete
 * @param {string=} keyName
 * @returns {CurrentKeysKit<K,V>}
 */
export const makeCurrentKeysKit = (
  getRawKeys,
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

  const assertUpdateOnDelete =
    assertOkToDelete === undefined
      ? _k => {
          updateCount += 1;
          sortedKeysMemo = undefined;
        }
      : k => {
          assertOkToDelete(k);
          updateCount += 1;
          sortedKeysMemo = undefined;
        };

  const getSortedKeys = () => {
    if (sortedKeysMemo === undefined) {
      sortedKeysMemo = harden([...getRawKeys()].sort(compare));
    }
    return sortedKeysMemo;
  };

  const iterableKeys = harden({
    [Symbol.iterator]: () => {
      const generation = updateCount;
      getSortedKeys();
      const len = sortedKeysMemo.length;
      let i = 0;
      return harden({
        next: () => {
          assert.equal(
            generation,
            updateCount,
            X`Store ${q(keyName)} cursor stale`,
          );
          // If they're equal, then the sortedKeyMemo is the same one
          // we started with.
          if (i < len) {
            const result = harden({ done: false, value: sortedKeysMemo[i] });
            i += 1;
            return result;
          } else {
            return harden({ done: true, value: undefined });
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
