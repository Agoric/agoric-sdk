// @ts-check

// XXX package factoring debt
import '@agoric/notifier/exported.js';
import '@agoric/store/exported.js';

// Ensure this is a module.
export {};

/** @template T @typedef {import('@endo/far').ERef<T>} ERef */

/**
 * @typedef {object} State
 * @property {bigint} generation
 * @property {any} value
 */

/**
 * @typedef {object} Updater
 * @property {(oldValue: Passable) => unknown} update
 */

/**
 * @typedef {object} Coordinator Transactional cache coordinator
 * @property {(key: Passable) => Promise<Passable>} getRecentValue Read an
 * eventually-consistent state for the specified key.
 * @property {(
 *   key: Passable,
 *   newValue: Passable,
 *   guardPattern: Pattern
 * ) => Promise<Passable>} setCacheValue update a specified key to newValue
 *
 * Returns a recent value (either the new value, or the existing value if the
 * guardPattern does not match).
 * @property {(
 *   key: Passable,
 *   updater: ERef<Updater>,
 *   guardPattern: Pattern,
 * ) => Promise<Passable>} updateCacheValue
 * Update the key to the new state computed by calling the updater.
 *
 * Returns a recent value (either the new value, or the existing value if the
 * guardPattern does not match).
 */
