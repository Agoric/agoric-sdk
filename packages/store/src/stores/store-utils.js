// @ts-check

import { filterIterable } from '@agoric/marshal';
import { matches } from '../patterns/patternMatchers.js';
import { assertRankSorted } from '../patterns/rankOrder.js';

const { details: X, quote: q } = assert;

export const makeCursorKit = (
  compare,
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
      const filter = pattern ? val => matches(harden(val), pattern) : harden;
      const filtered = filterIterable(baseIterable, filter);
      const sorted = harden([...filtered].sort(compare));
      assertRankSorted(sorted, compare);
      return sorted;
    },

    makeCursor: (baseIterable, pattern = undefined) => {
      const currentUpdateCount = updateCount;
      const notStaleFilter = () => {
        assert.equal(
          currentUpdateCount,
          updateCount,
          X`MapStore ${q(keyName)} cursor stale`,
        );
        return true;
      };

      // TODO In an implementation where the baseIterable returns its data
      // already rank sorted, `makeCursor` would use the following
      // code to make a cursor, and makeArray would be a snapshot of that.
      // However,
      // to get the correct external behavior on non-ordered representation,
      // we sort in makeArray instead and then makeCursor return a cursor built
      // from that.
      // const filter = pattern
      //   ? val => notStaleFilter() && matches(val, pattern)
      //   : notStaleFilter;
      // return filterIterable(baseIterable, filter);

      const sorted = cursorKit.makeArray(baseIterable, pattern);
      return filterIterable(sorted, notStaleFilter);
    },
  });
  return cursorKit;
};
harden(makeCursorKit);
