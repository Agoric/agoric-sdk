// @jessie-check

/**
 * @typedef {object} State
 * @property {bigint} generation
 * @property {any} value
 */

/**
 * The ground state for a cache key value is `undefined`.  It is impossible to
 * distinguish a set value of `undefined` from an unset key.
 *
 * @type {State}
 */
export const GROUND_STATE = harden({ generation: 0n, value: undefined });

/**
 * Create a new state as an update relative to an existing one.
 *
 * @param {any} value
 * @param {State} [priorState]
 * @returns {State}
 */
export const makeState = (value, priorState = GROUND_STATE) =>
  harden({
    generation: priorState.generation + 1n,
    value,
  });

/**
 * Wrap a state store to have a default value using the GROUND_STATE
 *
 * @param {MapStore<string, import('./state.js').State>} stateStore
 */
export const withGroundState = stateStore => ({
  ...stateStore,
  get: key => {
    if (!stateStore.has(key)) {
      return GROUND_STATE;
    }
    return stateStore.get(key);
  },
});
harden(withGroundState);
