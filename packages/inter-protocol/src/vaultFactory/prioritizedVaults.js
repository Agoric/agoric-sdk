// @jessie-check

import {
  atomicRearrange,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { M } from '@agoric/vat-data';
import { makeOrderedVaultStore } from './orderedVaultStore.js';
import { toVaultKey } from './storeUtils.js';

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
 * vault has a higher debt ratio than the previous highest
 */
export const makePrioritizedVaults = store => {
  const vaults = makeOrderedVaultStore(store);

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
    return vault;
  };

  /**
   * @param {NormalizedDebt} oldDebt
   * @param {Amount<'nat'>} oldCollateral
   * @param {string} vaultId
   */
  const removeVaultByAttributes = (oldDebt, oldCollateral, vaultId) => {
    const key = toVaultKey(oldDebt, oldCollateral, vaultId);
    return removeVault(key);
  };

  /**
   * @param {VaultId} vaultId
   * @param {Vault} vault
   */
  const addVault = (vaultId, vault) => {
    const key = vaults.addVault(vaultId, vault);
    assert(
      !AmountMath.isEmpty(vault.getCollateralAmount()),
      'Tracked vaults must have collateral (be liquidatable)',
    );
    return key;
  };

  const prepVaultRemoval = (crKey, liqSeat) => {
    // crKey represents a collateralizationRatio based on the locked price.
    // We'll liquidate all vaults above that ratio, and return them with stats.
    const vaultsToLiquidate = [];
    let totalDebt;
    let totalCollateral;
    /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
    const transfers = [];

    for (const vaultEntry of vaults.entries(M.lte(crKey))) {
      vaultsToLiquidate.push(vaultEntry);
      const vault = vaultEntry[1];
      const collateralAmount = vault.getCollateralAmount();
      totalCollateral = totalCollateral
        ? AmountMath.add(totalCollateral, collateralAmount)
        : collateralAmount;
      const debtAmount = vault.getCurrentDebt();
      transfers.push([
        vault.getVaultSeat(),
        liqSeat,
        { Collateral: collateralAmount },
      ]);
      totalDebt = totalDebt
        ? AmountMath.add(totalDebt, debtAmount)
        : debtAmount;
    }

    for (const entry of vaultsToLiquidate) {
      const [k] = entry;
      vaults.removeByKey(k);
    }

    return { vaultsToLiquidate, totalDebt, totalCollateral, transfers };
  };

  const removeVaultsBelow = (crKey, zcf) => {
    const { zcfSeat: liqSeat } = zcf.makeEmptySeatKit();
    const { vaultsToLiquidate, totalDebt, totalCollateral, transfers } =
      prepVaultRemoval(crKey, liqSeat);

    if (transfers.length > 0) {
      atomicRearrange(zcf, harden(transfers));
    }
    return {
      totalDebt,
      totalCollateral,
      vaultsToLiquidate,
      liqSeat,
    };
  };

  return Far('PrioritizedVaults', {
    addVault,
    entries: vaults.entries,
    getCount: vaults.getSize,
    hasVaultByAttributes,
    highestRatio,
    removeVault,
    removeVaultByAttributes,
    removeVaultsBelow,

    // visible for testing
    prepVaultRemoval,
    countVaultsBelow: crKey => vaults.getSize(M.lte(crKey)),
  });
};
