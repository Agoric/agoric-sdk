import { AmountMath } from '@agoric/amounts';

/** @import {Amount, AssetKind} from '@agoric/amounts'; */

/**
 * @template {AssetKind} [K=AssetKind]
 * @typedef {object} AmountStore
 * @property {() => Amount<K>} getAmount
 * @property {(delta: Amount<K>) => void} increment
 * @property {(delta: Amount<K>) => boolean} decrement
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @param {object} state
 * @param {string} key
 * @returns {AmountStore<K>}
 */
export const makeAmountStore = (state, key) => {
  return harden({
    getAmount: () => state[key],
    increment: delta => {
      state[key] = AmountMath.add(state[key], delta);
    },
    decrement: delta => {
      if (AmountMath.isGTE(state[key], delta)) {
        state[key] = AmountMath.subtract(state[key], delta);
        return true;
      }
      return false;
    },
  });
};
harden(makeAmountStore);
