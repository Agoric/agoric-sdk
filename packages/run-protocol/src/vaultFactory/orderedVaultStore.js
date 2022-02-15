// @ts-check
// XXX avoid deep imports https://github.com/Agoric/agoric-sdk/issues/4255#issuecomment-1032117527
import { makeScalarBigMapStore } from '@agoric/swingset-vat/src/storeModule.js';
import { fromVaultKey, toVaultKey } from './storeUtils.js';

/**
 * Used by prioritizedVaults to wrap the Collections API for this use case.
 *
 * Designed to be replaceable by naked Collections API when composite keys are available.
 *
 * In this module debts are encoded as the inverse quotient (collateral over debt) so that
 * greater collaterization sorts after lower. (Higher debt-to-collateral come
 * first.)
 */

/** @typedef {import('./vault').VaultKit} VaultKit */
/** @typedef {import('./storeUtils').CompositeKey} CompositeKey */

export const makeOrderedVaultStore = () => {
  // TODO make it work durably https://github.com/Agoric/agoric-sdk/issues/4550
  /** @type {MapStore<string, VaultKit>} */
  const store = makeScalarBigMapStore('orderedVaultStore', { durable: false });

  /**
   *
   * @param {string} vaultId
   * @param {VaultKit} vaultKit
   */
  const addVaultKit = (vaultId, vaultKit) => {
    const { vault } = vaultKit;
    const debt = vault.getDebtAmount();
    const collateral = vault.getCollateralAmount();
    const key = toVaultKey(debt, collateral, vaultId);
    console.log('addVaultKit', {
      debt: debt.value,
      collateral: collateral.value,
      key,
    });
    store.init(key, vaultKit);
    return key;
  };

  /**
   *
   * @param {string} key
   * @returns {VaultKit}
   */
  const removeByKey = key => {
    try {
      const vaultKit = store.get(key);
      assert(vaultKit);
      store.delete(key);
      return vaultKit;
    } catch (e) {
      const keys = Array.from(store.keys());
      console.error(
        'removeByKey failed to remove',
        key,
        'parts:',
        fromVaultKey(key),
      );
      console.error('  key literals:', keys);
      console.error('  key parts:', keys.map(fromVaultKey));
      throw e;
    }
  };

  return harden({
    addVaultKit,
    removeByKey,
    keys: store.keys,
    entries: store.entries,
    getSize: store.getSize,
    values: store.values,
  });
};
