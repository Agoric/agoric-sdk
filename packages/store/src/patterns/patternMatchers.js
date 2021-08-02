// // @ts-check

// import {
//   everyPassableChild,
//   FullRankCover,
//   leftmostRank,
//   rightmostRank,
//   somePassableChild,
// } from '@agoric/marshal';
// import {
//   compareKeys,
//   getKeyKindCover,
//   getRankCover,
//   isKey,
//   keyKindOf,
//   match,
//   patternKindOf,
// } from './compareKeys.js';

// // eslint-disable-next-line spaced-comment
// /// <reference types="ses"/>

// import './internal-types.js';
// /**
//  * @typedef {import('./internal-types.js').Matcher} Matcher
//  */

// const { details: X } = assert;

// /** @type {Matcher} */
// export const MatchAny = harden({
//   passStyleName: 'tagged',
//   keyKindName: undefined,
//   patternKindName: 'match:any',

//   doIsKey: () => false,

//   doIsPattern: matchAny => matchAny.playload === undefined,

//   doCompareKeys: (left, _) =>
//     assert.fail(X`A match:any cannot be a key: ${left}`),

//   doMatch: (_matchAny, _) => true,

//   doGetRankCover: _matchAny => FullRankCover,
// });

// /** @type {Matcher} */
// export const MatchKeyKind = harden({
//   passStyleName: 'tagged',
//   keyKindName: undefined,
//   patternKindName: 'match:keyKind',

//   doIsKey: () => false,

//   doIsPattern: matchKeyKind =>
//     // TODO should check that it is a valid keyKind name
//     typeof matchKeyKind.playload === 'string',

//   doCompareKeys: (left, _) =>
//     assert.fail(X`A match:keyKind cannot be a key: ${left}`),

//   doMatch: (matchKeyKind, specimen) =>
//     keyKindOf(specimen) === matchKeyKind.payload,

//   doGetRankCover: matchKeyKind => getKeyKindCover(matchKeyKind.payload),
// });

// /** @type {Matcher} */
// export const MatchAnd = harden({
//   passStyleName: 'tagged',
//   keyKindName: undefined,
//   patternKindName: 'match:and',

//   doIsKey: () => false,

//   doIsPattern: matchAnd => {
//     const { payload } = matchAnd;
//     return patternKindOf(payload) === 'copyArray';
//   },

//   doCompareKeys: (left, _) =>
//     assert.fail(X`A match:and cannot be a key: ${left}`),

//   doMatch: (matchAnd, specimen) =>
//     everyPassableChild(matchAnd.payload, pattern => match(pattern, specimen)),

//   doGetRankCover: matchAnd => {
//     const { payload } = matchAnd;
//     const covers = payload.map(getRankCover);
//     const leftBounds = covers.map(cover => cover[0]);
//     const rightBounds = covers.map(cover => cover[1]);
//     return harden([rightmostRank(leftBounds), leftmostRank(rightBounds)]);
//   },
// });

// /** @type {Matcher} */
// export const MatchOr = harden({
//   passStyleName: 'tagged',
//   keyKindName: undefined,
//   patternKindName: 'match:or',

//   doIsKey: () => false,

//   doIsPattern: matchOr => {
//     const { payload } = matchOr;
//     return patternKindOf(payload) === 'copyArray';
//   },

//   doCompareKeys: (left, _) =>
//     assert.fail(X`A match:and cannot be a key: ${left}`),

//   doMatch: (matchOr, specimen) =>
//     somePassableChild(matchOr.payload, pattern => match(pattern, specimen)),

//   doGetRankCover: matchOr => {
//     const { payload } = matchOr;
//     const covers = payload.map(getRankCover);
//     const leftBounds = covers.map(cover => cover[0]);
//     const rightBounds = covers.map(cover => cover[1]);
//     return harden([leftmostRank(leftBounds), rightmostRank(rightBounds)]);
//   },
// });

// /** @type {Matcher} */
// export const MatchGTE = harden({
//   passStyleName: 'tagged',
//   keyKindName: undefined,
//   patternKindName: 'match:gte',

//   doIsKey: () => false,

//   doIsPattern: matchGTE => {
//     const { rightSide } = matchGTE;
//     return 'rightSide' in matchGTE && isKey(rightSide);
//   },

//   doCompareKeys: (left, _) =>
//     assert.fail(X`A match:gte cannot be a key: ${left}`),

//   doMatch: (matchGTE, specimen) => {
//     const comp = compareKeys(specimen, matchGTE.rightSide);
//     return comp !== undefined && comp >= 0;
//   },

//   doGetRankCover: matchGTE => {
//     const { rightSide } = matchGTE;
//     const keyKind = keyKindOf(rightSide);
//     assert.typeof(keyKind, 'string');
//     const [_, rightBound] = getKeyKindCover(keyKind);
//     // TODO This translation from key compare to rank compare is not sound
//     // for copySet.
//     return harden([rightSide, rightBound]);
//   },
// });

// /** @type {Matcher} */
// export const MatchLTE = harden({
//   passStyleName: 'tagged',
//   keyKindName: undefined,
//   patternKindName: 'match:lte',

//   doIsKey: () => false,

//   doIsPattern: matchLTE => {
//     const { rightSide } = matchLTE;
//     return 'rightSide' in matchLTE && isKey(rightSide);
//   },

//   doCompareKeys: (left, _) =>
//     assert.fail(X`A match:lte cannot be a key: ${left}`),

//   doMatch: (matchLTE, specimen) => {
//     const comp = compareKeys(specimen, matchLTE.rightSide);
//     return comp !== undefined && comp <= 0;
//   },

//   doGetRankCover: matchLTE => {
//     const { rightSide } = matchLTE;
//     const keyKind = keyKindOf(rightSide);
//     assert.typeof(keyKind, 'string');
//     const [leftBound, _] = getKeyKindCover(keyKind);
//     // TODO This translation from key compare to rank compare is not sound
//     // for copySet.
//     return harden([leftBound, rightSide]);
//   },
// });

// /**
//  * @param {Pattern} pattern
//  * @param {Passable} specimen
//  * @returns {boolean}
//  */
// export const match = (pattern, specimen) => {
//   if (isKey(pattern)) {
//     return isKey(specimen) && sameKey(pattern, specimen);
//   }
//   const patternKind = patternKindOf(pattern);
//   switch (patternKind) {
//     case 'copyArray': {
//       return CopyArrayMatcher.doMatch(pattern, specimen);
//     }
//     default: {
//       return false;
//     }
//   }
// };
// harden(match);

// /**
//  * @param {Pattern} pattern
//  * @returns {RankCover}
//  */
// export const getRankCover = pattern => {
//   if (isKey(pattern)) {
//     return harden([pattern, pattern]);
//   }
//   const patternKind = patternKindOf(pattern);
//   switch (patternKind) {
//     case 'copyArray': {
//       return CopyArrayMatcher.doGetRankCover(pattern);
//     }
//     default: {
//       return FullRankCover;
//     }
//   }
// };
// harden(getRankCover);

// /**
//  * @param {KeyKind} keyKind
//  * @returns {RankCover}
//  */
// export const getKeyKindCover = keyKind => {
//   switch (keyKind) {
//     case 'undefined':
//     case 'null':
//     case 'boolean':
//     case 'number':
//     case 'bigint':
//     case 'string':
//     case 'symbol':
//     case 'copyRecord':
//     case 'copyArray':
//     case 'remotable': {
//       return getPassStyleCover(keyKind);
//     }
//     case 'copySet':
//     case 'copyMap': {
//       return harden([
//         makeTagged(keyKind, null),
//         makeTagged(keyKind, undefined),
//       ]);
//     }
//     default: {
//       return FullRankCover;
//     }
//   }
// };
// harden(getKeyKindCover);
