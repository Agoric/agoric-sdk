// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

/**
 * @typedef {Record<string, Function>} ExternalInstance
 */

/**
 * @typedef {Object} StoreOptions
 * @property {boolean=} passableOnly transitional. Defaults to falso.
 * But beware the default passableOnly will switch to true and ultimately be
 * retired.
 */

/**
 * @typedef {Object} WeakStoreOptions
 * @property {boolean=} longLived Which way to optimize. True means that we
 * expect this weakStore to outlive longer than most of its keys, in which
 * case we internally use a `WeakMap`. Otherwise we internally use a `Map`.
 * Defaults to true, so please mark short lived tables explicitly
 * @property {boolean=} passableOnly transitional. Defaults to false.
 * But beware the default passableOnly will switch to true and ultimately be
 * retired.
 */

/**
 * @template {Comparable} K
 * @template {Passable} V
 * @typedef {Object} Store - A safety wrapper around a Map
 * @property {(key: K) => boolean} has - Check if a key exists
 * @property {(key: K, value: V) => void} init - Initialize the key only if it
 * doesn't already exist
 * @property {(key: K) => V} get - Return a value for the key. Throws if not
 * found.
 * @property {(key: K, value: V) => void} set - Set the key. Throws if not
 * found.
 * @property {(key: K) => void} delete - Remove the key. Throws if not found.
 * @property {() => K[]} keys - Return an array of keys
 * @property {() => V[]} values - Return an array of values
 * @property {() => [K, V][]} entries - Return an array of entries
 */

/**
 * @template {Comparable} K
 * @template {Passable} V
 * @typedef {Object} WeakStore - A safety wrapper around a WeakMap
 * @property {(key: any) => boolean} has - Check if a key exists
 * @property {(key: K, value: V) => void} init - Initialize the key only if it
 * doesn't already exist
 * @property {(key: any) => V} get - Return a value for the key. Throws if not
 * found.
 * @property {(key: K, value: V) => void} set - Set the key. Throws if not
 * found.
 * @property {(key: K) => void} delete - Remove the key. Throws if not found.
 */

/**
 * Distinguishes between adding a new key (init) and updating or
 * referencing a key (get, set, delete).
 *
 * `init` is only allowed if the key does not already exist. `Get`,
 * `set` and `delete` are only allowed if the key does already exist.
 *
 * @template {Comparable} K
 * @template {Passable} V
 * @callback MakeWeakStore
 * @param {string} [keyName='key'] - the column name for the key
 * @returns {WeakStore<K,V>}
 */

/**
 * An external store for a given maker function.
 * TODO: We should provide makers for other kinds of data structures.
 * Weak sorted lists, weak priority queues, and many others.
 *
 * @template {(...args: Array<any>) => ExternalInstance} M
 * @typedef {Object} ExternalStore
 * @property {M} makeInstance Create a fresh instance
 * @property {MakeWeakStore<ReturnType<M>, any>} makeWeakStore Create an
 * external weak store indexed by an instance
 */

/**
 * @typedef {Record<string, any>} HydrateData
 */

/**
 * @typedef {[number, number]} HydrateKey
 * @typedef {true} HydrateInit
 * @typedef {Object} HydrateHook
 * @property {(value: any) => HydrateKey} getKey
 * @property {(key: HydrateKey) => any} load
 * @property {(storeId: number) => void} drop
 */

/**
 * @template {ExternalInstance} T
 * @typedef {Remotable} Hydrater
 * @property {(data: HydrateData) => T} hydrate
 */

/**
 * An external store that decouples the closure data from the returned
 * "representative" instance.
 *
 * @template {Array<any>} A
 * @template {ExternalInstance} T
 * @callback MakeHydrateExternalStore
 * @param {string} instanceKind
 * @param {(...args: A) => HydrateData} adaptArguments
 * @param {(init?: HydrateInit) => Hydrater<T>} makeHydrater
 * @returns {ExternalStore<(...args: A) => T>}
 */

/**
 * @typedef {Object} HydrateStore The store needed to save closed-over
 * per-instance data
 * @property {(id: number, data: HydrateData) => void} init
 * @property {(id: number) => HydrateData} get
 * @property {(id: number, data: HydrateData) => void} set
 * @property {() => WeakStore<ExternalInstance, any>} makeWeakStore
 */

/**
 * @typedef {Object} BackingStore This is the master store that reifies storeIds
 * @property {(storeId: number, instanceKind: string) => HydrateStore} makeHydrateStore
 * @property {(storeId: number) => HydrateStore} getHydrateStore
 */
