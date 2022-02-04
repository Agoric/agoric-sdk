// FIXME remove before review
// @ts-nocheck
// @jessie-nocheck
/* eslint-disable no-unused-vars */

import { numberToDBEntryKey } from './storeUtils.js';

// XXX declaration shouldn't be necessary. Add exception to eslint or make a real import.
/* global VatData */

/**
 * Used by prioritizedVaults to
 */

/** @typedef {import('./vault').VaultKit} VaultKit */

export const makeOrderedVaultStore = () => {
  /**
   * Sorts by ratio in descending debt. Ordering of vault id is undefined.
   *
   * @param {Ratio} ratio
   * @param {VaultId} vaultId
   * @returns {string}
   */
  const vaultKey = (ratio, vaultId) => {
    // TODO make sure infinity sorts correctly
    const float = ratio.denominator / ratio.numerator;
    const numberPart = numberToDBEntryKey(float);
    return `${numberPart}:${vaultId}`;
  };

  // TODO type these generics
  const store = VatData.makeScalarBigMapStore();

  /**
   *
   * @param {string} vaultId
   * @param {VaultKit} vaultKit
   */
  const addVaultKit = (vaultId, vaultKit) => {
    const key = vaultKey(vaultKit.vault.getDebtAmount(), vaultId);
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
    // FIXME needs to be the normalized debt amount
    const key = vaultKey(vault.getDebtAmount(), vaultId);
    const vaultKit = store.get(key);
    assert(vaultKit);
    store.delete(key);
    return vaultKit;
  };

  return harden({
    addVaultKit,
    removeVaultKit,
    entries: store.entries,
    getSize: store.getSize,
    values: store.values,
  });
};
