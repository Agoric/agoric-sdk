// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @typedef {Object} StoreOptions
 *
 * @property {boolean=} longLived Which way to optimize. True means that we
 * expect this store to outlive most of its keys, in which
 * case we internally may use a `WeakMap`. Otherwise we internally may
 * use a `Map`.
 * Defaults to true, so please mark short lived stores explicitly
 */

/**
 * @template {Key} K
 * @template {Passable} V
 * @typedef {Object} Store
 *
 * @property {(key: any) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this map
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it doesn't already exist. The key must
 * be one allowed by this map. For example a scalarMap only allows
 * primitives and remotables.
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 * @property {() => K[]} keys - Return an array of keys
 * @property {() => V[]} values - Return an array of values
 * @property {() => [K, V][]} entries - Return an array of entries
 */

/**
 * @template {Key} K
 * @template {Passable} V
 * @typedef {Object} WeakStore
 *
 * @property {(key: K) => boolean} has
 * Check if a key exists. The key can be any JavaScript value, though the
 * answer will always be false for keys that cannot be found in this map
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it doesn't already exist. The key must
 * be one allowed by this map. For example a scalarMap only allows
 * primitives and remotables. For now, a scalarWeakMap allows remotables.
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
 * @property {(key: K, value: V) => void} set
 * Set the key. Throws if not found.
 * @property {(key: K) => void} delete
 * Remove the key. Throws if not found.
 */

// ////////////////////////////////////////////////////////////////////

/**
 * @template K,V
 * @typedef {Object} LegacyWeakMap
 *
 * @property {(key: K) => boolean} has
 * Check if a key exists
 * @property {(key: K, value: V) => void} init
 * Initialize the key only if it
 * doesn't already exist
 * @property {(key: K) => V} get
 * Return a value for the key. Throws if not found.
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

// ////////////////////////////////////////////////////////////////////

/**
 * @typedef {Passable} Key
 */

/**
 * @typedef {CopyTagged} CopySet
 */

/**
 * @typedef {CopyTagged} CopyMap
 */
