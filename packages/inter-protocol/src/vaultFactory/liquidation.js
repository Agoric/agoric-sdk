// @ts-check
// @jessie-check

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';
import { makeRatio, offerTo } from '@agoric/zoe/src/contractSupport/index.js';
import { makeTracer } from '../makeTracer.js';

const trace = makeTracer('LIQ', false);

/**
 * Liquidates a Vault, using the strategy to parameterize the particular
 * contract being used. The strategy provides a KeywordMapping and proposal
 * suitable for `offerTo()`, and an invitation.
 *
 * Once collateral has been sold using the contract, we burn the amount
 * necessary to cover the debt and return the remainder.
 *
 * @param {ZCF} zcf
 * @param {Vault} vault
 * @param {Liquidator}  liquidator
 * @param {Brand} collateralBrand
 * @param {Ratio} penaltyRate
 */
const liquidate = async (
  zcf,
  vault,
  liquidator,
  collateralBrand,
  penaltyRate,
) => {
  trace('liquidate start', vault);
  vault.liquidating();

  const debt = vault.getCurrentDebt();

  const vaultZcfSeat = vault.getVaultSeat();

  const collateralToSell = vaultZcfSeat.getAmountAllocated(
    'Collateral',
    collateralBrand,
  );
  trace(`liq prep`, { collateralToSell, debt, liquidator });

  const { deposited, userSeatPromise: liqSeat } = await offerTo(
    zcf,
    E(liquidator).makeLiquidateInvitation(),
    harden({ Collateral: 'In', Minted: 'Out' }),
    harden({
      give: { In: collateralToSell },
      want: { Out: AmountMath.makeEmpty(debt.brand) },
    }),
    vaultZcfSeat,
    vaultZcfSeat,
    harden({ debt, penaltyRate }),
  );
  trace(` offeredTo`, { collateralToSell, debt });

  // await deposited and offer result, but ignore the latter
  const [proceeds] = await Promise.all([
    deposited,
    E(liqSeat).getOfferResult(),
  ]);
  // NB: all the proceeds from AMM sale are on the vault seat instead of a staging seat

  const [overage, shortfall] = AmountMath.isGTE(debt, proceeds.Minted)
    ? [
        AmountMath.makeEmptyFromAmount(debt),
        AmountMath.subtract(debt, proceeds.Minted),
      ]
    : [
        AmountMath.subtract(proceeds.Minted, debt),
        AmountMath.makeEmptyFromAmount(debt),
      ];

  const toBurn = AmountMath.min(proceeds.Minted, debt);
  // debt is fully settled, with toBurn and shortfall
  assert(AmountMath.isEqual(debt, AmountMath.add(toBurn, shortfall)));

  // Manager accounting changes determined. Update the vault state.
  vault.liquidated();
  // remaining funds are left on the vault for the user to close and claim

  // for manager's accounting
  return { proceeds: proceeds.Minted, overage, toBurn, shortfall };
};

const liquidationDetailTerms = debtBrand =>
  harden({
    MaxImpactBP: 50n,
    OracleTolerance: makeRatio(30n, debtBrand),
    AMMMaxSlippage: makeRatio(30n, debtBrand),
  });
/** @typedef {ReturnType<typeof liquidationDetailTerms>} LiquidationTerms */

harden(liquidate);
harden(liquidationDetailTerms);

export { liquidate, liquidationDetailTerms };
