// @ts-check
// @jessie-check

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';
import {
  floorMultiplyBy,
  offerTo,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeTracer } from '../makeTracer.js';

const trace = makeTracer('LIQ');

/**
 * Liquidates a Vault, using the strategy to parameterize the particular
 * contract being used. The strategy provides a KeywordMapping and proposal
 * suitable for `offerTo()`, and an invitation.
 *
 * Once collateral has been sold using the contract, we burn the amount
 * necessary to cover the debt and return the remainder.
 *
 * @param {ZCF} zcf
 * @param {InnerVault} innerVault
 * @param {(losses: AmountKeywordRecord,
 *             zcfSeat: ZCFSeat
 *            ) => void} burnLosses
 * @param {LiquidationStrategy} strategy
 * @param {Brand} collateralBrand
 * @param {ZCFSeat} penaltyPoolSeat
 * @param {Ratio} penaltyRate
 * @returns {Promise<InnerVault>}
 */
const liquidate = async (
  zcf,
  innerVault,
  burnLosses,
  strategy,
  collateralBrand,
  penaltyPoolSeat,
  penaltyRate,
) => {
  innerVault.liquidating();

  const debtBeforePenalty = innerVault.getCurrentDebt();
  const penalty = floorMultiplyBy(debtBeforePenalty, penaltyRate);

  const debt = AmountMath.add(debtBeforePenalty, penalty);

  const vaultZcfSeat = innerVault.getVaultSeat();

  const collateralToSell = vaultZcfSeat.getAmountAllocated(
    'Collateral',
    collateralBrand,
  );

  // XXX problems with upgrade
  const { deposited, userSeatPromise: liqSeat } = await offerTo(
    zcf,
    strategy.makeInvitation(debt),
    strategy.keywordMapping(),
    strategy.makeProposal(collateralToSell, debt),
    vaultZcfSeat,
  );
  trace(` offeredTo`, collateralToSell, debt);

  // await deposited, but we don't need the value.
  await Promise.all([deposited, E(liqSeat).getOfferResult()]);

  // Now we need to know how much was sold so we can pay off the debt.
  // We can use this because only liquidation adds RUN to the vaultSeat.
  const proceeds = vaultZcfSeat.getAmountAllocated('RUN', debt.brand);

  const isShortfall = !AmountMath.isGTE(proceeds, debt);
  const debtPaid = isShortfall ? proceeds : debt;

  // Pay as much of the penalty as possible
  const penaltyProceeds = AmountMath.min(penalty, debtPaid);
  const runToBurn = AmountMath.subtract(debtPaid, penaltyProceeds);

  trace({ debt, isShortfall, debtPaid, penaltyProceeds, runToBurn });

  // Allocate penalty portion of proceeds to a seat that will be transferred to reserve
  penaltyPoolSeat.incrementBy(
    vaultZcfSeat.decrementBy(harden({ RUN: penaltyProceeds })),
  );
  zcf.reallocate(penaltyPoolSeat, vaultZcfSeat);

  burnLosses(harden({ RUN: runToBurn }), vaultZcfSeat);

  // Accounting complete. Update the vault state.
  innerVault.liquidated(AmountMath.subtract(debt, debtPaid));

  // remaining funds are left on the vault for the user to close and claim
  return innerVault;
};

/**
 * The default strategy converts of all the collateral to RUN using autoswap,
 * and refunds any excess RUN.
 *
 * @type {(XYKAMMPublicFacet) => LiquidationStrategy}
 */
const makeDefaultLiquidationStrategy = amm => {
  const keywordMapping = () =>
    harden({
      Collateral: 'In',
      RUN: 'Out',
    });

  const makeProposal = (collateral, run) =>
    harden({
      give: { In: collateral },
      want: { Out: AmountMath.makeEmptyFromAmount(run) },
    });

  trace(`return from makeDefault`);

  return {
    makeInvitation: () => E(amm).makeSwapInInvitation(),
    keywordMapping,
    makeProposal,
  };
};

harden(makeDefaultLiquidationStrategy);
harden(liquidate);

export { makeDefaultLiquidationStrategy, liquidate };
