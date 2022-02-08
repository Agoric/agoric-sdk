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

/**
 * Sorts by ratio in descending debt. Ordering of vault id is undefined.
 *
 * @param {Ratio} ratio normalized debt ratio
 * @param {VaultId} vaultId
 * @returns {string}
 */
export const toVaultKey = (ratio, vaultId) => {
  // TODO make sure infinity sorts correctly
  const float = ratio.denominator / ratio.numerator;
  const numberPart = numberToDBEntryKey(float);
  return `${numberPart}:${vaultId}`;
};

/**
 * @param {string} key
 * @returns {[Ratio, VaultId]} normalized debt ratio, vault id
 */
export const fromVaultKey = key => {
  const [numberPart, vaultIdPart] = key.split(':');
  return [Number(numberPart), String(vaultIdPart)];
};

export const makeOrderedVaultStore = () => {
  // TODO type these generics
  const store = VatData.makeScalarBigMapStore();

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

  return harden({
    addVaultKit,
    removeVaultKit,
    entries: store.entries,
    getSize: store.getSize,
    values: store.values,
  });
};
