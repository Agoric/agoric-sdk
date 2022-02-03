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

/**
 * Sorts by ratio in descending debt. Ordered of vault id is undefined.
 *
 * @param {Ratio} ratio
 * @param {string} vaultId
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
 * @param {Vault} vault
 */
const addVault = vault => {
  // vault.get
  // const key = vaultKey(vault.)
  // store.init
};
