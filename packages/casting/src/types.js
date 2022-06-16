// @ts-check

// Make this a module.
export {};

/**
 * @typedef {object} LeaderOptions
 * @property {null | ((err: any, attempt?: number) => Promise<void>)} [retryCallback]
 * @property {() => Promise<boolean>} [keepPolling]
 */

/**
 * @typedef {object} CastingChange
 * @property {CastingSpec} castingSpec
 * @property {number} [blockHeight]
 * @property {Uint8Array[]} values
 */

/**
 * @typedef {object} Leader
 * @property {(error: any, attempt?: number) => Promise<void>} retry
 * @property {() => LeaderOptions} getOptions
 * @property {<T>(callback: (endpoint: string) => Promise<T>) => Promise<T[]>} mapEndpoints
 * @property {(key: ERef<CastingSpec>) => Promise<Follower<CastingChange>>} watchCasting
 */

/**
 * @template T
 * @typedef {object} Follower
 * @property {() => AsyncIterable<T>} [getLatestIterable]
 */

/**
 * @template T
 * @typedef {object} FollowerElement
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
 * @typedef {object} FollowerOptions
 * @property {null | import('@endo/far').ERef<Unserializer>} [unserializer]
 * @property {(buf: Uint8Array) => any} [decode]
 * @property {Record<string, any>} [clientParams]
 * @property {'strict'|'optimistic'|'none'} [integrity]
 * @property {null | import('@endo/far').ERef<Crasher>} [crasher]
 */

/**
 * @typedef {object} CastingSpec
 * @property {string} storeName
 * @property {Uint8Array} storeSubkey
 * @property {Uint8Array} [dataPrefixBytes]
 */

/**
 * @callback CastingSpecMaker
 * @param {Required<FollowerOptions>} completeOptions
 * @returns {ERef<string>}
 */

/**
 * @typedef {ERef<CastingSpec> | CastingSpecMaker} CastingSpecTemplate
 */
