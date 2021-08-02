// @ts-check

import {
  everyPassableChild,
  FullRankCover,
  leftmostRank,
  rightmostRank,
  somePassableChild,
} from '@agoric/marshal';
import {
  compareKeys,
  getKeyStyleCover,
  getRankCover,
  isKey,
  keyStyleOf,
  match,
  patternStyleOf,
} from './compareKeys.js';

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import './internal-types.js';
/**
 * @typedef {import('./internal-types.js').Matcher} Matcher
 */

const { details: X } = assert;

/** @type {Matcher} */
export const MatchAny = harden({
  passStyleName: 'metaTagged',
  keyStyleName: undefined,
  patternStyleName: 'match:any',

  doIsKey: () => false,

  doIsPattern: matchAny => matchAny.playload === undefined,

  doCompareKeys: (left, _) =>
    assert.fail(X`A match:any cannot be a key: ${left}`),

  doMatch: (_matchAny, _) => true,

  doGetRankCover: _matchAny => FullRankCover,
});

/** @type {Matcher} */
export const MatchKeyStyle = harden({
  passStyleName: 'metaTagged',
  keyStyleName: undefined,
  patternStyleName: 'match:keyStyle',

  doIsKey: () => false,

  doIsPattern: matchKeyStyle =>
    // TODO should check that it is a valid keyStyle name
    typeof matchKeyStyle.playload === 'string',

  doCompareKeys: (left, _) =>
    assert.fail(X`A match:keyStyle cannot be a key: ${left}`),

  doMatch: (matchKeyStyle, specimen) =>
    keyStyleOf(specimen) === matchKeyStyle.payload,

  doGetRankCover: matchKeyStyle => getKeyStyleCover(matchKeyStyle.payload),
});

/** @type {Matcher} */
export const MatchAnd = harden({
  passStyleName: 'metaTagged',
  keyStyleName: undefined,
  patternStyleName: 'match:and',

  doIsKey: () => false,

  doIsPattern: matchAnd => {
    const { payload } = matchAnd;
    return patternStyleOf(payload) === 'copyArray';
  },

  doCompareKeys: (left, _) =>
    assert.fail(X`A match:and cannot be a key: ${left}`),

  doMatch: (matchAnd, specimen) =>
    everyPassableChild(matchAnd.payload, pattern => match(pattern, specimen)),

  doGetRankCover: matchAnd => {
    const { payload } = matchAnd;
    const covers = payload.map(getRankCover);
    const leftBounds = covers.map(cover => cover[0]);
    const rightBounds = covers.map(cover => cover[1]);
    return harden([rightmostRank(leftBounds), leftmostRank(rightBounds)]);
  },
});

/** @type {Matcher} */
export const MatchOr = harden({
  passStyleName: 'metaTagged',
  keyStyleName: undefined,
  patternStyleName: 'match:or',

  doIsKey: () => false,

  doIsPattern: matchOr => {
    const { payload } = matchOr;
    return patternStyleOf(payload) === 'copyArray';
  },

  doCompareKeys: (left, _) =>
    assert.fail(X`A match:and cannot be a key: ${left}`),

  doMatch: (matchOr, specimen) =>
    somePassableChild(matchOr.payload, pattern => match(pattern, specimen)),

  doGetRankCover: matchOr => {
    const { payload } = matchOr;
    const covers = payload.map(getRankCover);
    const leftBounds = covers.map(cover => cover[0]);
    const rightBounds = covers.map(cover => cover[1]);
    return harden([leftmostRank(leftBounds), rightmostRank(rightBounds)]);
  },
});

/** @type {Matcher} */
export const MatchGTE = harden({
  passStyleName: 'metaTagged',
  keyStyleName: undefined,
  patternStyleName: 'match:gte',

  doIsKey: () => false,

  doIsPattern: matchGTE => {
    const { rightSide } = matchGTE;
    return 'rightSide' in matchGTE && isKey(rightSide);
  },

  doCompareKeys: (left, _) =>
    assert.fail(X`A match:gte cannot be a key: ${left}`),

  doMatch: (matchGTE, specimen) => {
    const comp = compareKeys(specimen, matchGTE.rightSide);
    return comp !== undefined && comp >= 0;
  },

  doGetRankCover: matchGTE => {
    const { rightSide } = matchGTE;
    const keyStyle = keyStyleOf(rightSide);
    assert.typeof(keyStyle, 'string');
    const [_, rightBound] = getKeyStyleCover(keyStyle);
    // TODO This translation from key compare to rank compare is not sound
    // for copySet.
    return harden([rightSide, rightBound]);
  },
});

/** @type {Matcher} */
export const MatchLTE = harden({
  passStyleName: 'metaTagged',
  keyStyleName: undefined,
  patternStyleName: 'match:lte',

  doIsKey: () => false,

  doIsPattern: matchLTE => {
    const { rightSide } = matchLTE;
    return 'rightSide' in matchLTE && isKey(rightSide);
  },

  doCompareKeys: (left, _) =>
    assert.fail(X`A match:lte cannot be a key: ${left}`),

  doMatch: (matchLTE, specimen) => {
    const comp = compareKeys(specimen, matchLTE.rightSide);
    return comp !== undefined && comp <= 0;
  },

  doGetRankCover: matchLTE => {
    const { rightSide } = matchLTE;
    const keyStyle = keyStyleOf(rightSide);
    assert.typeof(keyStyle, 'string');
    const [leftBound, _] = getKeyStyleCover(keyStyle);
    // TODO This translation from key compare to rank compare is not sound
    // for copySet.
    return harden([leftBound, rightSide]);
  },
});
