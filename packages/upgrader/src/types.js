/**
 * @template T
 * @typedef {T | PromiseLike<T>} PromiseOrNot
 */

/**
 * @template T
 * @typedef {import('@agoric/produce-promise').PromiseRecord<T>} PromiseRecord
 */

/**
 * @template T
 * @typedef {Object} UpgraderKit
 * @property {Promise<T>} upgradableP
 * @property {Upgrader<T>} upgrader
 */

/**
 * @template T
 * @typedef {Object} Upgrader
 * @property {(replacerP: PromiseOrNot<Replacer<T>>) => Promise<T>} upgrade
 * @property {(reason?: any) => void} revoke
 * @property {() => void} finish
 */

/**
 * @template T
 * @typedef {Object} Replacer
 * @property {(lastInstance?: T) => Promise<T>} upgradeFromLast
 */
