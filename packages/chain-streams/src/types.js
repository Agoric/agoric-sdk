// @ts-check

// Make this a module.
export {};

/**
 * @typedef {object} ChainLeaderOptions
 * @property {null | ((err: any, attempt?: number) => Promise<void>)} [retryCallback]
 * @property {() => Promise<boolean>} [keepPolling]
 */

/**
 * @typedef {object} ChainStoreChange
 * @property {ChainStoreKey} storeKey
 * @property {number} [blockHeight]
 * @property {Uint8Array[]} values
 */

/**
 * @typedef {object} ChainLeader
 * @property {(error: any, attempt?: number) => Promise<void>} retry
 * @property {() => ChainLeaderOptions} getOptions
 * @property {<T>(callback: (endpoint: string) => Promise<T>) => Promise<T[]>} mapEndpoints
 * @property {(key: ChainStoreKey) => Promise<ChainStream<ChainStoreChange>>} watchStoreKey
 */

/**
 * @template T
 * @typedef {object} ChainStream
 * @property {() => AsyncIterable<T>} [getLatestIterable]
 */

/**
 * @template T
 * @typedef {object} ChainStreamElement
 * @property {T} value
 */

/**
 * @typedef {object} Unserializer
 * @property {(data: import('@endo/marshal').CapData<unknown>) => any} unserialize
 */

/**
 * @typedef {object} Crasher
 * @property {(...args: unknown[]) => void} crash
 */

/**
 * @typedef {object} ChainStreamOptions
 * @property {null | import('@endo/far').FarRef<Unserializer>} [unserializer]
 * @property {(buf: Uint8Array) => any} [decode]
 * @property {'strict'|'optimistic'|'none'} [integrity]
 * @property {import('@endo/far').FarRef<Crasher>} [crasher]
 */

/**
 * @typedef {object} ChainStoreKey
 * @property {string} storeName
 * @property {Uint8Array} storeSubkey
 * @property {Uint8Array} [dataPrefixBytes]
 */
