// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import '../types.js';

/**
 * @typedef {Object} Matcher
 *
 * @property {PassStyle} passStyleName
 * @property {KeyStyle=} keyStyleName
 * @property {PatternStyle=} patternStyleName
 *
 * @property {(candidate: Passable) => boolean} doIsKey
 * Only called if `passStyleOf(candidate) === passStyleName`
 * Returning true means `keyStyleOf(candidate) === keyStyleName`
 *
 * @property {(candidate: Passable) => boolean} doIsPattern
 * Only called if `passStyleOf(candidate) === passStyleName`
 * Returning true means `patternStyleOf(candidate) === patternStyleName`
 *
 * @property {(left: Key, right: Key) => (-1 | 0 | 1 | undefined)} doCompareKeys
 * Only called if `doIsKey(left) && doIsKey(right)`.
 * Returning 0 means `sameKey(left, right)`
 *
 * @property {(pattern :Pattern, specimen: Passable) => boolean} doMatch
 * The specimen may be any Passable
 * Only called if `doIsPattern(pattern) && !isKey(pattern)`, since, if the
 * pattern is a key, then the generic `match` short circuits this to
 * `sameKey` via `compareKeys`.
 *
 * @property {(pattern: Pattern) => RankCover} doGetRankCover
 * Only called if `doIsPattern(pattern) && !isKey(pattern)`
 * Returns a `[leftBound, rightBound]` pair, where, for all passables `p`
 * `compareRank(p, leftBound) >= 0 && compareRank(p, rightBound) <= 0`.
 * This can be used to range search rank-sorted storage.
 */
