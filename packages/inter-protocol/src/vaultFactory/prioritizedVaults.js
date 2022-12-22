// @jessie-check

import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { ratioGTE } from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/marshal';
import { keyEQ, keyLT } from '@agoric/store';
import { makeTracer } from '@agoric/internal';
import { makeOrderedVaultStore } from './orderedVaultStore.js';
import { fromVaultKey, toVaultKey } from './storeUtils.js';

const trace = makeTracer('PV', false);

/** @typedef {import('./vault').Vault} Vault */
/** @typedef {import('./storeUtils.js').NormalizedDebt} NormalizedDebt */

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
 * Vaults, ordered by their debt ratio so that all the vaults below a threshold
 * can be quickly found and liquidated.
 *
 * @param {MapStore<string, Vault>} store
 * @param {(highestRatio: Ratio) => void} [higherHighestCb] called when a new
 * vault has a higher debt ratio than the previous highest
 */
export const makePrioritizedVaults = (store, higherHighestCb = () => {}) => {
  const vaults = makeOrderedVaultStore(store);

  /**
   * Called back when there's a new highestRatio and it's higher than the previous.
   *
   * In other words, when a new highestRatio results from adding a vault. Removing the
   * first vault also changes the highest, but necessarily to a lower highest,
   * for which there are no use cases requiring notification.
   *
   * @param {(highestRatio: Ratio) => void} callback
   */
  const onHigherHighest = callback => {
    higherHighestCb = callback;
  };

  // To deal with fluctuating prices and varying collateralization, we schedule a
  // new request to the priceAuthority when some vault's debtToCollateral ratio
  // surpasses the current high-water mark. When the request that is at the
  // current high-water mark fires, we reschedule at the new (presumably
  // lower) rate.
  // Without this we'd be calling reschedulePriceCheck() unnecessarily
  /** @type {string | undefined} */
  let firstKey;

  /**
   * Ratio of the least-collateralized vault, if there is one.
   *
   * @returns {Ratio | undefined} actual debt over collateral
   */
  const highestRatio = () => {
    if (vaults.getSize() === 0) {
      return undefined;
    }
    // Get the first vault.
    const [vault] = vaults.values();
    assert(
      !AmountMath.isEmpty(vault.getCollateralAmount()),
      'First vault had no collateral',
    );
    return currentDebtToCollateral(vault);
  };

  /**
   *
   * @param {NormalizedDebt} oldDebt
   * @param {Amount<'nat'>} oldCollateral
   * @param {string} vaultId
   */
  const hasVaultByAttributes = (oldDebt, oldCollateral, vaultId) => {
    const key = toVaultKey(oldDebt, oldCollateral, vaultId);
    return vaults.has(key);
  };

  /**
   * @param {string} key
   * @returns {Vault}
   */
  const removeVault = key => {
    const vault = vaults.removeByKey(key);
    trace('removeVault', key, fromVaultKey(key), 'when first:', firstKey);
    if (keyEQ(key, firstKey)) {
      const [secondKey] = vaults.keys();
      firstKey = secondKey;
    }
    return vault;
  };

  /**
   *
   * @param {NormalizedDebt} oldDebt
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
    assert(
      !AmountMath.isEmpty(vault.getCollateralAmount()),
      'Tracked vaults must have collateral (be liquidatable)',
    );
    trace('addVault', key, 'when first:', firstKey);
    if (!firstKey || keyLT(key, firstKey)) {
      firstKey = key;
      higherHighestCb(currentDebtToCollateral(vault));
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

  return Far('PrioritizedVaults', {
    addVault,
    entries: vaults.entries,
    entriesPrioritizedGTE,
    getCount: vaults.getSize,
    hasVaultByAttributes,
    highestRatio,
    removeVault,
    removeVaultByAttributes,
    onHigherHighest,
  });
};
