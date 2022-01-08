// @ts-check

import { E } from '@agoric/eventual-send';
import { AmountMath } from '@agoric/ertp';
import { offerTo } from '@agoric/zoe/src/contractSupport/index.js';
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
 * @type {VaultFactoryLiquidate}
 */
const liquidate = async (
  zcf,
  vaultKit,
  burnLosses,
  strategy,
  collateralBrand,
) => {
  vaultKit.liquidating();
  const runDebt = vaultKit.vault.getDebtAmount();
  const { brand: runBrand } = runDebt;
  const { vaultSeat, liquidationZcfSeat: liquidationSeat } = vaultKit;

  const collateralToSell = vaultSeat.getAmountAllocated(
    'Collateral',
    collateralBrand,
  );
  const { deposited, userSeatPromise: liqSeat } = await offerTo(
    zcf,
    strategy.makeInvitation(runDebt),
    strategy.keywordMapping(),
    strategy.makeProposal(collateralToSell, runDebt),
    vaultSeat,
    liquidationSeat,
  );
  trace(` offeredTo`, collateralToSell, runDebt);

  // await deposited, but we don't need the value.
  await Promise.all([deposited, E(liqSeat).getOfferResult()]);

  // Now we need to know how much was sold so we can pay off the debt
  const runProceedsAmount = liquidationSeat.getAmountAllocated('RUN', runBrand);

  trace('RUN PROCEEDS', runProceedsAmount);

  const otherRunProceedsAmount = await E(liqSeat).getCurrentAllocation();
  trace('other proceeds', otherRunProceedsAmount);

  const isUnderwater = !AmountMath.isGTE(runProceedsAmount, runDebt);
  const runToBurn = isUnderwater ? runProceedsAmount : runDebt;
  burnLosses(harden({ RUN: runToBurn }), liquidationSeat);
  vaultKit.liquidated(AmountMath.subtract(runDebt, runToBurn));

  // any remaining RUN plus anything else leftover from the sale are refunded
  vaultSeat.exit();
  liquidationSeat.exit();
  vaultKit.liquidationPromiseKit.resolve('Liquidated');
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
