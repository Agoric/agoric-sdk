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
 * A stable HandledPromise identity whose implementation can be changed
 * @property {Upgrader<T>} upgrader
 * The upgrader facet, by which implementations are modified
 */

/**
 * @template T
 * @typedef {Object} Upgrader
 * @property {(replacerP: PromiseOrNot<Replacer<T>>) => Promise<T>} upgrade
 * Coordinate an upgrade of the upgradableP's implementation.
 * @property {(reason?: any) => void} revoke
 * Permanently reject the upgraderP and clean up old state
 * @property {() => void} finish
 * Permanently resolve the upgraderP, using the latest implementation forevermore
 */

/**
 * @template T
 * @typedef {Object} Replacer
 * @property {(priorP: Promise<T> | undefined) => Promise<T>} upgradeFrom
 * Receive a promise for the prior implementation (undefined if there was none),
 * so that we can export state from it.  Return a promise that resolves
 * to the next implementation.
 *
 * Guarantees atomically that message forwarding to the old implementation
 * is suspended during upgrade, and resumed once the new implementation is
 * installed.  The old implementation is rolled back on failure to upgrade,
 * then messages resume to it.
 */
