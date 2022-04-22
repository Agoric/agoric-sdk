/* eslint-disable no-await-in-loop */
// @ts-check

import { E } from '@endo/eventual-send';
import {
  getAmountOut,
  makeRatio,
  assertProposalShape,
  offerTo,
  natSafeMath as NatMath,
  ceilMultiplyBy,
  oneMinus,
} from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { makeTracer } from '../makeTracer.js';

const { details: X } = assert;
const trace = makeTracer('LiqI');

/**
 * @file
 * This contract liquidates a payment in multiple tranches to limit the
 * price impact on the AMM of any one sale. Each block it will compute
 * a tranche of collateral to sell, where the size is a function of
 * the amount of that collateral in the AMM pool and the desired price impact.
 * It then gets 3 prices for the current tranche:
 * - AMM quote - compute XYK locally based on the pool sizes
 * - Reserve quote - based on a low price at which the Reserve will purchase
 * - Oracle quote - provided by the oracle that triggered liquidation
 * - Oracle limit - a limit that is DIVERGENCE_TOLERANCE below the
 *   Oracle quote.
 * Then sell based on the following:
 * - If the AMM quote is *below* the oracle limit, skip this block
 *   to wait for oracle and AMM prices to converge.
 * - If the Reserve quote is higher than the AMM quote, sell to the
 *   Reserve with a `want` of the Oracle limit
 * - Otherwise, sell to the AMM with a `want` of the Oracle limit
 *
 * Selling uses the `oracleLimit as the `want` as the limit to allowed
 * slippage, and provides the remaining `debt` as the `stopAfter` so
 * that we sell no more than is needed to pay off the debt.
 *
 * TODO integrate the reserve, including the above Reserve strategies.
 */

/** @type {ContractStartFn} */
const start = async zcf => {
  const {
    amm,
    priceAuthority,
    timerService,
    debtBrand,
    MaxImpactBP,
    OracleTolerance,
    AMMMaxSlippage,
  } = /** @type {LiquidationContractTerms} */ zcf.getTerms();

  trace('terms', zcf.getTerms());
  const nextBlock = async () => E(timerService).delay(1n);

  const SCALE = 1_000_000n;
  const BASIS_POINTS = 10_000n * SCALE;
  const BP2 = BASIS_POINTS * BASIS_POINTS;
  const ONE = BASIS_POINTS;

  const asFloat = (numerator, denominator) =>
    Number(numerator) / Number(denominator);

  /**
   * Compute the tranche size whose sale on the AMM would have
   * a price impact of MAX_IMPACT_BP.
   * This doesn't use ratios so that it is usable for any brand
   *
   * @param {Amount} poolSize
   * @param {bigint} maxImpactBP
   * @param {bigint} feeBP
   * @returns {Amount}
   */
  const maxTrancheWithFees = (poolSize, maxImpactBP, feeBP) => {
    trace('maxTrancheWithFees', poolSize, maxImpactBP, feeBP);
    const maxImpactScaled = maxImpactBP * SCALE;
    const ammFeeScaled = feeBP * SCALE;
    // sqrt(impact + 1) - 1
    // Since we take SQRT but want to be BP, multiply in BP
    const impactFactor =
      BigInt(
        Math.ceil(Math.sqrt(Number((maxImpactScaled + ONE) * BASIS_POINTS))),
      ) - ONE;
    const impactWithFee = impactFactor * (ONE - ammFeeScaled);
    return AmountMath.make(
      poolSize.brand,
      NatMath.ceilDivide(NatMath.multiply(poolSize.value, impactWithFee), BP2),
    );
  };

  function computeOracleLimit(oracleQuote, oracleTolerance) {
    return ceilMultiplyBy(getAmountOut(oracleQuote), oneMinus(oracleTolerance));
  }

  const getAMMFeeBP = async () => {
    const zoe = zcf.getZoeService();
    const instance = await E(zoe).getInstance(E(amm).makeSwapInvitation());
    const terms = await E(zoe).getTerms(instance);
    // trace('amm terms', terms);
    const { poolFeeBP, protocolFeeBP } = terms;
    return poolFeeBP + protocolFeeBP;
  };

  const AMMFeeBP = await getAMMFeeBP();

  const estimateAMMProceeds = (
    poolCentral,
    poolCollateral,
    tranche,
    debt,
    maxSlip,
  ) => {
    const k = NatMath.multiply(poolCentral.value, poolCollateral.value);
    const postSaleCollateral = AmountMath.add(tranche, poolCollateral);
    const estimateCentral = NatMath.subtract(
      poolCentral.value,
      NatMath.floorDivide(k, postSaleCollateral.value),
    );
    const estimateAmount = AmountMath.make(debt.brand, estimateCentral);
    const minAmmProceeds = ceilMultiplyBy(estimateAmount, oneMinus(maxSlip));
    trace('AMM estimate', {
      tranche,
      minAmmProceeds,
      poolCentral,
      poolCollateral,
    });
    return minAmmProceeds;
  };

  /**
   *
   * @param {ZCFSeat} seat
   * @param {Amount} originalDebt
   * @yields {LiquidationStep}
   */
  async function* processTranches(seat, originalDebt) {
    let proceedsSoFar = seat.getAmountAllocated('Out');
    let toSell = seat.getAmountAllocated('In');
    while (
      !AmountMath.isGTE(proceedsSoFar, originalDebt) &&
      !AmountMath.isEmpty(toSell)
    ) {
      const debt = AmountMath.subtract(originalDebt, proceedsSoFar);
      const { Secondary: poolCollateral, Central: poolCentral } = await E(
        amm,
      ).getPoolAllocation(toSell.brand);
      const maxAllowedTranche = maxTrancheWithFees(
        poolCollateral,
        MaxImpactBP,
        AMMFeeBP,
      );
      trace('TRANCHE', asFloat(maxAllowedTranche.value, 100000n));
      const tranche = AmountMath.min(maxAllowedTranche, toSell);
      // compute the expected proceeds from the AMM for tranche
      const minAmmProceeds = estimateAMMProceeds(
        poolCentral,
        poolCollateral,
        tranche,
        debt,
        AMMMaxSlippage,
      );

      // this could use a unit rather than the tranche size to run concurrently
      /** @type PriceQuote */
      const oracleQuote = await E(priceAuthority).quoteGiven(
        tranche,
        debtBrand,
      );
      const oracleLimit = computeOracleLimit(oracleQuote, OracleTolerance);

      trace('TRANCHE', {
        debt,
        tranche,
        minAmmProceeds,
        oracleLimit,
        poolCentral,
        poolCollateral,
      });
      if (AmountMath.isGTE(minAmmProceeds, oracleLimit)) {
        yield {
          collateral: tranche,
          ammProceeds: minAmmProceeds,
          debt,
          oracleLimit,
        };
      } else {
        trace('SKIP');
      }
      proceedsSoFar = seat.getAmountAllocated('Out');
      toSell = seat.getAmountAllocated('In');
      if (
        AmountMath.isGTE(proceedsSoFar, originalDebt) ||
        AmountMath.isEmpty(toSell)
      ) {
        trace('exiting async loop');
        return;
      }
      await nextBlock();
    }
  }

  async function sellTranche(debtorSeat, collateral, debt, oracleLimit) {
    const swapInvitation = E(amm).makeSwapInvitation();
    const want = AmountMath.min(debt, oracleLimit);
    // TODO if the debt shouldn't require all the collatearal to cover it,
    // this may not provide relevant offer safety
    const proposal = {
      give: { In: collateral },
      want: { Out: want },
    };
    const { deposited, userSeatPromise: liqSeat } = await offerTo(
      zcf,
      swapInvitation,
      undefined, // The keywords were mapped already
      proposal,
      debtorSeat,
      debtorSeat,
      { stopAfter: debt },
    );
    await Promise.all([E(liqSeat).getOfferResult(), deposited]);
    const amounts = await E(liqSeat).getCurrentAllocation();
    trace('offerResult', { amounts });
  }

  const debtorHook = async (debtorSeat, { debt: originalDebt }) => {
    trace('LIQ', originalDebt);
    assertProposalShape(debtorSeat, {
      give: { In: null },
    });
    assert(
      originalDebt.brand === debtBrand,
      X`Cannot liquidate to ${originalDebt.brand}`,
    );
    for await (const t of processTranches(debtorSeat, originalDebt)) {
      const { collateral, oracleLimit, ammProceeds, debt } = t;
      trace(`OFFER TO DEBT: `, {
        collateral,
        ammProceeds,
        oracleLimit,
        debt,
      });
      const collateralBefore = debtorSeat.getAmountAllocated('In');
      const proceedsBefore = debtorSeat.getAmountAllocated('Out');

      await sellTranche(debtorSeat, collateral, debt, oracleLimit);

      const proceedsAfter = debtorSeat.getAmountAllocated('Out');
      if (AmountMath.isEqual(proceedsBefore, proceedsAfter)) {
        // nothing got sold
        const collateralAfter = debtorSeat.getAmountAllocated('In');
        trace('NOSELL', {
          proceedsBefore,
          proceedsAfter,
          collateralBefore,
          collateralAfter,
        });
      }
    }
    debtorSeat.exit();
    trace('exit seat');
  };

  const creatorFacet = Far('debtorInvitationCreator', {
    makeDebtorInvitation: () => zcf.makeInvitation(debtorHook, 'Liquidate'),
  });

  // @ts-ignore
  return harden({ creatorFacet });
};

const makeLiquidationStrategy = creatorFacet => {
  const makeInvitation = () => E(creatorFacet).makeDebtorInvitation();

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

  return {
    makeInvitation,
    keywordMapping,
    makeProposal,
  };
};

harden(start);
harden(makeLiquidationStrategy);

export { start, makeLiquidationStrategy };
