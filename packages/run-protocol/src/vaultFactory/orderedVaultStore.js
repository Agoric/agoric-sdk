// XXX avoid deep imports https://github.com/Agoric/agoric-sdk/issues/4255#issuecomment-1032117527
import { makeScalarBigMapStore } from '@agoric/swingset-vat/src/storeModule.js';
import { fromVaultKey, toVaultKey } from './storeUtils.js';

/**
 * Used by prioritizedVaults to wrap the Collections API for this use case.
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
   * Have to define both tags until https://github.com/Microsoft/TypeScript/issues/23857
   *
   * @yields {[[string, string], VaultKit]>}
   * @returns {IterableIterator<[CompositeKey, VaultKit]>}
   */
  // XXX need to make generator with const arrow definitions?
  function* entriesWithCompositeKeys() {
    for (const [k, v] of store.entries()) {
      const compositeKey = fromVaultKey(k);
      /** @type {VaultKit} */
      const vaultKit = v;
      yield [compositeKey, vaultKit];
    }
  }

  return harden({
    addVaultKit,
    removeVaultKit,
    entriesWithCompositeKeys,
    getSize: store.getSize,
    values: store.values,
  });
};
