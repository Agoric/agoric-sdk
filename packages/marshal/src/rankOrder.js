// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { getTag } from './helpers/passStyle-helpers.js';
import { nameForPassableSymbol } from './helpers/symbol.js';
import { Far } from './make-far.js';
import { makeCopyTagged, makeMetaTagged } from './makeTagged.js';
import { passStyleOf } from './passStyleOf.js';
import { sameValueZero } from './structure.js';

const {
  getOwnPropertyDescriptors,
  fromEntries,
  entries,
  setPrototypeOf,
} = Object;

const { ownKeys } = Reflect;

const firstSymbol = Symbol.for('');
const firstCopyTagged = makeCopyTagged('', null);
const aFar = Far('after copyTaggeds', {});
const anError = new Error('error sigil');
const aPromise = Promise.resolve('promise sigil');
const aMetaTagged = makeMetaTagged('metaTagged sigil', null);

/**
 * Aside from 'undefined', lists the PassStyles from `types.js` in the same
 * order as they are declared there. This list and that declaration must be
 * co-maintained.
 *
 * JavaScript `Array.prototype.sort` sorts all `undefined`s to the end of the
 * array without consulting the compare function. To avoid fighting with it,
 * we put `undefined` at the end, where it can serve as the end-sigil of the
 * ordering. In the same sense, `null` is the start-sigil of the ordering. This
 * is useful for range searches.
 *
 * @type {[PassStyle, RankCover][]}
 */
const PassStyleRankAndCover = harden([
  ['null', [null, null]], // only
  ['boolean', [false, true]], // exact
  ['number', [-Infinity, NaN]], // exact
  ['bigint', [NaN, '']], // over below, over above
  ['string', ['', firstSymbol]], // over above
  ['symbol', [firstSymbol, {}]], // over above
  ['copyRecord', [{}, []]], // over above
  ['copyArray', [[], firstCopyTagged]], // over above
  ['copyTagged', [firstCopyTagged, aFar]], // over above
  ['remotable', [aFar, aFar]], // all tied
  ['error', [anError, anError]], // all tied
  ['promise', [aPromise, aPromise]], // all tied
  ['metaTagged', [aMetaTagged, aMetaTagged]], // all tied
  ['undefined', [undefined, undefined]], // only
]);

const PassStyleRank = fromEntries(
  entries(PassStyleRankAndCover).map(([i, v]) => [v[0], Number(i)]),
);
setPrototypeOf(PassStyleRank, null);
harden(setPrototypeOf);

/** @type {GetPassStyleCover} */
export const getPassStyleCover = passStyle =>
  PassStyleRankAndCover[PassStyleRank[passStyle]][1];
harden(getPassStyleCover);

/** @type {CompareRank} */
export const compareRank = (left, right) => {
  if (sameValueZero(left, right)) {
    return 0;
  }
  const leftStyle = passStyleOf(left);
  const rightStyle = passStyleOf(right);
  if (leftStyle !== rightStyle) {
    return compareRank(PassStyleRank[leftStyle], PassStyleRank[rightStyle]);
  }
  switch (leftStyle) {
    case 'undefined':
    case 'null':
    case 'remotable':
    case 'error':
    case 'promise':
    case 'metaTagged': {
      // For each of these passStyles, all members of that passStyle are tied
      // for the same rank.
      return 0;
    }
    case 'boolean':
    case 'bigint':
    case 'string': {
      // Within each of these passStyles, the rank ordering agrees with
      // JavaScript's relational operators `<` and `>`.
      if (left < right) {
        return -1;
      } else {
        assert(left > right);
        return 1;
      }
    }
    case 'symbol': {
      return compareRank(
        nameForPassableSymbol(left),
        nameForPassableSymbol(right),
      );
    }
    case 'number': {
      // `NaN`'s rank is after all other numbers.
      if (Number.isNaN(left)) {
        assert(!Number.isNaN(right));
        return 1;
      } else if (Number.isNaN(right)) {
        return -1;
      }
      // Aside from that, the rank ordering agrees with JavaScript's
      // relational operators '<' and '>'.
      if (left < right) {
        return -1;
      } else {
        assert(left > right);
        return 1;
      }
    }
    case 'copyRecord': {
      // Lexicographic by sorted order of property names. This is the
      // same sort order of property names used by `marshal.js`.

      // The copyRecord invariants enforced by passStyleOf ensure that
      // all the property names are strings.
      // Deduplicate
      const allNames = /** @type {string[]} */ ([
        ...ownKeys(left),
        ...ownKeys(right),
      ]);
      const nameSet = new Set(allNames);
      // The default sort order is what we want for string property names.
      const names = [...nameSet.keys()].sort();
      const leftDescs = getOwnPropertyDescriptors(left);
      const rightDescs = getOwnPropertyDescriptors(right);
      for (const name of names) {
        // We do *not* get the properties with, for example, `left[name]`
        // because `name` may be, for example, `'toString'` which is present
        // in `right` but absent in `left`. We do *not* want one inherited
        // from `Object.prototype`. That's why we use the desciptors instead.
        // The copyRecord invariants enforced by `passStyleOf` ensure that
        // all these are data properties, not accessors.
        //
        // We interpret lexicographic order for records as absence being
        // identical to `null`, which therefore comes before all non-`null`
        // values. The empty record is therefore tied for first place with
        // all records with only null values.
        const leftVal = leftDescs[name] ? leftDescs[name].value : null;
        const rightVal = rightDescs[name] ? rightDescs[name].value : null;
        const result = compareRank(leftVal, rightVal);
        if (result !== 0) {
          return result;
        }
      }
      return 0;
    }
    case 'copyArray': {
      // Lexicographic
      const len = Math.min(left.length, right.length);
      for (let i = 0; i < len; i += 1) {
        const result = compareRank(left[i], right[i]);
        if (result !== 0) {
          return result;
        }
      }
      // If all matching elements were tied, then according to their lengths
      return compareRank(left.length, right.length);
    }
    case 'copyTagged': {
      // Lexicographic by `[Symbol.toStringTag]` then `.payload`.
      const labelComp = compareRank(getTag(left), getTag(right));
      if (labelComp !== 0) {
        return labelComp;
      }
      return compareRank(left.payload, right.payload);
    }
    default: {
      assert.fail(X`Unrecognized passStyle: ${q(leftStyle)}`);
    }
  }
};
harden(compareRank);

const sortedPassablesCache = new WeakSet();

/**
 * @param {Passable[]} passables
 * @returns {boolean}
 */
export const isRankSorted = passables => {
  if (sortedPassablesCache.has(passables)) {
    return true;
  }
  assert(passStyleOf(passables) === 'copyArray');
  for (let i = 1; i < passables.length; i += 1) {
    if (compareRank(passables[i - 1], passables[i]) >= 1) {
      return false;
    }
  }
  sortedPassablesCache.add(passables);
  return true;
};

/**
 * @param {Passable[]} sorted
 */
export const assertRankSorted = sorted =>
  assert(
    isRankSorted(sorted),
    // TODO assert on bug could lead to infinite recursion. Fix.
    // eslint-disable-next-line no-use-before-define
    X`Must be rank sorted: ${sorted} vs ${makeRankSorted(sorted)}`,
  );
harden(isRankSorted);

/**
 * @param {Passable[]} passables
 * @returns {Passable[]}
 */
export const makeRankSorted = passables => {
  if (isRankSorted(passables)) {
    return passables;
  }
  const sorted = harden([...passables].sort(compareRank));
  assertRankSorted(sorted);
  return sorted;
};
harden(makeRankSorted);

/**
 * See
 * https://en.wikipedia.org/wiki/Binary_search_algorithm#Procedure_for_finding_the_leftmost_element
 *
 * @param {Passable[]} sorted
 * @param {Passable} key
 * @param {("leftMost" | "rightMost")=} bias
 * @returns {number}
 */
const rankSearch = (sorted, key, bias = 'leftMost') => {
  assertRankSorted(sorted);
  let left = 0;
  let right = sorted.length;
  while (left < right) {
    const m = Math.floor((left + right) / 2);
    const comp = compareRank(sorted[m], key);
    if (comp <= -1 || (comp === 0 && bias === 'rightMost')) {
      left = m + 1;
    } else {
      assert(comp >= 1 || (comp === 0 && bias === 'leftMost'));
      right = m;
    }
  }
  return bias === 'leftMost' ? left : right - 1;
};

/** @type {GetIndexCover} */
export const getIndexCover = (sorted, [leftKey, rightKey]) => {
  assertRankSorted(sorted);
  assert(compareRank(leftKey, rightKey) <= 0);
  const leftIndex = rankSearch(sorted, leftKey, 'leftMost');
  const rightIndex = rankSearch(sorted, rightKey, 'rightMost');
  return [leftIndex, rightIndex];
};
harden(getIndexCover);

/** @type {RankCover} */
export const FullRankCover = harden([null, undefined]);

/** @type {CoveredEntries} */
export const coveredEntries = (sorted, [leftIndex, rightIndex]) => {
  /** @type {Iterable<[number, Passable]>} */
  const iterable = harden({
    [Symbol.iterator]: () => {
      let i = leftIndex;
      return harden({
        next: () => {
          if (i <= rightIndex) {
            const element = sorted[i];
            i += 1;
            return harden({ value: [i, element], done: false });
          } else {
            return harden({ value: undefined, done: true });
          }
        },
      });
    },
  });
  return iterable;
};
harden(coveredEntries);

const maxRank = (left, right) => (compareRank(left, right) <= 0 ? left : right);
const minRank = (left, right) => (compareRank(left, right) >= 0 ? left : right);

export const leftmostRank = passables => passables.reduce(minRank, undefined);
harden(leftmostRank);
export const rightmostRank = passables => passables.reduce(maxRank, null);
harden(rightmostRank);
