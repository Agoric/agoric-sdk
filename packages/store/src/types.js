/**
 * @typedef {Record<string, Function>} ExternalInstance
 */

/**
 * @template K,V
 * @typedef {Object} Store - A safety wrapper around a Map
 * @property {(key: K) => boolean} has - Check if a key exists
 * @property {(key: K, value: V) => void} init - Initialize the key only if it doesn't already exist
 * @property {(key: K) => V} get - Return a value for the key. Throws
 * if not found.
 * @property {(key: K, value: V) => void} set - Set the key. Throws if not found.
 * @property {(key: K) => void} delete - Remove the key. Throws if not found.
 * @property {() => K[]} keys - Return an array of keys
 * @property {() => V[]} values - Return an array of values
 * @property {() => [K, V][]} entries - Return an array of entries
 */

/**
 * @template K,V
 * @typedef {Object} WeakStore - A safety wrapper around a WeakMap
 * @property {(key: any) => boolean} has - Check if a key exists
 * @property {(key: K, value: V) => void} init - Initialize the key only if it doesn't already exist
 * @property {(key: any) => V} get - Return a value for the key. Throws
 * if not found.
 * @property {(key: K, value: V) => void} set - Set the key. Throws if not found.
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
 * An external store for a given constructor.
 *
 * @template {(...args: Array<any>) => ExternalInstance} C
 * @typedef {Object} ExternalStore
 * @property {C} makeInstance
 * @property {MakeWeakStore<ReturnType<C>, any>} makeWeakStore
 */

/**
 * @typedef {Record<string, any>} HydrateData
 */

/**
 * @typedef {Object} HydrateHook
 * @property {(value: any) => [string, string]} getKey
 * @property {(key: [string, string]) => any} load
 * @property {(storeKey: string) => void} drop
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
 * @param {(init: boolean | undefined) => (data: HydrateData) => T} makeHydrate
 * @returns {ExternalStore<(...args: A) => T>}
 */

/**
 * @typedef {Store<string, string> & { makeWeakStore: () => WeakStore<any, any> }}} ExternalInstanceStore
 */

/**
 * @typedef {Object} BackingStore
 * @property {(storeId: string, instanceKind: string) => ExternalInstanceStore} makeStore
 * @property {(storeId: string) => ExternalInstanceStore} findStore
 */
