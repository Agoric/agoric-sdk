import { AmountMath } from '@agoric/ertp';
import {
  ceilDivideBy,
  ceilMultiplyBy,
  floorMultiplyBy,
  makeRatioFromAmounts,
  multiplyRatios,
} from '@agoric/zoe/src/contractSupport/index.js';
import { quoteAsRatio } from '../contractSupport.js';
import { liquidationResults } from './liquidation.js';

const { quote: q } = assert;

/**
 * @typedef {{
 *   accounting: { overage: Amount<'nat'>, shortfall: Amount<'nat'> },
 *   collateralForReserve: Amount<'nat'>,
 *   actualCollateralSold: Amount<'nat'>,
 *   collateralSold: Amount<'nat'>,
 *   debtToBurn: Amount<'nat'>,
 *   liquidationsAborted: number,
 *   liquidationsCompleted: number,
 *   mintedForReserve: Amount<'nat'>,
 *   mintedProceeds: Amount<'nat'>,
 *   phantomInterest: Amount<'nat'>,
 *   transfers: import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[],
 *   vaultsToReinstate: Array<Vault>
 * }} DistributionPlan
 *
 * The plan to execute for distributing proceeds of a liquidation
 */

/**
 * Liquidation.md describes how to process liquidation proceeds
 *
 * @param {AmountKeywordRecord} proceeds
 * @param {Amount<'nat'>} totalDebt
 * @param {Amount<'nat'>} totalCollateral
 * @param {Pick<PriceQuote, 'quoteAmount'>} oraclePriceAtStart
 * @param {ZCFSeat} liqSeat
 * @param {Array<[Vault, { collateralAmount: Amount<'nat'>, debtAmount:  Amount<'nat'>}]>} bestToWorst
 * @param {Ratio} penaltyRate
 * @returns {DistributionPlan}
 */
export const calculateDistributionPlan = (
  proceeds,
  totalDebt,
  totalCollateral,
  oraclePriceAtStart,
  liqSeat,
  bestToWorst,
  penaltyRate,
) => {
  const debtBrand = totalDebt.brand;

  const { Collateral: collateralProceeds } = proceeds;
  /** @type {Amount<'nat'>} */
  const collateralSold = AmountMath.subtract(
    totalCollateral,
    collateralProceeds,
  );

  const mintedProceeds = proceeds.Minted || AmountMath.makeEmpty(debtBrand);
  const accounting = liquidationResults(totalDebt, mintedProceeds);

  // charged in collateral
  const totalPenalty = ceilMultiplyBy(
    totalDebt,
    multiplyRatios(
      penaltyRate,
      quoteAsRatio(oraclePriceAtStart.quoteAmount.value[0]),
    ),
  );
  const debtPortion = makeRatioFromAmounts(totalPenalty, totalDebt);

  // We mutate the plan so that at any point if there's an error the plan can be returned and executed.
  // IOW the plan must always be in a valid state, though perhaps incomplete.
  /** @type {DistributionPlan} */
  const plan = {
    accounting,
    collateralForReserve: AmountMath.makeEmptyFromAmount(totalCollateral),
    actualCollateralSold: AmountMath.makeEmptyFromAmount(totalCollateral),
    collateralSold,
    debtToBurn: AmountMath.makeEmptyFromAmount(totalDebt),
    // XXX these two counts are implied by the execution of the plan, not the plan itself
    liquidationsAborted: 0,
    liquidationsCompleted: 0,
    mintedForReserve: AmountMath.makeEmptyFromAmount(totalDebt),
    mintedProceeds,
    phantomInterest: AmountMath.makeEmptyFromAmount(totalDebt),
    transfers: [],
    vaultsToReinstate: [],
  };

  /**
   * If interest was charged between liquidating and liquidated, erase it.
   *
   * @param {Amount<'nat'>} priorDebtAmount
   * @param {Amount<'nat'>} currentDebt
   */
  const updatePhantomInterest = (priorDebtAmount, currentDebt) => {
    const difference = AmountMath.subtract(currentDebt, priorDebtAmount);
    plan.phantomInterest = AmountMath.add(plan.phantomInterest, difference);
  };

  const runFlow1 = () => {
    // Flow #1: no shortfall
    const collateralToDistribute = AmountMath.isGTE(
      collateralProceeds,
      totalPenalty,
    );

    const distributableCollateral = collateralToDistribute
      ? AmountMath.subtract(collateralProceeds, totalPenalty)
      : AmountMath.makeEmptyFromAmount(collateralProceeds);

    plan.debtToBurn = totalDebt;
    plan.mintedProceeds = mintedProceeds;
    plan.mintedForReserve = accounting.overage;

    // return remaining funds to vaults before closing

    let leftToStage = distributableCollateral;

    // iterate from best to worst, returning collateral until it has
    // been exhausted. Vaults after that get nothing.
    for (const [vault, amounts] of bestToWorst) {
      const { collateralAmount: vCollat, debtAmount } = amounts;
      updatePhantomInterest(debtAmount, vault.getCurrentDebt());

      const price = makeRatioFromAmounts(mintedProceeds, collateralSold);

      // max return is vault value reduced by debt and penalty value
      const debtCollat = ceilDivideBy(debtAmount, price);
      const penaltyCollat = ceilMultiplyBy(debtAmount, debtPortion);
      const lessCollat = AmountMath.add(debtCollat, penaltyCollat);

      const maxCollat = AmountMath.isGTE(vCollat, lessCollat)
        ? AmountMath.subtract(vCollat, lessCollat)
        : AmountMath.makeEmptyFromAmount(vCollat);
      if (!AmountMath.isEmpty(leftToStage)) {
        const collatReturn = AmountMath.min(leftToStage, maxCollat);
        leftToStage = AmountMath.subtract(leftToStage, collatReturn);
        plan.transfers.push([
          liqSeat,
          vault.getVaultSeat(),
          { Collateral: collatReturn },
        ]);
      }
    }

    plan.collateralForReserve = collateralToDistribute
      ? AmountMath.add(leftToStage, totalPenalty)
      : collateralProceeds;
    plan.liquidationsCompleted = bestToWorst.length;
  };

  const runFlow2a = () => {
    // charge penalty if proceeds are sufficient
    const penaltyInMinted = ceilMultiplyBy(totalDebt, penaltyRate);
    const recoveredDebt = AmountMath.min(
      AmountMath.add(totalDebt, penaltyInMinted),
      mintedProceeds,
    );

    plan.debtToBurn = recoveredDebt;

    const coverDebt = AmountMath.isGTE(mintedProceeds, recoveredDebt);
    const distributable = coverDebt
      ? AmountMath.subtract(mintedProceeds, recoveredDebt)
      : AmountMath.makeEmptyFromAmount(mintedProceeds);
    let mintedRemaining = distributable;

    const vaultPortion = makeRatioFromAmounts(distributable, totalCollateral);

    // iterate from best to worst returning remaining funds to vaults
    /** @type {Array<[Vault, { collateralAmount: Amount<'nat'>, debtAmount:  Amount<'nat'>}]>} */
    for (const [vault, balance] of bestToWorst) {
      // from best to worst, return minted above penalty if any remains
      const { collateralAmount: vCollat, debtAmount } = balance;
      const vaultShare = floorMultiplyBy(vCollat, vaultPortion);
      updatePhantomInterest(debtAmount, vault.getCurrentDebt());

      if (!AmountMath.isEmpty(mintedRemaining)) {
        const mintedToReturn = AmountMath.isGTE(mintedRemaining, vaultShare)
          ? vaultShare
          : mintedRemaining;
        mintedRemaining = AmountMath.subtract(mintedRemaining, mintedToReturn);
        const seat = vault.getVaultSeat();
        plan.transfers.push([liqSeat, seat, { Minted: mintedToReturn }]);
      }
    }
    plan.liquidationsCompleted = bestToWorst.length;
  };

  const runFlow2b = () => {
    plan.debtToBurn = totalDebt;
    plan.mintedForReserve = accounting.overage;

    // reconstitute vaults until collateral is insufficient
    let reconstituteVaults = AmountMath.isGTE(collateralProceeds, totalPenalty);

    // charge penalty if proceeds are sufficient
    const distributableCollateral = reconstituteVaults
      ? AmountMath.subtract(collateralProceeds, totalPenalty)
      : AmountMath.makeEmptyFromAmount(collateralProceeds);

    let collatRemaining = distributableCollateral;

    let shortfallToReserve = accounting.shortfall;
    const reduceCollateral = amount =>
      (plan.actualCollateralSold = AmountMath.add(
        plan.actualCollateralSold,
        amount,
      ));

    // iterate from best to worst attempting to reconstitute, by
    // returning remaining funds to vaults
    /** @type {Array<[Vault, { collateralAmount: Amount<'nat'>, debtAmount:  Amount<'nat'>}]>} */
    for (const [vault, balance] of bestToWorst) {
      const { collateralAmount: vCollat, debtAmount } = balance;

      // according to #7123, Collateral for penalty =
      //    vault debt / total debt * total liquidation penalty
      const vaultPenalty = ceilMultiplyBy(debtAmount, debtPortion);
      const collatPostPenalty = AmountMath.isGTE(vCollat, vaultPenalty)
        ? AmountMath.subtract(vCollat, vaultPenalty)
        : emptyCollateral;
      const vaultDebt = floorMultiplyBy(debtAmount, debtPortion);
      if (
        reconstituteVaults &&
        !AmountMath.isEmpty(collatPostPenalty) &&
        AmountMath.isGTE(collatRemaining, collatPostPenalty) &&
        AmountMath.isGTE(totalDebt, debtAmount)
      ) {
        collatRemaining = AmountMath.subtract(
          collatRemaining,
          collatPostPenalty,
        );
        shortfallToReserve = AmountMath.isGTE(shortfallToReserve, debtAmount)
          ? AmountMath.subtract(shortfallToReserve, debtAmount)
          : AmountMath.makeEmptyFromAmount(shortfallToReserve);
        const seat = vault.getVaultSeat();
        // must reinstate after atomicRearrange(), so we record them.
        plan.vaultsToReinstate.push(vault);
        reduceCollateral(vaultDebt);
        plan.transfers.push([liqSeat, seat, { Collateral: collatPostPenalty }]);
      } else {
        reconstituteVaults = false;
        plan.liquidationsCompleted += 1;
        updatePhantomInterest(debtAmount, vault.getCurrentDebt());

        reduceCollateral(vCollat);
      }
    }

    plan.liquidationsAborted = plan.transfers.length;

    const collateralInLiqSeat = liqSeat.getCurrentAllocation().Collateral;
    plan.collateralForReserve = collateralInLiqSeat;

    if (
      !AmountMath.isEqual(
        collateralInLiqSeat,
        AmountMath.add(collatRemaining, totalPenalty),
      )
    ) {
      console.error(
        `⚠️ Excess collateral remaining sent to reserve. Expected ${q(
          collatRemaining,
        )}, sent ${q(collateralInLiqSeat)}`,
      );
    }
    plan.accounting.shortfall = shortfallToReserve;
  };

  try {
    if (AmountMath.isEmpty(accounting.shortfall)) {
      // Flow #1: no shortfall
      runFlow1();
    } else if (AmountMath.isEmpty(collateralProceeds)) {
      // Flow #2a
      runFlow2a();
    } else {
      // Flow #2b: There's unsold collateral; some vaults may be reinstated.
      runFlow2b();
    }
  } catch (err) {
    console.error('🚨 Failure running distribution flow:', err);
    // continue to return `plan` in the state that was reached
  }

  return harden(plan);
};
harden(calculateDistributionPlan);
