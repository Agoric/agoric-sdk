// @ts-check

import '@agoric/store/exported.js';

// Ensure this is a module.
export {};

/**
 * @typedef {object} State
 * @property {bigint} generation
 * @property {any} value
 */

/**
 * @typedef {object} Coordinator Transactional cache coordinator
 * @property {(key: unknown) => Promise<State>} getRecentState Read an
 * eventually-consistent state for the specified key.
 * @property {(
 *   key: unknown,
 *   desiredState: State,
 *   guardPattern: Pattern,
 * ) => Promise<State>} tryUpdateState
 * Attempt to update the key to the new state.  Returns the latest known state
 * after trying to apply the desiredState (may not match).
 */
