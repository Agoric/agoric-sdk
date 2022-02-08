// @ts-check

import {
  natSafeMath,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { assert } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import { makeOrderedVaultStore } from './orderedVaultStore';

const { multiply, isGTE } = natSafeMath;

/** @typedef {import('./vault').VaultKit} VaultKit */

// TODO put this with other ratio math
/**
 *
 * @param {Ratio} left
 * @param {Ratio} right
 * @returns {boolean}
 */
const ratioGTE = (left, right) => {
  assert(
    left.numerator.brand === right.numerator.brand &&
      left.denominator.brand === right.denominator.brand,
    `brands must match`,
  );
  return isGTE(
    multiply(left.numerator.value, right.denominator.value),
    multiply(right.numerator.value, left.denominator.value),
  );
};

/**
 *
 * @param {Amount} debtAmount
 * @param {Amount} collateralAmount
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
const currentDebtToCollateral = vault =>
  calculateDebtToCollateral(vault.getDebtAmount(), vault.getCollateralAmount());

/** @typedef {{debtToCollateral: Ratio, vaultKit: VaultKit}} VaultKitRecord */

/**
 *
 * @param {() => void} reschedulePriceCheck called when there is a new
 * least-collateralized vault
 */
export const makePrioritizedVaults = reschedulePriceCheck => {
  const vaults = makeOrderedVaultStore();

  // XXX why keep this state in PrioritizedVaults? Better in vaultManager?

  // To deal with fluctuating prices and varying collateralization, we schedule a
  // new request to the priceAuthority when some vault's debtToCollateral ratio
  // surpasses the current high-water mark. When the request that is at the
  // current high-water mark fires, we reschedule at the new highest ratio
  // (which should be lower, as we will have liquidated any that were at least
  // as high.)
  /** @type {Ratio=} */
  // cache of the head of the priority queue (normalized or actualized?)
  let highestDebtToCollateral;

  // Check if this ratio of debt to collateral would be the highest known. If
  // so, reset our highest and invoke the callback. This can be called on new
  // vaults and when we get a state update for a vault changing balances.
  /** @param {Ratio} collateralToDebt */
  // Caches and reschedules
  const rescheduleIfHighest = collateralToDebt => {
    if (
      !highestDebtToCollateral ||
      !ratioGTE(highestDebtToCollateral, collateralToDebt)
    ) {
      highestDebtToCollateral = collateralToDebt;
      reschedulePriceCheck();
    }
  };

  /**
   *
   * @returns {Ratio=} actual debt over collateral
   */
  const firstDebtRatio = () => {
    if (vaults.getSize() === 0) {
      return undefined;
    }

    const [[_, vaultKit]] = vaults.entriesWithId();
    const { vault } = vaultKit;
    const actualDebtAmount = vault.getDebtAmount();
    return makeRatioFromAmounts(actualDebtAmount, vault.getCollateralAmount());
  };

  /**
   *
   * @param {VaultId} vaultId
   * @param {Vault} vault
   * @returns {VaultKit}
   */
  const removeVault = (vaultId, vault) => {
    const debtToCollateral = currentDebtToCollateral(vault);
    if (
      !highestDebtToCollateral ||
      // TODO check for equality is sufficient and faster
      ratioGTE(debtToCollateral, highestDebtToCollateral)
    ) {
      // don't call reschedulePriceCheck, but do reset the highest.
      highestDebtToCollateral = firstDebtRatio();
    }
    return vaults.removeVaultKit(vaultId, vault);
  };

  /**
   *
   * @param {VaultId} vaultId
   * @param {VaultKit} vaultKit
   */
  const addVaultKit = (vaultId, vaultKit) => {
    vaults.addVaultKit(vaultId, vaultKit);

    const debtToCollateral = currentDebtToCollateral(vaultKit.vault);
    rescheduleIfHighest(debtToCollateral);
  };

  /**
   * Akin to forEachRatioGTE but iterate over all vaults.
   *
   * @param {(VaultId, VaultKit) => void} cb
   * @returns {void}
   */
  const forAll = cb => {
    for (const [vaultId, vk] of vaults.entriesWithId()) {
      cb(vaultId, vk);
    }
  };

  /**
   * Invoke a function for vaults with debt to collateral at or above the ratio
   *
   * The iterator breaks on any change to the store. We could puts items to
   * liquidate into a separate store, but for now we'll rely on accumlating the
   * keys in memory and removing them all at once.
   *
   * Something to consider for the separate store idea is we can throttle the
   * dump rate to manage economices.
   *
   * @param {Ratio} ratio
   * @param {(vid: VaultId, vk: VaultKit) => void} cb
   */
  const forEachRatioGTE = (ratio, cb) => {
    // TODO use a Pattern to limit the query
    for (const [vaultId, vk] of vaults.entriesWithId()) {
      const debtToCollateral = currentDebtToCollateral(vk.vault);

      if (ratioGTE(debtToCollateral, ratio)) {
        cb(vaultId, vk);
      } else {
        // stop once we are below the target ratio
        break;
      }
    }

    // TODO accumulate keys in memory and remove them all at once

    // REVISIT the logic in maser for forEachRatioGTE that optimized when to update highest ratio and reschedule
  };

  /**
   *
   * @param {VaultId} vaultId
   * @param {Vault} vault
   */
  const refreshVaultPriority = (vaultId, vault) => {
    const vaultKit = removeVault(vaultId, vault);
    addVaultKit(vaultId, vaultKit);
  };

  return harden({
    addVaultKit,
    refreshVaultPriority,
    removeVault,
    forAll,
    forEachRatioGTE,
    highestRatio: () => highestDebtToCollateral,
  });
};
