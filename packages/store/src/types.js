// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @typedef {Object} StoreOptions
 * Of the dimensions on which KeyedStores can differ, we only represent a few
 * of them as standard options. A given store maker should document which
 * options it supports, as well as its positions on dimensions for which it
 * does not support options.
 * @property {boolean=} longLived Which way to optimize a weak store. True means
 * that we expect this weak store to outlive most of its keys, in which
 * case we internally may use a JavaScript `WeakMap`. Otherwise we internally
 * may use a JavaScript `Map`.
 * Defaults to true, so please mark short lived stores explicitly.
 * @property {Pattern=} schema The store will reject
 * the insertion of any content that does not match the schema pattern.
 * For a SetStore, this is a key pattern.
 * For a MapStore, this is an entry pattern,
 * i.e., a pattern over `[key,value]` pairs.
 * Defaults to `M.any()`.
 */

/** @typedef {"forward" | "reverse"} Direction */

/**
 * Most store methods are in one of three categories
 *   * lookup methods (`has`,`get`)
 *   * update methods (`add`,`init`,`set`,`delete`,`addAll`)
 *   * query methods (`snapshot`,`keys`,`values`,`entries`,`cursor`)
 *
 * WeakStores have the lookup and update methods but not the query methods.
 * non-weak Stores and like their corresponding WeakStore, but with the
 * additional query methods.
 */

/**
 * @template K
 * @typedef {Object} WeakSetStore
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this store.
 * @property {(key: K) => void} add
 * Add the key to the set if it is not already there. Do nothing silently if
 * already there.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 * @property {(copySet: CopySet) => void} addAll
 */

/**
 * @template K
 * @typedef {Object} SetStore
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this store.
 * @property {(key: K) => void} add
 * Add the key to the set if it is not already there. Do nothing silently if
 * already there.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 * @property {(copySet: CopySet) => void} addAll
 * @property {(keyPatt?: Pattern) => CopySet} snapshot
 * @property {(keyPatt?: Pattern) => K[]} keys
 * @property {(keyPatt?: Pattern, direction?: Direction) => Iterable<K>} cursor
 */

/**
 * @template K,V
 * @typedef {Object} WeakMapStore
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this store.
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it doesn't already exist.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 * @property {(copyMap: CopyMap) => void} addAll
 */

/**
 * @template K,V
 * @typedef {Object} MapStore
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this map
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it doesn't already exist.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 * @property {(copyMap: CopyMap) => void} addAll
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => CopyMap} snapshot
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => K[]} keys
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => V[]} values
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern) => [K,V][]} entries
 * @property {(keyPatt?: Pattern, valuePatt?: Pattern,
 *             direction?: Direction
 * ) => Iterable<[K,V]>} cursor
 */

// ////////////////////// Rank types (should be internal-types) ///////////

/**
 * @callback CompareRank
 * Returns `-1`, `0`, or `1` depending on whether the rank of `left`
 * is before, tied-with, or after the rank of `right`.
 *
 * This comparison function is valid as argument to
 * `Array.prototype.sort`. This is often described as a "total order"
 * but, depending on your definitions, this is technically incorrect
 * because it may return `0` to indicate that two distinguishable elements,
 * like `-0` and `0`, are tied, i.e., are in the same equivalence class
 * as far as this ordering is concerned. If each such equivalence class is
 * a *rank* and ranks are disjoint, then this "rank order" is a
 * total order among these ranks. In mathematics this goes by several
 * other names such as "total preorder".
 *
 * This function establishes a total rank order over all passables.
 * To do so it makes arbitrary choices, such as that all strings
 * are after all numbers. Thus, this order is not intended to be
 * used directly as a comparison with useful semantics. However, it must be
 * closely enough related to such comparisons to aid in implementing
 * lookups based on those comparisons. For example, in order to get a total
 * order among ranks, we put `NaN` after all other JavaScript "number" values.
 * But otherwise, we order JavaScript numbers by magnitude,
 * with `-0` tied with `0`. A semantically useful ordering of JavaScript number
 * values, i.e., IEEE floating point values, would compare magnitudes, and
 * so agree with the rank ordering everywhere except `NaN`. An array sorted by
 * rank would enable range queries by magnitude.
 * @param {Passable} left
 * @param {Passable} right
 * @returns {-1 | 0 | 1}
 */

/**
 * @typedef {Object} ComparatorKit
 * @property {CompareRank} comparator
 * @property {CompareRank} antiComparator
 */

/**
 * @typedef {[string, string]} RankCover
 */

/**
 * @typedef {[number, number]} IndexCover
 */

/**
 * @callback GetPassStyleCover
 * Associate with each passStyle a RankCover that may be an overestimate,
 * and whose results therefore need to be filtered down. For example, because
 * there is not a smallest or biggest bigint, bound it by `NaN` (the last place
 * number) and `''` (the empty string, which is the first place string). Thus,
 * a range query using this range may include these values, which would then
 * need to be filtered out.
 * @param {PassStyle} passStyle
 * @returns {RankCover}
 */

/**
 * @callback GetIndexCover
 * @param {Passable[]} sorted
 * @param {CompareRank} compare
 * @param {RankCover} rankCover
 * @returns {IndexCover}
 */

/**
 * @callback CoveredEntries
 * @param {Passable[]} sorted
 * @param {IndexCover} indexCover
 * @returns {Iterable<[number, Passable]>}
 */

// ///////////////////////// Deprecated Legacy /////////////////////////////////

/**
 * @template K,V
 * @typedef {Object} LegacyWeakMapStore
 * LegacyWeakMapStore is deprecated. Use WeakMapStore instead.
 * @property {(key: K) => boolean} has
 * Check if a key exists
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it
 * doesn't already exist
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 */

/**
 * @template K,V
 * @typedef {Object} LegacyMapStore
 * LegacyWeakMapStore is deprecated. Use WeakMapStore instead.
 * @property {(key: K) => boolean} has
 * Check if a key exists
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it
 * doesn't already exist
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 * @property {() => K[]} keys
 * @property {() => V[]} values
 * @property {() => [K,V][]} entries
 */

// /////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {Passable} Key
 */

/**
 * @typedef {Passable} Pattern
 * Patterns can be either Keys or Matchers
 */

/**
 * @typedef {CopyTagged} CopySet
 */

/**
 * @typedef {CopyTagged} CopyMap
 */

/**
 * @typedef {CopyTagged} Matcher
 */

/**
 * @callback CheckMatches
 * @param {Passable} specimen
 * @param {Pattern} pattern
 * @param {Checker=} check
 */

/**
 * @callback CheckPattern
 * @param {Passable} allegedPattern
 * @param {Checker=} check
 * @returns {boolean}
 */

/**
 * @callback CheckKeyPattern
 * @param {Passable} allegedPattern
 * @param {Checker=} check
 * @returns {boolean}
 */

/**
 * @callback KeyToDBKeyMaybe
 * If this key can be encoded as a DBKey string which sorts correctly,
 * return that string. Else return `undefined`. For example, a scalar-only
 * encodeKey would return `undefined` for all non-scalar keys.
 * @param {Passable} key
 * @returns {string=}
 */

/**
 * @callback GetRankCover
 * @param {Pattern} pattern
 * @param {KeyToDBKeyMaybe} encodeKey
 * @returns {RankCover}
 */

/**
 * @typedef {Object} PatternMatcher
 * @property {GetRankCover} getRankCover
 */

// /////////////////////////////////////////////////////////////////////////////

// TODO
// The following commented out type should be in internal-types.js, since the
// `MatchHelper` type is purely internal to this package. However,
// in order to get the governance and solo packages both to pass lint,
// I moved the type declaration itself to types.js. See the comment sin
// in internal-types.js and exports.js

/**
 * @typedef {Object} MatchHelper
 * This factors out only the parts specific to each kind of Matcher. It is
 * encapsulated, and its methods can make the stated unchecker assumptions
 * enforced by the common calling logic.
 *
 * @property {(allegedPayload: Passable,
 *             check?: Checker
 * ) => boolean} checkIsMatcherPayload
 * Assumes this is the payload of a CopyTagged with the corresponding
 * matchTag. Is this a valid payload for a Matcher with that tag?
 *
 * @property {(specimen: Passable,
 *             matcherPayload: Passable,
 *             check?: Checker
 * ) => boolean} checkMatches
 * Assuming a valid Matcher of this type with `matcherPayload` as its
 * payload, does this specimen match that Matcher?
 *
 * @property {(
 *   payload: Passable,
 *   encodeKey: KeyToDBKeyMaybe
 * ) => RankCover} getRankCover
 * Assumes this is the payload of a CopyTagged with the corresponding
 * matchTag. Return a RankCover to bound from below and above,
 * in rank order, all possible Passables that would match this Matcher.
 * The left element must be before or the same rank as any possible
 * matching specimen. The right element must be after or the same
 * rank as any possible matching specimen.
 *
 * @property {(allegedPattern: Passable,
 *             check?: Checker
 * ) => boolean} checkKeyPattern
 * Assumes this is the payload of a CopyTagged with the corresponding
 * matchTag. Is this a valid pattern for use as a query key or key schema?
 */
