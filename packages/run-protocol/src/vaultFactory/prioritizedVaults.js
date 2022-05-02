// @ts-check
// @jessie-check

import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { ratioGTE } from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/marshal';
import { keyEQ, keyLT } from '@agoric/store';
import { makeOrderedVaultStore } from './orderedVaultStore.js';
import { toVaultKey } from './storeUtils.js';

/** @typedef {import('./vault').Vault} Vault */

/**
 *
 * @param {Amount<'nat'>} debtAmount
 * @param {Amount<'nat'>} collateralAmount
 * @returns {Ratio}
 */
const calculateDebtToCollateral = (debtAmount, collateralAmount) => {
  if (AmountMath.isEmpty(collateralAmount)) {
    return makeRatioFromAmounts(
      debtAmount,
      AmountMath.make(collateralAmount.brand, 1n),
    );
  }
  return makeRatioFromAmounts(debtAmount, collateralAmount);
};

/**
 *
 * @param {Vault} vault
 * @returns {Ratio}
 */
export const currentDebtToCollateral = vault =>
  calculateDebtToCollateral(
    vault.getCurrentDebt(),
    vault.getCollateralAmount(),
  );

/**
 * Vaults, ordered by their liquidation ratio so that all the
 * vaults below a threshold can be quickly found and liquidated.
 *
 * @param {() => void} reschedulePriceCheck called when there is a new
 * least-collateralized vault
 */
export const makePrioritizedVaults = (reschedulePriceCheck = () => {}) => {
  const vaults = makeOrderedVaultStore();

  /**
   * Set the callback for when there is a new least-collateralized vault
   *
   * @param {() => void} rescheduleFn
   */
  const setRescheduler = rescheduleFn => {
    reschedulePriceCheck = rescheduleFn;
  };

  // To deal with fluctuating prices and varying collateralization, we schedule a
  // new request to the priceAuthority when some vault's debtToCollateral ratio
  // surpasses the current high-water mark. When the request that is at the
  // current high-water mark fires, we reschedule at the new (presumably
  // lower) rate.
  // Without this we'd be calling reschedulePriceCheck() unnecessarily
  /** @type {string=} */
  let firstKey;

  // Check if this ratio of debt to collateral would be the highest known. If
  // so, reset our highest and invoke the callback. This can be called on new
  // vaults and when we get a state update for a vault changing balances.
  /** @param {Ratio} collateralToDebt */

  /**
   *
   * @returns {Ratio=} actual debt over collateral
   */
  const firstDebtRatio = () => {
    if (vaults.getSize() === 0) {
      return undefined;
    }
    // Get the first vault.
    const [vault] = vaults.values();
    const collateralAmount = vault.getCollateralAmount();
    if (AmountMath.isEmpty(collateralAmount)) {
      // ??? can currentDebtToCollateral() handle this?
      // Would be an infinite ratio
      return undefined;
    }
    return currentDebtToCollateral(vault);
  };

  /**
   * @param {string} key
   * @returns {Vault}
   */
  const removeVault = key => {
    const vault = vaults.removeByKey(key);
    // don't call reschedulePriceCheck, but do reset the highest.
    // This could be expensive if we delete individual entries in
    // order. Will know once we have perf data.
    console.log('removeVault', firstKey, key);
    if (keyEQ(key, firstKey)) {
      const [secondKey] = vaults.keys();
      firstKey = secondKey;
    }
    return vault;
  };

  /**
   *
   * @param {Amount<'nat'>} oldDebt
   * @param {Amount<'nat'>} oldCollateral
   * @param {string} vaultId
   */
  const removeVaultByAttributes = (oldDebt, oldCollateral, vaultId) => {
    const key = toVaultKey(oldDebt, oldCollateral, vaultId);
    return removeVault(key);
  };

  /**
   *
   * @param {VaultId} vaultId
   * @param {Vault} vault
   */
  const addVault = (vaultId, vault) => {
    const key = vaults.addVault(vaultId, vault);
    console.log('addVault', firstKey, key);
    if (!firstKey || keyLT(key, firstKey)) {
      firstKey = key;
      reschedulePriceCheck();
    }
    return key;
  };

  /**
   * Invoke a function for vaults with debt to collateral at or above the ratio.
   *
   * Results are returned in order of priority, with highest debt to collateral first.
   *
   * Redundant tags until https://github.com/Microsoft/TypeScript/issues/23857
   *
   * @param {Ratio} ratio
   * @yields {[string, Vault]>}
   * @returns {IterableIterator<[string, Vault]>}
   */
  // Allow generator function
  // eslint-disable-next-line func-names
  // eslint-disable-next-line no-restricted-syntax
  function* entriesPrioritizedGTE(ratio) {
    // TODO use a Pattern to limit the query https://github.com/Agoric/agoric-sdk/issues/4550
    for (const [key, vault] of vaults.entries()) {
      const debtToCollateral = currentDebtToCollateral(vault);
      if (ratioGTE(debtToCollateral, ratio)) {
        yield [key, vault];
      } else {
        // stop once we are below the target ratio
        break;
      }
    }
  }

  /**
   * @param {Amount<'nat'>} oldDebt
   * @param {Amount<'nat'>} oldCollateral
   * @param {string} vaultId
   */
  const refreshVaultPriority = (oldDebt, oldCollateral, vaultId) => {
    const vault = removeVaultByAttributes(oldDebt, oldCollateral, vaultId);
    addVault(vaultId, vault);
  };

  return Far('PrioritizedVaults', {
    addVault,
    entries: vaults.entries,
    entriesPrioritizedGTE,
    getSize: vaults.getSize,
    highestRatio: firstDebtRatio,
    refreshVaultPriority,
    removeVault,
    removeVaultByAttributes,
    setRescheduler,
  });
};
