// @ts-check
// @jessie-check

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';
import {
  ceilMultiplyBy,
  makeRatio,
  offerTo,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeTracer } from '../makeTracer.js';

const trace = makeTracer('LIQ');

/**
 * @param {Amount<'nat'>} proceeds
 * @param {Amount<'nat'>} debt - after incurring penalty
 * @param {Amount<'nat'>} penaltyPortion
 */
const partitionProceeds = (proceeds, debt, penaltyPortion) => {
  const debtPaid = AmountMath.min(proceeds, debt);

  // Pay as much of the penalty as possible
  const penaltyProceeds = AmountMath.min(penaltyPortion, debtPaid);
  const runToBurn = AmountMath.subtract(debtPaid, penaltyProceeds);

  return { debtPaid, penaltyProceeds, runToBurn };
};

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
 * @param {(losses: Amount,
 *             zcfSeat: ZCFSeat
 *            ) => void} burnLosses
 * @param {Liquidator}  liquidator
 * @param {Brand} collateralBrand
 * @param {ZCFSeat} penaltyPoolSeat
 * @param {Ratio} penaltyRate
 * @returns {Promise<InnerVault>}
 */
const liquidate = async (
  zcf,
  innerVault,
  burnLosses,
  liquidator,
  collateralBrand,
  penaltyPoolSeat,
  penaltyRate,
) => {
  trace('liquidate start', innerVault);
  innerVault.liquidating();

  const debtBeforePenalty = innerVault.getCurrentDebt();
  const penalty = ceilMultiplyBy(debtBeforePenalty, penaltyRate);

  const debt = AmountMath.add(debtBeforePenalty, penalty);

  const vaultZcfSeat = innerVault.getVaultSeat();

  const collateralToSell = vaultZcfSeat.getAmountAllocated(
    'Collateral',
    collateralBrand,
  );
  trace(`liq prep`, collateralToSell, debtBeforePenalty, debt);

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
    harden({ debt }),
  );
  trace(` offeredTo`, collateralToSell, debt);

  // await deposited, but we don't need the value.
  await Promise.all([deposited, E(liqSeat).getOfferResult()]);

  // Now we need to know how much was sold so we can pay off the debt.
  // We can use this because only liquidation adds RUN to the vaultSeat.
  const { debtPaid, penaltyProceeds, runToBurn } = partitionProceeds(
    vaultZcfSeat.getAmountAllocated('RUN', debt.brand),
    debt,
    penalty,
  );

  trace({ debt, debtPaid, penaltyProceeds, runToBurn });

  // Allocate penalty portion of proceeds to a seat that will be transferred to reserve
  penaltyPoolSeat.incrementBy(
    vaultZcfSeat.decrementBy(harden({ RUN: penaltyProceeds })),
  );
  zcf.reallocate(penaltyPoolSeat, vaultZcfSeat);

  burnLosses(runToBurn, vaultZcfSeat);

  // Accounting complete. Update the vault state.
  innerVault.liquidated(AmountMath.subtract(debt, debtPaid));

  // remaining funds are left on the vault for the user to close and claim
  return innerVault;
};

const liquidationDetailTerms = debtBrand =>
  harden({
    MaxImpactBP: 50n,
    OracleTolerance: makeRatio(30n, debtBrand),
    AMMMaxSlippage: makeRatio(30n, debtBrand),
  });

harden(liquidate);
harden(partitionProceeds);
harden(liquidationDetailTerms);

export { liquidate, partitionProceeds, liquidationDetailTerms };
