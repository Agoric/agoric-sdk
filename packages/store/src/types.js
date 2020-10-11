/**
 * @typedef {Record<string, Function>} ExternalInstance
 */

/**
 * @template K,V
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
 * @template K,V
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
 * @template K,V
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
 * @typedef {Record<string, any>} ClosureData
 */

/**
 * @typedef {[number, number]} InstanceKey
 * @typedef {true} HydrateInit
 * @typedef {Object} InstanceHook
 * @property {(value: any) => InstanceKey} getKey
 * @property {(key: InstanceKey) => any} load
 * @property {(storeId: number) => void} drop
 */

/**
 * An external store that decouples the closure data from the returned
 * "representative" instance.
 *
 * @template {Array<any>} A
 * @template {ExternalInstance} T
 * @callback MakeClosureExternalStore
 * @param {string} instanceKind
 * @param {(...args: A) => ClosureData} adaptArguments
 * @param {(init?: HydrateInit) => (data: ClosureData) => T} makeHydrate
 * @returns {ExternalStore<(...args: A) => T>}
 */

/**
 * @typedef {Object} InstanceStore The store needed to save closed-over
 * per-instance data
 * @property {(instanceId: number, data: ClosureData) => void} init
 * @property {(instanceId: number) => ClosureData} get
 * @property {(instanceId: number, data: ClosureData) => void} set
 * @property {() => WeakStore<ExternalInstance, any>} makeWeakStore
 */

/**
 * @typedef {Object} BackingStore This is the master store that reifies storeIds
 * @property {(storeId: number, instanceKind: string) => InstanceStore} makeInstanceStore
 * @property {(storeId: number) => InstanceStore} getInstanceStore
 */
