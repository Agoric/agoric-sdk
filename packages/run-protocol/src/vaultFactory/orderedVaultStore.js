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

/** @typedef {[normalizedDebtRatio: number, vaultId: VaultId]} CompositeKey */

export const makeOrderedVaultStore = () => {
  // TODO make it work durably
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

  /**
   * XXX part of refactoring, used only for tests at this point.
   *
   * Exposes vaultId contained in the key but not the ordering factor.
   * That ordering factor is the inverse quotient of the debt ratio (collateral÷debt)
   * but nothing outside this module should rely on that to be true.
   *
   * Redundant tags until https://github.com/Microsoft/TypeScript/issues/23857
   *
   * @yields {[[string, string], VaultKit]>}
   * @returns {IterableIterator<[VaultId, VaultKit]>}
   */
  function* entriesWithId() {
    for (const [k, v] of store.entries()) {
      const [_, vaultId] = fromVaultKey(k);
      /** @type {VaultKit} */
      const vaultKit = v;
      yield [vaultId, vaultKit];
    }
  }

  return harden({
    addVaultKit,
    removeByKey,
    entries: store.entries,
    entriesWithId,
    getSize: store.getSize,
    values: store.values,
  });
};
