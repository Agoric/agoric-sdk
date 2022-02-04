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
   * @param {VaultKit} vk
   */
  const addVaultKit = vk => {
    const id = vk.getIdInManager();
    // FIXME needs to be the normalized value
    const key = vaultKey(vk.vault.getDebtAmount());
    store.init(key, vk);
  };

  /**
   *
   * @param {VaultId} vkId
   */
  const removeVaultKit = vkId => {
    store.delete(vkId);
  };

  return harden({
    addVaultKit,
    removeVaultKit,
    getSize: store.getSize,
  });
};
