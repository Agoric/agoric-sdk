// @ts-check

import { assert, details as X } from '@agoric/assert';
import { amountMath } from '@agoric/ertp';

import { assertProposalShape } from '../../contractSupport';

import '../../../exported';

/**
 * @typedef {Object} SwapPriceQuote
 *
 * @property {Amount} amountOut
 * @property {Amount} amountIn
 * @property {Amount|undefined} centralAmount
 * @property {Amount} protocolFee
 */

/**
 * @param {ContractFacet} zcf
 * @param {(brand: Brand) => boolean} isSecondary
 * @param {(brand: Brand) => boolean} isCentral
 * @param {(brand: Brand) => Pool} getPool
 * @param {(amountIn, brandOut) => SwapPriceQuote} getPriceGivenAvailableInput
 * @param {(brandIn, amountOut) => SwapPriceQuote} getPriceGivenRequiredOutput
 * @param {ZCFSeat} protocolSeat
 */
export const makeMakeSwapInvitation = (
  zcf,
  isSecondary,
  isCentral,
  getPool,
  getPriceGivenAvailableInput,
  getPriceGivenRequiredOutput,
  protocolSeat,
) => {
  function stageProtocolSeatFee(protocolFee) {
    const protocolStage = protocolSeat.stage({
      RUN: amountMath.add(
        protocolSeat.getAmountAllocated('RUN', protocolFee.brand),
        protocolFee,
      ),
    });
    return protocolStage;
  }

  // trade with a stated amountIn.
  const swapIn = seat => {
    assertProposalShape(seat, {
      give: { In: null },
      want: { Out: null },
    });
    const {
      give: { In: amountIn },
      want: {
        Out: { brand: brandOut },
      },
    } = seat.getProposal();
    const { brand: brandIn } = amountIn;

    // we could be swapping (1) central to secondary, (2) secondary to
    // central, or (3) secondary to secondary

    if (isCentral(brandIn) && isSecondary(brandOut)) {
      const brandOutPool = getPool(brandOut);
      const pool = getPool(brandOut);
      const {
        amountOut,
        amountIn: reducedAmountIn,
        protocolFee,
      } = getPriceGivenAvailableInput(amountIn, brandOut);

      const seatStage = seat.stage({
        In: amountMath.subtract(amountIn, reducedAmountIn),
        Out: amountOut,
      });
      const poolStage = pool.getPoolSeat().stage({
        Central: amountMath.add(
          brandOutPool.getCentralAmount(),
          amountMath.subtract(reducedAmountIn, protocolFee),
        ),
        Secondary: amountMath.subtract(
          brandOutPool.getSecondaryAmount(),
          amountOut,
        ),
      });
      zcf.reallocate(poolStage, seatStage, stageProtocolSeatFee(protocolFee));

      seat.exit();
      getPool(brandOut).updateState();
      return `Swap successfully completed.`;
    } else if (isSecondary(brandIn) && isCentral(brandOut)) {
      const brandInPool = getPool(brandIn);
      // this branch is very similar to the above, with only pool and the pool's
      // gains and losses changing. Sharing code makes it less readable.
      const pool = getPool(brandIn);
      // The protocolFee comes out of amountOut, which is provided by the pool
      const {
        amountOut,
        amountIn: reducedAmountIn,
        protocolFee,
      } = getPriceGivenAvailableInput(amountIn, brandOut);

      const seatStage = seat.stage({
        In: amountMath.subtract(amountIn, reducedAmountIn),
        Out: amountOut,
      });
      const poolStage = pool.getPoolSeat().stage({
        Central: amountMath.subtract(
          brandInPool.getCentralAmount(),
          amountMath.add(amountOut, protocolFee),
        ),
        Secondary: amountMath.add(
          brandInPool.getSecondaryAmount(),
          reducedAmountIn,
        ),
      });
      zcf.reallocate(poolStage, seatStage, stageProtocolSeatFee(protocolFee));

      seat.exit();
      getPool(brandIn).updateState();
      return `Swap successfully completed.`;
    } else if (isSecondary(brandIn) && isSecondary(brandOut)) {
      // The protocol fee is extracted from the proceeds of the Input pool
      // before depositing the remainder to the Output pool
      const brandInPool = getPool(brandIn);
      const brandOutPool = getPool(brandOut);

      const {
        amountIn: reducedAmountIn,
        amountOut,
        protocolFee,
        // @ts-ignore If has Central, should not be typed as PriceAmountPair
        centralAmount,
      } = getPriceGivenAvailableInput(amountIn, brandOut);

      const seatStage = seat.stage(
        harden({
          In: amountMath.subtract(amountIn, reducedAmountIn),
          Out: amountOut,
        }),
      );

      const poolBrandInStage = brandInPool.getPoolSeat().stage({
        Secondary: amountMath.add(
          brandInPool.getSecondaryAmount(),
          reducedAmountIn,
        ),
        Central: amountMath.subtract(
          brandInPool.getCentralAmount(),
          amountMath.add(centralAmount, protocolFee),
        ),
      });

      const poolBrandOutStage = brandOutPool.getPoolSeat().stage({
        Central: amountMath.add(brandOutPool.getCentralAmount(), centralAmount),
        Secondary: amountMath.subtract(
          brandOutPool.getSecondaryAmount(),
          amountOut,
        ),
      });

      zcf.reallocate(
        poolBrandInStage,
        poolBrandOutStage,
        seatStage,
        stageProtocolSeatFee(protocolFee),
      );
      seat.exit();
      getPool(brandIn).updateState();
      getPool(brandOut).updateState();
      return `Swap successfully completed.`;
    }

    assert.fail(X`brands were not recognized`);
  };

  // trade with a stated amount out.
  const swapOut = seat => {
    assertProposalShape(seat, {
      give: { In: null },
      want: { Out: null },
    });
    // The offer's amountOut is a minimum; the offeredAmountIn is a max.
    const {
      give: { In: offeredAmountIn },
      want: { Out: amountOut },
    } = seat.getProposal();
    const { brand: brandOut } = amountOut;
    const brandIn = offeredAmountIn.brand;

    // we could be swapping (1) central to secondary, (2) secondary to
    // central, or (3) secondary to secondary

    if (isCentral(brandOut) && isSecondary(brandIn)) {
      const brandInPool = getPool(brandIn);
      const pool = getPool(brandIn);
      const {
        amountIn,
        amountOut: improvedAmountOut,
        protocolFee,
      } = getPriceGivenRequiredOutput(brandIn, amountOut);

      if (!amountMath.isGTE(offeredAmountIn, amountIn)) {
        const reason = `offeredAmountIn ${offeredAmountIn} is insufficient to buy amountOut ${amountOut}`;
        throw seat.fail(Error(reason));
      }

      const seatStage = seat.stage({
        In: amountMath.subtract(offeredAmountIn, amountIn),
        Out: improvedAmountOut,
      });
      const poolStage = pool.getPoolSeat().stage({
        Central: amountMath.subtract(
          brandInPool.getCentralAmount(),
          amountMath.add(improvedAmountOut, protocolFee),
        ),
        Secondary: amountMath.add(brandInPool.getSecondaryAmount(), amountIn),
      });

      zcf.reallocate(poolStage, seatStage, stageProtocolSeatFee(protocolFee));
      seat.exit();
      getPool(brandIn).updateState();
      return `Swap successfully completed.`;
    } else if (isSecondary(brandOut) && isCentral(brandIn)) {
      const brandOutPool = getPool(brandOut);
      const pool = getPool(brandOut);
      const {
        amountIn,
        amountOut: improvedAmountOut,
        protocolFee,
      } = getPriceGivenRequiredOutput(brandIn, amountOut);

      const seatStage = seat.stage({
        In: amountMath.subtract(offeredAmountIn, amountIn),
        Out: improvedAmountOut,
      });
      const poolStage = pool.getPoolSeat().stage({
        Central: amountMath.add(
          brandOutPool.getCentralAmount(),
          amountMath.subtract(amountIn, protocolFee),
        ),
        Secondary: amountMath.subtract(
          brandOutPool.getSecondaryAmount(),
          improvedAmountOut,
        ),
      });

      zcf.reallocate(poolStage, seatStage, stageProtocolSeatFee(protocolFee));
      seat.exit();
      getPool(brandOut).updateState();
      return `Swap successfully completed.`;
    } else if (isSecondary(brandOut) && isSecondary(brandIn)) {
      const brandInPool = getPool(brandIn);
      const brandOutPool = getPool(brandOut);
      const {
        amountIn,
        amountOut: improvedAmountOut,
        protocolFee,
        centralAmount: improvedCentralAmount,
      } = getPriceGivenRequiredOutput(brandIn, amountOut);

      const seatStaging = seat.stage(
        harden({
          In: amountIn,
          Out: improvedAmountOut,
        }),
      );

      const poolBrandInStaging = brandInPool.getPoolSeat().stage({
        Secondary: amountMath.add(brandInPool.getSecondaryAmount(), amountIn),
        Central: amountMath.subtract(
          brandInPool.getCentralAmount(),
          amountMath.add(improvedCentralAmount, protocolFee),
        ),
      });

      const poolBrandOutStaging = brandOutPool.getPoolSeat().stage({
        Central: amountMath.add(
          brandOutPool.getCentralAmount(),
          improvedCentralAmount,
        ),
        Secondary: amountMath.subtract(
          brandOutPool.getSecondaryAmount(),
          improvedAmountOut,
        ),
      });

      zcf.reallocate(
        poolBrandInStaging,
        poolBrandOutStaging,
        seatStaging,
        stageProtocolSeatFee(protocolFee),
      );
      seat.exit();
      getPool(brandIn).updateState();
      getPool(brandOut).updateState();
      return `Swap successfully completed.`;
    }

    assert.fail(X`brands were not recognized`);
  };

  const makeSwapInInvitation = () =>
    zcf.makeInvitation(swapIn, 'autoswap swapIn');

  const makeSwapOutInvitation = () =>
    zcf.makeInvitation(swapOut, 'autoswap swapOut');

  return { makeSwapInInvitation, makeSwapOutInvitation };
};
