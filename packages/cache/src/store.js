// @ts-check
import { Far } from '@endo/far';
import { matches, makeScalarMapStore } from '@agoric/store';

import '@agoric/store/exported.js';

import { GROUND_STATE } from './state.js';

const { details: X } = assert;

/**
 * @param {MapStore<unknown, import('./types').State>} [stateStore]
 * @returns {import('./types').Coordinator}
 */
export const makeStoreCoordinator = (stateStore = makeScalarMapStore()) => {
  const getCurrentState = key => {
    if (!stateStore.has(key)) {
      return GROUND_STATE;
    }
    return stateStore.get(key);
  };
  return Far('store cache coordinator', {
    getRecentState: async key => getCurrentState(key),
    tryUpdateState: async (key, desiredState, guardPattern) => {
      const currentState = getCurrentState(key);
      const { generation, value } = currentState;
      const nextGeneration = generation + 1n;
      const { generation: desiredGeneration, value: desiredValue } =
        desiredState;
      assert(
        desiredGeneration <= nextGeneration,
        X`Cannot refer to future generation; expected ${nextGeneration}, got ${desiredGeneration}`,
      );
      if (desiredGeneration < nextGeneration) {
        return currentState;
      }
      assert.equal(desiredGeneration, nextGeneration);
      if (!matches(value, guardPattern)) {
        // value doesn't match, so don't apply the update.
        return currentState;
      }

      const nextState = harden({
        generation: nextGeneration,
        value: desiredValue,
      });
      if (nextGeneration <= 1n) {
        stateStore.init(key, nextState);
      } else {
        stateStore.set(key, nextState);
      }
      return nextState;
    },
  });
};
