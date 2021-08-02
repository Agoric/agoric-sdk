// @ts-check

import { compareRank, Far, filterIterable } from '@agoric/marshal';
import { matches } from '../patterns/patternMatchers.js';

const { details: X, quote: q } = assert;

export const makeCursorKit = (
  assertOkToWrite,
  assertOkToDelete = undefined,
  keyName = 'key',
) => {
  let updateCount = 0;

  const cursorKit = harden({
    assertUpdateOnWrite: (k, v) => {
      assertOkToWrite(k, v);
      updateCount += 1;
    },

    assertUpdateOnDelete: assertOkToDelete
      ? k => {
          assertOkToDelete(k);
          updateCount += 1;
        }
      : () => {
          updateCount += 1;
        },

    makeArray: (baseIterable, pattern = undefined) => {
      const currentUpdateCount = updateCount;
      const notStaleFilter = () => {
        assert.equal(
          currentUpdateCount,
          updateCount,
          X`MapStore ${q(keyName)} cursor stale`,
        );
        return true;
      };
      const filter = pattern
        ? val => notStaleFilter() && matches(val, pattern)
        : notStaleFilter;

      // TODO In an implementation where the baseIterable returns its data
      // already rank sorted, `filtered` would be returned by `makeCursor`
      // as the cursor and makeArray would be a snapshot of that. However,
      // to get the correct external behavior on non-ordered representation,
      // we sort here and then return a cursor built from it.
      const filtered = filterIterable(baseIterable, filter);
      const compareHardened = (x, y) => compareRank(harden(x), harden(y));
      return harden([...filtered].sort(compareHardened));
    },

    makeCursor: (baseIterable, pattern = undefined) => {
      const sorted = cursorKit.makeArray(baseIterable, pattern);
      return Far('cursor iterable', {
        [Symbol.iterator]() {
          return sorted[Symbol.iterator]();
        },
      });
    },
  });
  return cursorKit;
};
harden(makeCursorKit);
