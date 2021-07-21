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
 * @template {Comparable} K
 * @template {Passable} V
 * @typedef {Object} StoreMap
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
 * @property {() => K[]} keys - Return an array of keys
 * @property {() => V[]} values - Return an array of values
 * @property {() => [K, V][]} entries - Return an array of entries
 */

/**
 * @template {Comparable} K
 * @template {Passable} V
 * @typedef {Object} StoreWeakMap
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

// ////////////////////////////////////////////////////////////////////

/**
 * @template K,V
 * @typedef {StoreMap<K,V>} Store
 *
 * TODO Figure out why, without this, we're getting the error
 *
 * ```js
 * ../pegasus/bundles/install-on-chain.js:10:12 - error TS2304: Cannot find name 'Store'.
 * 10  * at-param {Store<NameHub, NameAdmin>} param0.nameAdmins
 * ../treasury/bundles/install-on-chain.js:20:12 - error TS2304: Cannot find name 'Store'.
 * 20  * at-param {Store<NameHub, NameAdmin>} param0.nameAdmins
 * ```
 */

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

/**
 * @typedef {Record<string, Function>} ExternalInstance
 */

/**
 * @template {(...args: Array<any>) => ExternalInstance} M
 * @typedef {Object} ExternalStore
 * An external store for a given maker function.
 * TODO: We should provide makers for other kinds of data structures.
 * Weak sorted lists, weak priority queues, and many others.
 *
 * @property {M} makeInstance Create a fresh instance
 * @property {MakeLegacyWeakMap<ReturnType<M>, any>} makeExternalScalarWeakMap
 * Create an external weak store indexed by an instance
 */

/**
 * @typedef {Record<string, any>} HydrateData
 */

/**
 * @typedef {[number, number]} HydrateKey
 * @typedef {true} HydrateInit
 * @typedef {Object} HydrateHook
 *
 * @property {(value: any) => HydrateKey} getKey
 * @property {(key: HydrateKey) => any} load
 * @property {(storeId: number) => void} drop
 */

/**
 * @template {Array<any>} A
 * @template {ExternalInstance} T
 * @callback MakeHydrateExternalStore
 * An external store that decouples the closure data from the returned
 * "representative" instance.
 *
 * @param {string} instanceKind
 * @param {(...args: A) => HydrateData} adaptArguments
 * @param {(init?: HydrateInit) => (data: HydrateData) => T} makeHydrate
 * @returns {ExternalStore<(...args: A) => T>}
 */

/**
 * @typedef {Object} HydrateStore
 * The store needed to save closed-over per-instance data
 *
 * @property {(id: number, data: HydrateData) => void} init
 * @property {(id: number) => HydrateData} get
 * @property {(id: number, data: HydrateData) => void} set
 * @property {() => LegacyWeakMap<ExternalInstance, any>
 * } makeExternalScalarWeakMap
 */

/**
 * @typedef {Object} BackingStore
 * This is the master store that reifies storeIds
 *
 * @property {(
 *   storeId: number,
 *   instanceKind: string
 * ) => HydrateStore} makeHydrateStore
 * @property {(storeId: number) => HydrateStore} getHydrateStore
 */
