import { fromVaultKey, toVaultKey } from './storeUtils.js';

/**
 * Used by prioritizedVaults to wrap the Collections API for this use case.
 *
 * Designed to be replaceable by naked Collections API when composite keys are
 * available.
 *
 * In this module debts are encoded as the inverse quotient (collateral over
 * debt) so that greater collateralization sorts after lower. (Higher
 * debt-to-collateral come first.)
 */

/** @import {Vault} from './vault.js' */
/** @import {CompositeKey} from './storeUtils.js' */

/** @param {MapStore<string, Vault>} store */
export const makeOrderedVaultStore = store => {
  /**
   * @param {string} vaultId
   * @param {Vault} vault
   */
  const addVault = (vaultId, vault) => {
    const debt = vault.getNormalizedDebt();
    const collateral = vault.getCollateralAmount();
    const key = toVaultKey(debt, collateral, vaultId);
    store.init(key, vault);
    return key;
  };

  /**
   * @param {string} key
   * @returns {Vault}
   */
  const removeByKey = key => {
    try {
      const vault = store.get(key);
      assert(vault);
      store.delete(key);
      return vault;
    } catch (e) {
      console.error(
        'removeByKey failed to remove',
        key,
        '[ratio, vaultId]:',
        fromVaultKey(key),
      );
      const keys = Array.from(store.keys());
      console.error(
        '  contents:',
        keys.map(k => [k, fromVaultKey[k]]),
      );
      throw e;
    }
  };

  return harden({
    addVault,
    removeByKey,
    has: store.has,
    keys: store.keys,
    entries: store.entries,
    getSize: store.getSize,
    values: store.values,
  });
};
