// @ts-check
import { test } from './prepare-test-env-ava.js';

import { Far } from '../src/make-far.js';
import { makeTagged } from '../src/makeTagged.js';
import {
  FullRankCover,
  compareRank,
  isRankSorted,
  sortByRank,
  getIndexCover,
  getPassStyleCover,
  assertRankSorted,
} from '../src/rankOrder.js';

const { quote: q } = assert;

/**
 * The only elements with identity. Everything else should be equal
 * by contents.
 */
const alice = Far('alice', {});
const bob = Far('bob', {});
const carol = Far('carol', {});

/**
 * An unordered copyArray of some passables
 */
const sample = harden([
  makeTagged('copySet', [
    ['b', 3],
    ['a', 4],
  ]),
  'foo',
  3n,
  'barr',
  undefined,
  [5, { foo: 4 }],
  2,
  null,
  [5, { foo: 4, bar: null }],
  bob,
  0,
  makeTagged('copySet', [
    ['a', 4],
    ['b', 3],
  ]),
  NaN,
  true,
  undefined,
  [5],
  alice,
  [],
  Symbol.for('foo'),
  new Error('not erroneous'),
  Symbol.for('@@foo'),
  [5, { bar: 5 }],
  Symbol.for(''),
  false,
  carol,
  -0,
  {},
  [5, undefined],
  -3,
  makeTagged('copyMap', [
    ['a', 4],
    ['b', 3],
  ]),
  true,
  'bar',
  [5, null],
  new Promise(() => {}), // forever unresolved
  makeTagged('nonsense', [
    ['a', 4],
    ['b', 3],
  ]),
  Symbol.isConcatSpreadable,
  [5, { foo: 4, bar: undefined }],
  Promise.resolve('fulfillment'),
  [5, { foo: 4 }],
]);

const rejectedP = Promise.reject(new Error('broken'));
rejectedP.catch(() => {}); // Suppress unhandled rejection warning/error

/**
 * The correctly stable rank sorting of `sample`
 */
const sortedSample = harden([
  null,
  false,
  true,
  true,

  // -0 is equivalent enough to 0. NaN after all numbers.
  -3,
  -0,
  0,
  2,
  NaN,

  3n,

  // Lexicographic strings. Shorter beats longer.
  // TODO Probe UTF-16 vs Unicode vs UTF-8 (Moddable) ordering.
  'bar',
  'barr',
  'foo',

  Symbol.for(''),
  Symbol.for('@@foo'),
  Symbol.isConcatSpreadable,
  Symbol.for('foo'),

  {},

  // Lexicographic arrays. Shorter beats longer.
  [],
  [5],
  [5, null],
  // Lexicographic records by reverse sorted property name, then by values
  // in that order.
  [5, { bar: 5 }],
  [5, { foo: 4 }],
  [5, { foo: 4 }],
  [5, { foo: 4, bar: null }],
  [5, { foo: 4, bar: undefined }],
  [5, undefined],

  // Lexicographic tagged: tag then payload
  makeTagged('copyMap', [
    ['a', 4],
    ['b', 3],
  ]),
  makeTagged('copySet', [
    ['a', 4],
    ['b', 3],
  ]),
  // Doesn't care if a valid copySet
  makeTagged('copySet', [
    ['b', 3],
    ['a', 4],
  ]),
  // Doesn't care if a recognized tagged tag
  makeTagged('nonsense', [
    ['a', 4],
    ['b', 3],
  ]),

  // All remotables are tied for the same rank and the sort is stable,
  // so their relative order is preserved
  bob,
  alice,
  carol,

  // All errors are tied. All promises are tied.
  // They support no finer equivalence check.
  new Error('different'),
  rejectedP,
  rejectedP,

  undefined,
  undefined,
]);

test('compare and sort by rank', t => {
  assertRankSorted(sortedSample, compareRank);
  t.false(isRankSorted(sample, compareRank));
  const sorted = sortByRank(sample, compareRank);
  t.is(
    compareRank(sorted, sortedSample),
    0,
    `Not sorted as expected: ${q(sorted)}`,
  );
});

const rangeSample = harden([
  {}, // 0 -- prefix are earlier, so empty is earliest
  { bar: null }, // 1
  { bar: undefined }, // 2 -- records with same names grouped together
  { foo: 'x' }, // 3 -- name subsets before supersets
  { bar: null, foo: 'x' }, // 4
  { bar: 'y', foo: 'x' }, // 5
  { bar: 'y', foo: 'x' }, // 6
  { bar: undefined, foo: 'x' }, // 7
  { bar: 'y', foo: 'y' }, // 8 -- reverse sort so foo: tested before bar:

  ['a'], // 9
  ['a', 'b'], // 10
  ['a', 'x'], // 11
  ['y', 'x'], // 12

  makeTagged('', null), // 13
]);

/** @type {[RankCover, IndexCover][]} */
const queries = harden([
  [
    [['c'], ['c']],
    // first > last implies absent.
    [12, 11],
  ],
  [
    [['a'], ['a', undefined]],
    [9, 11],
  ],
  [
    [
      ['a', null],
      ['a', undefined],
    ],
    [10, 11],
  ],
  [FullRankCover, [0, 13]],
  [getPassStyleCover('string'), [0, -1]],
  [getPassStyleCover('copyRecord'), [0, 8]],
  [getPassStyleCover('copyArray'), [9, 13]], // cover includes non-array
  [getPassStyleCover('remotable'), [14, 13]],
]);

test('range queries', t => {
  t.assert(isRankSorted(rangeSample, compareRank));
  for (const [rankCover, indexRange] of queries) {
    const range = getIndexCover(rangeSample, compareRank, rankCover);
    t.is(range[0], indexRange[0]);
    t.is(range[1], indexRange[1]);
  }
});
