// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { passStyleOf, getTag } from '@agoric/marshal';
import { compareRank } from '../patterns/rankOrder.js';
import { assertKey } from './checkKey.js';

const { details: X, quote: q } = assert;
const { ownKeys } = Reflect;

/**
 * `compareKeys` implements a partial order over keys. As with the
 * rank ordering produced by `compareRank`, -1, 0, and 1 mean
 * "less than", "equivalent to", and "greater than" respectively.
 * NaN means "incomparable" --- the first key is not less, equivalent,
 * or greater than the second. For example, subsets over sets is
 * a partial order.
 *
 * By using NaN for "incomparable", the normal equivalence for using
 * the return value in a comparison is preserved.
 * `compareKeys(left, right) >= 0` iff `left` is greater than or
 * equivalent to `right` in the partial ordering.
 * `compareKeys` is currently not exported directly, so its
 * bizarre but convenient return type is not exposed.
 *
 * Key order (a partial order) and rank order (a full order) are
 * co-designed so that we store passables in rank order and index into them
 * with keys for key-based queries. To keep these distinct, when speaking
 * informally about rank, we talk about "earlier" and "later". When speaking
 * informally about keys, we talk about "smaller" and "bigger".
 *
 * In both orders, the return-0 case defines
 * an equivalence class, i.e., those that are tied for the same place in the
 * order. The global invariant that we need between the two orders is that the
 * key order equivalence class is always at least as precise as the
 * rank order equivalence class. IOW, if `compareKeys(X,Y) === 0` then
 * `compareRank(X,Y) === 0`. But not vice versa. For example, two different
 * remotables are the same rank but incommensurate as keys.
 *
 * A further invariant is if `compareKeys(X,Y) < 0` then
 * `compareRank(X,Y) <= 0`, i.e., if X is smaller than Y in key order, then X
 * must be at least as early as Y in rank order. But not vice versa.
 * X can be earlier than Y in rank order and still be incommensurate with Y in
 * key order. For example, the records `{b: 3, a: 5}` is earlier than but
 * incommensurate with the record `{b: 5, a: 3}`.
 *
 * This lets us translate a range search over the
 * partial key order into a range search over rank order followed by filtering
 * out those that don't match. To get this effect, we store the elements of
 * a set in an array sorted in reverse rank order, from later to earlier.
 * Combined with our lexicographic comparison of arrays, if set X is a subset
 * of set Y then the array representing set X will be an earlier rank that the
 * array representing set Y.
 *
 * @param {Key} left
 * @param {Key} right
 * @returns {-1 | 0 | 1 | NaN}
 */
export const compareKeys = (left, right) => {
  assertKey(left);
  assertKey(right);
  const leftStyle = passStyleOf(left);
  const rightStyle = passStyleOf(right);
  if (leftStyle !== rightStyle) {
    // Different passStyles are incommensurate
    return NaN;
  }
  switch (leftStyle) {
    case 'undefined':
    case 'null':
    case 'boolean':
    case 'bigint':
    case 'string':
    case 'symbol': {
      // for these, keys compare the same as rank
      return compareRank(left, right);
    }
    case 'number': {
      const rankComp = compareRank(left, right);
      if (rankComp === 0) {
        return 0;
      }
      if (Number.isNaN(left) || Number.isNaN(right)) {
        // NaN is equal to itself, but incommensurate with everything else
        assert(!Number.isNaN(left) || !Number.isNaN(right));
        return NaN;
      }
      // Among non-NaN numbers, key order is the same as rank order. Note that
      // in both orders, `-0` is in the same equivalence class as `0`.
      return rankComp;
    }
    case 'remotable': {
      if (left === right) {
        return 0;
      }
      // If two remotables are not identical, then as keys they are
      // incommensurate.
      return NaN;
    }
    case 'copyArray': {
      // Lexicographic by key order. Rank order of arrays is lexicographic by
      // rank order.
      // Because the invariants above apply to the elements of the array,
      // they apply to the array as a whole.
      const len = Math.min(left.length, right.length);
      for (let i = 0; i < len; i += 1) {
        const result = compareKeys(left[i], right[i]);
        if (result !== 0) {
          return result;
        }
      }
      // If all matching elements are keyEQ, then according to their lengths.
      // Thus, if array X is a prefix of array Y, then X is smaller than Y.
      return compareRank(left.length, right.length);
    }
    case 'copyRecord': {
      // Pareto partial order comparison.
      const leftNames = harden(ownKeys(left).sort());
      const rightNames = harden(ownKeys(right).sort());
      // eslint-disable-next-line no-use-before-define
      if (!keyEQ(leftNames, rightNames)) {
        // If they do not have exactly the same properties,
        // they are incommensurate.
        // Note that rank sorting of copyRecords groups all copyRecords with
        // the same keys together, enabling range searching over copyRecords
        // to avoid more irrelevant ones.
        return NaN;
      }
      let result = 0; // start with hypothesis they are keyEQ
      for (const name of leftNames) {
        const comp = compareKeys(left[name], right[name]);
        if (Number.isNaN(comp)) {
          return NaN;
        }
        if (result !== comp && comp !== 0) {
          if (result === 0) {
            result = comp;
          } else {
            assert(
              (result === -1 && comp === 1) || (result === 1 && comp === -1),
            );
            return NaN;
          }
        }
      }
      // If copyRecord X is smaller than copyRecord Y, then they must have the
      // same property names, and every value is X must be smaller or equal to
      // every corresponding value in Y. The rank order of X and Y is based
      // on lexicographic rank order of their values, as organized by the
      // reverse order of their property names. Thus
      // if compareKeys(X,Y) < 0 then compareRank(X,Y) <= 0.
      return result;
    }
    case 'tagged': {
      const leftTag = getTag(left);
      const rightTag = getTag(right);
      if (leftTag !== rightTag) {
        // different tags are incommensurate
        return NaN;
      }
      switch (leftTag) {
        case 'copySet': {
          // copySet X is smaller than copySet Y when every element of X
          // is keyEQ to some element of Y.
          // The following algorithm is good when there are few elements tied
          // for the same rank. But it is O(N*M) in the size of these ties.
          // Sets of remotables are a particularly bad case. For these, some
          // kind of hash table (scalar set or map) should be used instead.

          // TODO to get something working, I am currently implementing
          // only the special case where there are no rank-order ties.

          let result = 0; // start with the hypothesis they are keyEQ.
          const xs = left.payload;
          const ys = right.payload;
          const xlen = xs.length;
          const ylen = ys.length;
          let xi = 0;
          let yi = 0;
          while (xi < xlen && yi < ylen) {
            const x = xs[xi];
            const y = ys[yi];
            if (xi + 1 < xlen && compareRank(x, xs[xi + 1]) === 0) {
              assert.fail(X`sets with rank ties not yet implemented: ${left}`);
            }
            if (yi + 1 < ylen && compareRank(y, ys[yi + 1]) === 0) {
              assert.fail(X`sets with rank ties not yet implemented: ${right}`);
            }
            const comp = compareKeys(x, y);
            if (Number.isNaN(comp)) {
              // If they are incommensurate, then each element is not in the
              // other set, so the sets are incommensurate.
              return NaN;
            } else if (comp === 0) {
              //
              xi += 1;
              yi += 1;
            } else {
              if (result !== comp) {
                if (result === 0) {
                  result = comp;
                } else {
                  assert(
                    (result === -1 && comp === 1) ||
                      (result === 1 && comp === -1),
                  );
                  return NaN;
                }
              }
              if (comp === 1) {
                xi += 1;
              } else {
                assert(comp === -1);
                yi += 1;
              }
            }
          }
          const comp = compareKeys(xlen, ylen);
          if (comp === 0) {
            return result;
          } else if (result === 0 || result === comp) {
            return comp;
          } else {
            assert(
              (result === -1 && comp === 1) || (result === 1 && comp === -1),
            );
            return NaN;
          }
        }
        case 'copyMap': {
          // Two copyMaps that have different keys (according to keyEQ) are
          // incomensurate. The representation of copyMaps includes the keys
          // first, in the same reverse rank order used by sets. Thus, all
          // copyMaps with keys of the same rank (which is
          // less precise!) will be grouped together when copyMaps are sorted
          // by rank, minimizing the number of misses when range searching.
          //
          // Among copyMaps with the same keys (according to keyEQ), they
          // compare by a parento comparison of their values. Thus, as with
          // records, for two copyMaps X and Y, if `compareKeys(X,Y) < 0`
          // then, because these values obey the above invariants,
          // none of the values in X have a later rank than the corresponding
          // value of Y. Thus, `compareRank(X,Y) <= 0`.
          // TODO implement
          assert.fail(
            X`Map comparison not yet implemented: ${left} vs ${right}`,
          );
        }
        default: {
          assert.fail(X`unexpected tag ${q(leftTag)}: ${left}`);
        }
      }
    }
    default: {
      assert.fail(X`unexpected passStyle ${q(leftStyle)}: ${left}`);
    }
  }
};
harden(compareKeys);

export const keyLT = (left, right) => compareKeys(left, right) < 0;
harden(keyLT);

export const keyLTE = (left, right) => compareKeys(left, right) <= 0;
harden(keyLTE);

export const keyEQ = (left, right) => compareKeys(left, right) === 0;
harden(keyEQ);

export const keyGTE = (left, right) => compareKeys(left, right) >= 0;
harden(keyGTE);

export const keyGT = (left, right) => compareKeys(left, right) > 0;
harden(keyGT);
