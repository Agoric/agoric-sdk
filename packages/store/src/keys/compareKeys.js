// @ts-check

/// <reference types="ses"/>

import { passStyleOf, getTag } from '@agoric/marshal';
import { compareRank } from '../patterns/rankOrder.js';
import { assertKey } from './checkKey.js';

const { details: X, quote: q } = assert;
const { ownKeys } = Reflect;

/** @type {KeyCompare} */
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
      // Presume that both copyRecords have the same key order
      // until encountering a property disproving that hypothesis.
      let result = 0;
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
      // same property names and every value in X must be smaller or equal to
      // the corresponding value in Y (with at least one value smaller).
      // The rank order of X and Y is based on lexicographic rank order of
      // their values, as organized by reverse lexicographic order of their
      // property names.
      // Thus if compareKeys(X,Y) < 0 then compareRank(X,Y) < 0.
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
          // is keyEQ to some element of Y and Y has at least one element
          // that no element of X is keyEQ to.
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
