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
  /** @type {MapStore<string, VaultKit} */
  const store = makeScalarBigMapStore();

  /**
   *
   * @param {string} vaultId
   * @param {VaultKit} vaultKit
   */
  const addVaultKit = (vaultId, vaultKit) => {
    const key = toVaultKey(vaultKit.vault.getDebtAmount(), vaultId);
    store.init(key, vaultKit);
    store.getSize;
  };

  /**
   *
   * @param {VaultId} vaultId
   * @param {Vault} vault
   * @returns {VaultKit}
   */
  const removeVaultKit = (vaultId, vault) => {
    const key = toVaultKey(vault.getNormalizedDebt(), vaultId);
    const vaultKit = store.get(key);
    assert(vaultKit);
    store.delete(key);
    return vaultKit;
  };

  /**
   * Exposes vaultId contained in the key but not the ordering factor.
   * That ordering factor is the inverse quotient of the debt ratio (collateral÷debt)
   * but nothing outside this module should rely on that to be true.
   *
   * Redundant tags until https://github.com/Microsoft/TypeScript/issues/23857
   *
   * @yields {[[string, string], VaultKit]>}
   * @returns {IterableIterator<[VaultId, VaultKit]>}
   */
  // XXX need to make generator with const arrow definitions?
  // XXX can/should we avoid exposing the inverse debt quotient?
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
    removeVaultKit,
    entriesWithId,
    getSize: store.getSize,
    values: store.values,
  });
};
