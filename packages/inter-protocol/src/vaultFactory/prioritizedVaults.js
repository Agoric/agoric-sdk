// @jessie-check

import { makeTracer } from '@agoric/internal';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { M } from '@agoric/vat-data';
import { makeScalarMapStore } from '@agoric/store';
import { makeOrderedVaultStore } from './orderedVaultStore.js';
import {
  toVaultKey,
  normalizedCollRatioKey,
  normalizedCollRatio,
} from './storeUtils.js';

/** @import {Vault} from './vault.js' */
/** @import {NormalizedDebt} from './storeUtils.js' */

const trace = makeTracer('PVaults', true);

/**
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
 * @param {MapStore<string, Vault>} store vault has a higher debt ratio than the
 *   previous highest
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

  const removeVaultsBelow = ({ margin, quote, interest }) => {
    // crKey represents a collateralizationRatio based on the locked price, the
    // interest charged so far, and the liquidation margin.
    // We'll remove all vaults below that ratio, and return them.
    const crKey = normalizedCollRatioKey(quote, interest, margin);

    trace(
      `Liquidating vaults worse than`,
      normalizedCollRatio(quote, interest, margin),
    );

    /** @type {MapStore<string, Vault>} */
    const vaultsRemoved = makeScalarMapStore();

    for (const [key, vault] of vaults.entries(M.lte(crKey))) {
      vaultsRemoved.init(key, vault);
      vaults.removeByKey(key);
    }

    return vaultsRemoved;
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
    countVaultsBelow: crKey => vaults.getSize(M.lte(crKey)),
  });
};
