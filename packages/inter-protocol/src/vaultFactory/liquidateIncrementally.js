/* eslint-disable no-await-in-loop */
import { E } from '@endo/eventual-send';
import {
  assertProposalShape,
  atomicTransfer,
  ceilMultiplyBy,
  getAmountOut,
  offerTo,
  oneMinus,
} from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { forever, makeTracer } from '@agoric/internal';

const { Fail } = assert;
const trace = makeTracer('LiqI', false);

/**
 * @file
 * This contract liquidates a payment in multiple tranches to limit the
 * price impact on the AMM of any one sale. Each block it will compute
 * a tranche of collateral to sell, where the size is a function of
 * the amount of that collateral in the AMM pool and the desired price impact.
 * It presently consults the AMM and Oracle for whether to sell.
 *
 * The next revision of this will work as follows...
 *
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

// TODO: (#7047) this file goes away shortly, and is here to keep vaults happy
// until we have a replacement
/**
 * @typedef {{
 *   amm: unknown,
 *   priceAuthority: PriceAuthority,
 *   reservePublicFacet: AssetReservePublicFacet,
 *   timerService: import('@agoric/time/src/types').TimerService,
 *   debtBrand: Brand<'nat'>,
 *   MaxImpactBP: NatValue,
 *   OracleTolerance: Ratio,
 *   AMMMaxSlippage: Ratio,
 * }} LiquidationContractTerms
 * @param {ZCF<LiquidationContractTerms>} zcf
 */
const start = async zcf => {
  const {
    priceAuthority,
    reservePublicFacet,
    timerService,
    debtBrand,
    OracleTolerance,
  } = zcf.getTerms();

  // #region penalty distribution
  const { zcfSeat: penaltyPoolSeat } = zcf.makeEmptySeatKit();
  const drainPenaltyPool = async () => {
    const addCollateral = await E(
      reservePublicFacet,
    ).makeAddCollateralInvitation();
    const proposal = harden({
      give: { Collateral: penaltyPoolSeat.getCurrentAllocation().Out },
    });
    const { deposited, userSeatPromise } = await offerTo(
      zcf,
      addCollateral,
      harden({ Out: 'Collateral' }),
      proposal,
      penaltyPoolSeat,
    );
    const [deposits] = await Promise.all([deposited, userSeatPromise]);
    trace('drainPenaltyPool deposited', deposits.Out);
  };
  // #endregion

  const computeOracleLimit = (oracleQuote, oracleTolerance) => {
    return ceilMultiplyBy(getAmountOut(oracleQuote), oneMinus(oracleTolerance));
  };

  /**
   * A generator that yields once per block, starting in the current block.
   *
   * @yields {void}
   */
  async function* oncePerBlock() {
    yield;
    while (true) {
      yield E(timerService).delay(1n);
    }
  }

  /**
   * Generate tranches to sell until the debt is paid off.
   *
   * @param {ZCFSeat} seat
   * @param {Amount} originalDebt
   * @yields {LiquidationStep}
   */
  async function* processTranches(seat, originalDebt) {
    for await (const _ of forever) {
      const proceedsSoFar = seat.getAmountAllocated('Out');
      const toSell = seat.getAmountAllocated('In');
      if (
        AmountMath.isGTE(proceedsSoFar, originalDebt) ||
        AmountMath.isEmpty(toSell)
      ) {
        trace('exiting processTranches loop');
        return;
      }
      await oncePerBlock();

      const tranche = toSell;

      // compute the expected proceeds from the AMM for tranche
      const debt = AmountMath.subtract(originalDebt, proceedsSoFar);

      // this could use a unit rather than the tranche size to run concurrently
      /** @type PriceQuote */
      const oracleQuote = await E(priceAuthority).quoteGiven(
        tranche,
        debtBrand,
      );
      const oracleLimit = computeOracleLimit(oracleQuote, OracleTolerance);

      trace('Tranche', { debt, tranche, oracleLimit });
      yield {
        collateral: tranche,
        debt,
        oracleLimit,
      };
    }
  }

  /**
   * @param {ZCFSeat} debtorSeat
   * @param {object} options
   * @param {Amount<'nat'>} options.debt Debt before penalties
   * @param {Ratio} options.penaltyRate
   */
  const handleLiquidateOffer = async (
    debtorSeat,
    { debt: originalDebt, penaltyRate },
  ) => {
    assertProposalShape(debtorSeat, {
      give: { In: null },
    });
    originalDebt.brand === debtBrand ||
      Fail`Cannot liquidate to ${originalDebt.brand}`;
    const penalty = ceilMultiplyBy(originalDebt, penaltyRate);
    const debtWithPenalty = AmountMath.add(originalDebt, penalty);
    trace('LIQ', { originalDebt, debtWithPenalty });

    for await (const t of processTranches(debtorSeat, debtWithPenalty)) {
      const { collateral, oracleLimit, ammProceeds, debt } = t;
      trace(`OFFER TO DEBT: `, {
        collateral,
        ammProceeds,
        oracleLimit,
        debt,
      });
      const collateralBefore = debtorSeat.getAmountAllocated('In');
      const proceedsBefore = debtorSeat.getAmountAllocated('Out');

      // AMM is gone. This liquidation contract will depart with #7047

      // await sellTranche(debtorSeat, collateral, debt, oracleLimit);

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

    // Now we need to know how much was sold so we can pay off the debt.
    // We can use this seat because only liquidation adds debt brand to it..
    const debtPaid = debtorSeat.getAmountAllocated('Out', debtBrand);
    const penaltyPaid = AmountMath.min(penalty, debtPaid);

    // Allocate penalty portion of proceeds to a seat that will hold it for transfer to reserve
    atomicTransfer(zcf, debtorSeat, penaltyPoolSeat, { Out: penaltyPaid });

    debtorSeat.exit();
    trace('exit seat');
    // trigger but don't await so it doesn't make liquidation itself fail
    drainPenaltyPool().catch(e =>
      console.error('🚨 error draining penalty pool', e),
    );
  };

  /**
   * @type {ERef<Liquidator>}
   */
  const creatorFacet = Far('debtorInvitationCreator (incrementally)', {
    makeLiquidateInvitation: () =>
      zcf.makeInvitation(handleLiquidateOffer, 'Liquidate'),
  });

  return harden({ creatorFacet });
};

harden(start);
export { start };
