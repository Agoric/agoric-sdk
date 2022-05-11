// @ts-check
// @jessie-check

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';
import { makeRatio, offerTo } from '@agoric/zoe/src/contractSupport/index.js';
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
 * @param {Vault} vault
 * @param {(losses: Amount,
 *             zcfSeat: ZCFSeat
 *            ) => void} burnLosses
 * @param {Liquidator}  liquidator
 * @param {Brand} collateralBrand
 * @param {ZCFSeat} penaltyPoolSeat
 * @param {Ratio} penaltyRate
 * @returns {Promise<Vault>}
 */
const liquidate = async (
  zcf,
  vault,
  burnLosses,
  liquidator,
  collateralBrand,
  penaltyPoolSeat,
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
    harden({ Collateral: 'In', RUN: 'Out' }),
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
  // all the proceeds from AMM sale are on the vault seat instead of a staging seat
  // ??? ^ okay?

  const runToBurn = AmountMath.min(proceeds.RUN, debt);
  trace('before burn', { debt, proceeds, runToBurn });
  burnLosses(runToBurn, vaultZcfSeat);

  // Accounting complete. Update the vault state.
  vault.liquidated(AmountMath.subtract(debt, runToBurn));

  // remaining funds are left on the vault for the user to close and claim
  return vault;
};

const liquidationDetailTerms = debtBrand =>
  harden({
    MaxImpactBP: 50n,
    OracleTolerance: makeRatio(30n, debtBrand),
    AMMMaxSlippage: makeRatio(30n, debtBrand),
  });

harden(liquidate);
harden(liquidationDetailTerms);

export { liquidate, liquidationDetailTerms };
