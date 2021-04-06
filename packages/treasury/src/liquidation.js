// @ts-check

import { E } from '@agoric/eventual-send';
import { amountMath } from '@agoric/ertp';
import { offerTo } from '@agoric/zoe/src/contractSupport';
import { makeTracer } from './makeTracer';

const trace = makeTracer('LIQ');

// Liquidates a Vault, using the strategy to parameterize the particular
// contract being used. The strategy provides a KeywordMapping and proposal
// suitable for `offerTo()`, and an invitation.
//
// Once collateral has been sold using the contract, we burn the amount
// necessary to cover the debt and return the remainder.
export async function liquidate(
  zcf,
  vaultKit,
  burnLosses,
  strategy,
  collateralBrand,
) {
  const runDebt = vaultKit.vault.getDebtAmount();
  const { runBrand } = runDebt.brand;

  const vaultSeat = vaultKit.vaultSeat;
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
  );
  trace(` offeredTo`, runDebt);

  // await deposited, but we don't need the value.
  await Promise.all([deposited, E(liqSeat).getOfferResult()]);

  // Now we need to know how much was sold so we can pay off the debt
  const runProceedsAmount = vaultSeat.getAmountAllocated('RUN', runBrand);

  trace('RUN PROCEEDS', runProceedsAmount);

  const otherRunProceedsAmount = await E(liqSeat).getCurrentAllocation();
  trace('other proceeds', otherRunProceedsAmount);

  const isUnderwater = !amountMath.isGTE(runProceedsAmount, runDebt);
  const runToBurn = isUnderwater ? runProceedsAmount : runDebt;
  burnLosses({ RUN: runToBurn }, vaultSeat);
  vaultKit.liquidated(amountMath.subtract(runDebt, runToBurn));

  // any remaining RUN plus anything else leftover from the sale are refunded
  vaultSeat.exit();
}

// The default strategy converts of all the collateral to RUN using autoswap,
// and refunds any excess RUN.
export function makeDefaultLiquidationStrategy(autoswap) {
  function keywordMapping() {
    return harden({
      Collateral: 'In',
      RUN: 'Out',
    });
  }

  function makeProposal(collateral, run) {
    return harden({
      give: { In: collateral },
      want: { Out: amountMath.makeEmptyFromAmount(run) },
    });
  }

  trace(`return from makeDefault`);

  return {
    makeInvitation: () => E(autoswap).makeSwapInInvitation(),
    keywordMapping,
    makeProposal,
  };
}
