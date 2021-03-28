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
  const sconeDebt = vaultKit.vault.getDebtAmount();
  const { sconeBrand } = sconeDebt.brand;

  const vaultSeat = vaultKit.vaultSeat;
  const collateralToSell = vaultSeat.getAmountAllocated(
    'Collateral',
    collateralBrand,
  );
  const { deposited, userSeatPromise: liqSeat } = await offerTo(
    zcf,
    strategy.makeInvitation(sconeDebt),
    strategy.keywordMapping(),
    strategy.makeProposal(collateralToSell, sconeDebt),
    vaultSeat,
  );
  trace(` offeredTo`, sconeDebt);

  // await deposited, but we don't need the value.
  await Promise.all([deposited, E(liqSeat).getOfferResult()]);

  // Now we need to know how much was sold so we can pay off the debt
  const sconeProceedsAmount = vaultSeat.getAmountAllocated(
    'Scones',
    sconeBrand,
  );

  trace('scones PROCEEDS', sconeProceedsAmount);

  const otherSconeProceedsAmount = await E(liqSeat).getCurrentAllocation();
  trace('other proceeds', otherSconeProceedsAmount);

  const isUnderwater = !amountMath.isGTE(sconeProceedsAmount, sconeDebt);
  const sconesToBurn = isUnderwater ? sconeProceedsAmount : sconeDebt;
  burnLosses({ Scones: sconesToBurn }, vaultSeat);
  vaultKit.liquidated(amountMath.subtract(sconeDebt, sconesToBurn));

  // any remaining scones plus anything else leftover from the sale are refunded
  vaultSeat.exit();
}

// The default strategy converts of all the collateral to scones using autoswap,
// and refunds any excess scones.
export function makeDefaultLiquidationStrategy(autoswap) {
  function keywordMapping() {
    return harden({
      Collateral: 'In',
      Scones: 'Out',
    });
  }

  function makeProposal(collateral, scones) {
    return harden({
      give: { In: collateral },
      want: { Out: amountMath.makeEmptyFromAmount(scones) },
    });
  }

  trace(`return from makeDefault`);

  return {
    makeInvitation: () => E(autoswap).makeSwapInInvitation(),
    keywordMapping,
    makeProposal,
  };
}
