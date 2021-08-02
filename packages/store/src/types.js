// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @typedef {Object} StoreOptions
 * Of the dimensions on which KeyedStores can differ, we only represent a few
 * of them as standard options. A given store maker should document which
 * options it supports, as well as its positions on dimensions for which it
 * does not support options.
 *
 * @property {boolean=} longLived Which way to optimize a weak store. True means
 * that we expect this weak store to outlive most of its keys, in which
 * case we internally may use a JavaScript `WeakMap`. Otherwise we internally may
 * use a JavaScript `Map`.
 * Defaults to true, so please mark short lived stores explicitly.
 *
 * @property {Pattern=} schema The store will reject
 * the insertion of any content that does not match the schema pattern.
 * For a SetStore, this is a key pattern.
 * For a MapStore, this is an entry pattern,
 * i.e., a pattern over `[key,value]` pairs.
 * Defaults to `M.any()`.
 */

/** @typedef {"forward" | "reverse"} Direction */

/**
 * @template K
 * @typedef {Object} WeakSetStore
 *
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this store.
 *
 * @property {(key: K) => void} add
 * Add the key to the set if it is not already there. Do nothing silently if
 * already there.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 */

/**
 * @template K
 * @typedef {Object} SetStore
 *
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this store.
 *
 * @property {(key: K) => void} add
 * Add the key to the set if it is not already there. Do nothing silently if
 * already there.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 *
 * @property {(keyPattern?: Pattern) => K[]} keys
 *
 * @property {(keyPattern?: Pattern) => CopySet} snapshot
 * @property {(copySet: CopySet) => void} addAll
 * @property {(keyPattern?: Pattern,
 *             direction?: Direction
 * ) => Iterable<K>} cursor
 */

/**
 * @template K,V
 * @typedef {Object} WeakMapStore
 *
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this store.
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 *
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it doesn't already exist.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 */

/**
 * @template K,V
 * @typedef {Object} MapStore
 *
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this map
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 *
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it doesn't already exist.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 *
 * @property {(keyPattern?: Pattern) => K[]} keys
 * @property {(valuePattern?: Pattern) => V[]} values
 * @property {(entryPattern?: Pattern) => [K,V][]} entries
 *
 * @property {(entryPattern?: Pattern) => CopyMap} snapshot
 * @property {(copyMap: CopyMap) => void} addAll
 * @property {(entryPattern?: Pattern,
 *             direction?: Direction
 * ) => Iterable<[K,V]>} cursor
 */

// ///////////////////////// Deprecated Legacy /////////////////////////////////

/**
 * @template K,V
 * @typedef {WeakMapStore<K,V>} WeakStore
 * Deprecated type name `WeakStore`. Use `WeakMapStore` instead.
 */

/**
 * @template K,V
 * @typedef {Object} Store
 * Deprecated type name `Store`. Use `MapStore` instead.
 *
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this map
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 *
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it doesn't already exist.
 * The key must be one allowed by this store. For example a scalar store only
 * allows primitives and remotables.
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 *
 * @property {(keyPattern?: Pattern) => K[]} keys
 * @property {(valuePattern?: Pattern) => V[]} values
 * @property {(entryPattern?: Pattern) => [K,V][]} entries
 */

/**
 * @template K,V
 * @typedef {Object} LegacyWeakMap
 * LegacyWeakMap is deprecated. Use WeakMapStore instead.
 *
 * @property {(key: K) => boolean} has
 * Check if a key exists
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 *
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
 * @callback MakeLegacyWeakMap
 *
 * @param {string} [keyName='key'] - the column name for the key
 * @returns {LegacyWeakMap}
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
 * @callback GetRankCover
 * @param {Pattern} pattern
 * @returns {RankCover}
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
 * @property {(payload: Passable) => RankCover} getRankCover
 * Assumes this is the payload of a CopyTagged with the corresponding
 * matchTag. Return a RankCover to bound from below and above,
 * in rank order, all possible Passables that would match this Matcher.
 * The left element must be before or the same rank as any possible
 * matching specimen. The right element must be after or the same
 * rank as any possible matching specimen.
 */
