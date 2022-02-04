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

// Stores a collection of Vaults, pretending to be indexed by ratio of
// debt to collateral. Once performance is an issue, this should use Virtual
// Objects. For now, it uses a Map (Vault->debtToCollateral).
// debtToCollateral (which is not the collateralizationRatio) is updated using
// an observer on the UIState.

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
 * @param {VaultKitRecord} leftVaultPair
 * @param {VaultKitRecord} rightVaultPair
 * @returns {-1 | 0 | 1}
 */
const compareVaultKits = (leftVaultPair, rightVaultPair) => {
  const leftVaultRatio = leftVaultPair.debtToCollateral;
  const rightVaultRatio = rightVaultPair.debtToCollateral;
  const leftGTERight = ratioGTE(leftVaultRatio, rightVaultRatio);
  const rightGTEleft = ratioGTE(rightVaultRatio, leftVaultRatio);
  if (leftGTERight && rightGTEleft) {
    return 0;
  } else if (leftGTERight) {
    return -1;
  } else if (rightGTEleft) {
    return 1;
  }
  throw Error("The vault's collateral ratios are not comparable");
};

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
  // cache of the head of the priority queue
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

  const highestRatio = () => {
    const mostIndebted = vaults.first;
    return mostIndebted ? mostIndebted.debtToCollateral : undefined;
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
      highestDebtToCollateral = highestRatio();
    }
    return vaults.removeVaultKit(vaultId, vault);
  };

  // FIXME need to still do this work
  // /**
  //  *
  //  * @param {VaultKit} vaultKit
  //  */
  // const makeObserver = (vaultKit) => ({
  //   updateState: (state) => {
  //     if (AmountMath.isEmpty(state.locked)) {
  //       return;
  //     }
  //     const debtToCollateral = currentDebtToCollateral(vaultKit);
  //     updateDebtRatio(vaultKit, debtToCollateral);
  //     vaultsWithDebtRatio.sort(compareVaultKits);
  //     rescheduleIfHighest(debtToCollateral);
  //   },
  //   finish: (_) => {
  //     removeVault(vaultKit);
  //   },
  //   fail: (_) => {
  //     removeVault(vaultKit);
  //   },
  // });

  /**
   *
   * @param {VaultId} vaultId
   * @param {VaultKit} vaultKit
   */
  const addVaultKit = (vaultId, vaultKit) => {
    vaults.addVaultKit(vaultId, vaultKit);

    // REVISIT
    const debtToCollateral = currentDebtToCollateral(vaultKit.vault);
    // observeNotifier(notifier, makeObserver(vaultKit));
    rescheduleIfHighest(debtToCollateral);
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
   * @param {(VaultId, VaultKit) => void} cb
   */
  const forEachRatioGTE = (ratio, cb) => {
    // ??? should this use a Pattern to limit the iteration?
    for (const [k, v] of vaults.entries()) {
      /** @type {VaultKit} */
      const vk = v;
      const debtToCollateral = currentDebtToCollateral(vk.vault);

      if (ratioGTE(debtToCollateral, ratio)) {
        cb(vk);
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

  const map = func => vaultsWithDebtRatio.map(func);

  return harden({
    addVaultKit,
    refreshVaultPriority,
    removeVault,
    map,
    forEachRatioGTE,
    highestRatio: () => highestDebtToCollateral,
  });
};
