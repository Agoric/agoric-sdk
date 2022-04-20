/* eslint-disable no-await-in-loop */
// no @ts-check

import { E } from '@endo/eventual-send';
import {
  getAmountOut,
  makeRatio,
  assertProposalShape,
  offerTo,
  natSafeMath as NatMath,
} from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';

import { ceilMultiplyBy } from '@agoric/zoe/src/contractSupport/ratio';
import { makeTracer } from '../makeTracer.js';
// import { quote } from '@agoric/assert';

const { details: X } = assert;
const trace = makeTracer('LiqI');

/**
 * This contract liquidates a payment in multiple tranches to limit the
 * price impact an the AMM of any one sale. Each block it will compute
 * a tranche of collateral to sell, where the size is a function of
 * the amount of that collateral in the AMM pool and the desired price impact.
 * It then gets 3 prices for the current tranche:
 * - AMM quote - compute xYK locally based on the pool sizes
 * - Reserve quote - based on a low price at which the Reserve will purchase
 * - Oracle quote - provide by the oracle that triggered liquidation
 * - Oracle limit - a limit that is DIVERGENCE_TOLERANCE below the
 *   Oracle quote.
 * These sell based on the following:
 * - If the AMM quote is *below* the oracle limit, skip this block
 *   to wait for oracle and AMM prices to converge.
 *    - should it still sell to teh Reserve here?
 * - If the Reserve quote is higher than the AMM quote, sell to the
 *   Reserve with a `want` of the Oracle limit
 * - Otherwise, sell to the AMM with a `want` of the Oracle limit
 * If selling a tranche for the minimum would pay off the debt (`isLast`),
 * then use sell using`swapOut` with a minimum of the debt. If that fails
 * this is not the last tranche, tehn sell with the `swapIn` operation,
 * using the oracle price reference as the minimum.
 *
 * TODO integrate the reserve
 */

/** @type {ContractStartFn} */
const start = async zcf => {
  const { amm, priceAuthority, timerService, debtBrand } =
    /** @type {LiquidationContractTerms} */ zcf.getTerms();
  const nextBlock = async () => E(timerService).delay(1n);

  // TODO make subject to governance
  const SCALE = 1_000_000n;
  const BASIS_POINTS = 10_000n * SCALE;
  const BP2 = BASIS_POINTS * BASIS_POINTS;

  const AMM_FEE_BP = 30n * SCALE;
  const MAX_IMPACT_BP = 50n * SCALE;
  // sqrt(impact + 1) - 1
  // Since we take SQRT but want to be BP, multiply in BP
  const IMPACT_FACTOR_BP =
    BigInt(
      Math.ceil(
        Math.sqrt(Number((MAX_IMPACT_BP + BASIS_POINTS) * BASIS_POINTS)),
      ),
    ) - BASIS_POINTS;
  const IMPACT_FACTOR_BP2 = IMPACT_FACTOR_BP * (BASIS_POINTS - AMM_FEE_BP);

  const asFloat = (numerator, denominator) =>
    Number(numerator) / Number(denominator);
  trace(
    'FACTORS',
    asFloat(AMM_FEE_BP, BASIS_POINTS),
    asFloat(MAX_IMPACT_BP, BASIS_POINTS),
    Math.sqrt(Number(MAX_IMPACT_BP + BASIS_POINTS)),
    asFloat(IMPACT_FACTOR_BP, BASIS_POINTS),
    asFloat(IMPACT_FACTOR_BP2, BP2),
  );

  // How close the sale price on the AMM must be to the expected price from the oracle
  // quote must be at least 70% 0f what the oracle says
  const ORACLE_TOLERANCE = 3000n * SCALE;
  const ORACLE_LIMIT_BP = makeRatio(
    BASIS_POINTS - ORACLE_TOLERANCE,
    debtBrand,
    BASIS_POINTS,
  );

  // 3% max slippage = 97% min
  const MAX_SLIPPED = makeRatio(9700n * SCALE, debtBrand, BASIS_POINTS);

  trace('CONSTANTS', {
    IMPACT_FACTOR_BP,
    BASIS_POINTS,
    IMPACT_FACTOR_BP2,
    BP2,
  });

  // the maximum number fo failure sina  row before we stop liquidating.
  // TODO make this larger andmake it reset on success
  const MAX_FAILURES = 4;
  let failures = 0;

  const computeAMMProceeds = (poolCentral, poolCollateral, tranche, debt) => {
    const k = NatMath.multiply(poolCentral.value, poolCollateral.value);
    const postSaleCollateral = AmountMath.add(tranche, poolCollateral);
    const quoteValue = NatMath.subtract(
      poolCentral.value,
      NatMath.floorDivide(k, postSaleCollateral.value),
    );
    const ammQuote = AmountMath.make(debt.brand, quoteValue);
    const minAmmProceeds = ceilMultiplyBy(ammQuote, MAX_SLIPPED);
    trace('AMM estimate', {
      tranche,
      minAmmProceeds,
      poolCentral,
      poolCollateral,
    });
    return minAmmProceeds;
  };

  /**
   * Compute the tranche size whose sale on the AMM would have
   * a price impact of MAX_IMPACT_BP.
   * This doesn't use ratios so that it is usable for any brand
   *
   * @param {Amount} poolSize
   * @returns {Amount}
   */
  const maxTrancheWithFees = poolSize =>
    AmountMath.make(
      poolSize.brand,
      NatMath.ceilDivide(
        NatMath.multiply(poolSize.value, IMPACT_FACTOR_BP2),
        BP2,
      ),
    );

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
      const maxAllowedTranche = maxTrancheWithFees(poolCollateral);
      trace('TRANCHE', asFloat(maxAllowedTranche.value, 100000n));
      const tranche = AmountMath.min(maxAllowedTranche, toSell);
      // compute the expected proceeds from the AMM for tranche
      const minAmmProceeds = computeAMMProceeds(
        poolCentral,
        poolCollateral,
        tranche,
        debt,
      );
      // true if the minimum proceeds will pay off the debt
      const isLast = AmountMath.isGTE(minAmmProceeds, debt);

      // this could use a unit rather than the tranche size to run concurrently
      /** @type PriceQuote */
      const oracleQuote = await E(priceAuthority).quoteGiven(
        tranche,
        debtBrand,
      );
      // TODO Make a governance parameter
      const oracleLimit = ceilMultiplyBy(
        getAmountOut(oracleQuote),
        ORACLE_LIMIT_BP,
      );

      trace('TRANCHE', {
        debt,
        tranche,
        minAmmProceeds,
        oracleLimit,
        isLast,
        poolCentral,
        poolCollateral,
      });
      if (AmountMath.isGTE(minAmmProceeds, oracleLimit)) {
        yield {
          collateral: tranche,
          ammProceeds: minAmmProceeds,
          debt,
          oracleLimit,
          isLast,
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

    // Just do the incremental liquidation for the debtorSeat
    // Three outcomes of total liquidation:
    // 1. the assets sell for more than the debt - covered
    // 2. the assets sell for less than the debt - shortfall
    // 3. we stop selling assets so we have both assets and remaining debt (reserve purchase)

    for await (const t of processTranches(debtorSeat, originalDebt)) {
      const { collateral, oracleLimit, ammProceeds, debt, isLast } = t;
      trace(`OFFER TO DEBT: `, {
        collateral,
        ammProceeds,
        oracleLimit,
        debt,
        isLast,
      });
      const collateralBefore = debtorSeat.getAmountAllocated('In');
      const proceedsBefore = debtorSeat.getAmountAllocated('Out');

      await sellTranche(debtorSeat, collateral, debt, oracleLimit);

      const proceedsAfter = debtorSeat.getAmountAllocated('Out');
      if (AmountMath.isEqual(proceedsBefore, proceedsAfter)) {
        const collateralAfter = debtorSeat.getAmountAllocated('In');
        trace('NOSELL', {
          proceedsBefore,
          proceedsAfter,
          collateralBefore,
          collateralAfter,
        });
        // nothing got sold
        failures += 1;
        if (failures > MAX_FAILURES) {
          throw Error(`Too many sequential failures ${failures}`);
        }
      }
    }
    debtorSeat.exit();
    trace('exit seat');
  };

  const creatorFacet = Far('debtorInvitationCreator', {
    makeDebtorInvitation: () => zcf.makeInvitation(debtorHook, 'Liquidate'),
  });

  return harden({ creatorFacet });
};

/** @type {MakeLiquidationStrategy} */
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
