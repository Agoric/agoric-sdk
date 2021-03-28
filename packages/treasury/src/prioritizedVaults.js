// @ts-check

import { observeNotifier } from '@agoric/notifier';
import {
  natSafeMath,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport';
import { assert } from '@agoric/assert';
import { amountMath } from '@agoric/ertp';

const { multiply, isGTE } = natSafeMath;

// Stores a collection of Vaults, pretending to be indexed by ratio of
// debt to collateral. Once performance is an issue, this should use Virtual
// Objects. For now, it uses a Map (Vault->debtToCollateral).
// debtToCollateral (which is not the collateralizationRatio) is updated using
// an observer on the UIState.

function ratioGTE(left, right) {
  assert(
    left.numerator.brand === right.numerator.brand &&
      left.denominator.brand === right.denominator.brand,
    `brands must match`,
  );
  return isGTE(
    multiply(left.numerator.value, right.denominator.value),
    multiply(right.numerator.value, left.denominator.value),
  );
}

function calculateDebtToCollateral(debtAmount, collateralAmount) {
  if (amountMath.isEmpty(debtAmount) && amountMath.isEmpty(collateralAmount)) {
    return makeRatioFromAmounts(
      debtAmount,
      amountMath.make(1n, collateralAmount.brand),
    );
  }
  return makeRatioFromAmounts(debtAmount, collateralAmount);
}

function compareVaultKits(leftVaultPair, rightVaultPair) {
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
}

// makePrioritizedVaults() takes a function parameter, which will be called when
// there is a new least-collateralized vault.

export function makePrioritizedVaults(reschedulePriceCheck) {
  // Each entry is [Vault, debtToCollateralRatio]. The array must be resorted on
  // every insert, and whenever any vault's ratio changes. We can remove an
  // arbitrary number of vaults from the front of the list without resorting. We
  // delete single entries using filter(), which leaves the array sorted.
  let vaultsWithDebtRatio = [];

  // To deal with fluctuating prices and varying collateralization, we schedule a
  // new request to the priceAuthority when some vault's debtToCollateral ratio
  // surpasses the current high-water mark. When the request that is at the
  // current high-water mark fires, we reschedule at the new highest ratio
  // (which should be lower, as we will have liquidated any that were at least
  // as high.)
  let highestDebtToCollateral;

  // Check if this ratio of debt to collateral would be the highest known. If
  // so, reset our highest and invoke the callback. This can be called on new
  // vaults and when we get a state update for a vault changing balances.
  function rescheduleIfHighest(collateralToDebt) {
    if (
      !highestDebtToCollateral ||
      !ratioGTE(highestDebtToCollateral, collateralToDebt)
    ) {
      highestDebtToCollateral = collateralToDebt;
      reschedulePriceCheck();
    }
  }

  function highestRatio() {
    const mostIndebted = vaultsWithDebtRatio[0];
    return mostIndebted ? mostIndebted.debtToCollateral : undefined;
  }

  function removeVault(vaultKit) {
    vaultsWithDebtRatio = vaultsWithDebtRatio.filter(
      v => v.vaultKit !== vaultKit,
    );
    // don't call reschedulePriceCheck, but do reset the highest.
    highestDebtToCollateral = highestRatio();
  }

  function updateDebtRatio(vaultKit, debtRatio) {
    vaultsWithDebtRatio.forEach((vaultPair, index) => {
      if (vaultPair.vaultKit === vaultKit) {
        vaultsWithDebtRatio[index].debtToCollateral = debtRatio;
      }
    });
  }

  function makeObserver(vaultKit) {
    return {
      updateState: _ => {
        const debtToCollateral = calculateDebtToCollateral(
          vaultKit.vault.getDebtAmount(),
          vaultKit.vault.getCollateralAmount(),
        );
        updateDebtRatio(vaultKit, debtToCollateral);
        vaultsWithDebtRatio.sort(compareVaultKits);
        rescheduleIfHighest(debtToCollateral);
      },
      finish: _ => {
        removeVault(vaultKit);
      },
      fail: _ => {
        removeVault(vaultKit);
      },
    };
  }

  function addVaultKit(vaultKit, notifier) {
    const debtToCollateral = calculateDebtToCollateral(
      vaultKit.vault.getDebtAmount(),
      vaultKit.vault.getCollateralAmount(),
    );
    vaultsWithDebtRatio.push({ vaultKit, debtToCollateral });
    vaultsWithDebtRatio.sort(compareVaultKits);
    observeNotifier(notifier, makeObserver(vaultKit));
    rescheduleIfHighest(debtToCollateral);
  }

  // Invoke a function for vaults with debt to collateral at or above the ratio
  function forEachRatioGTE(ratio, func) {
    // vaults are sorted with highest ratios first
    let index;
    for (index = 0; index < vaultsWithDebtRatio.length; index += 1) {
      const vaultPair = vaultsWithDebtRatio[index];
      if (ratioGTE(vaultPair.debtToCollateral, ratio)) {
        func(vaultPair);
      } else {
        // stop once we are below the target ratio
        break;
      }
    }

    if (index > 0) {
      vaultsWithDebtRatio = vaultsWithDebtRatio.slice(index);
      const highest = highestRatio();
      if (highest) {
        reschedulePriceCheck();
      }
    }
    highestDebtToCollateral = highestRatio();
  }

  function map(func) {
    return vaultsWithDebtRatio.map(func);
  }

  function reduce(func, init = undefined) {
    return vaultsWithDebtRatio.reduce(func, init);
  }

  return harden({
    addVaultKit,
    removeVault,
    map,
    reduce,
    forEachRatioGTE,
    highestRatio: () => highestDebtToCollateral,
  });
}
