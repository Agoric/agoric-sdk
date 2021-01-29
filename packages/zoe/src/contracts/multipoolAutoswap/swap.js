import { assertProposalShape, trade } from '../../contractSupport';

import '../../../exported';

/**
 * typedef {Object} PriceAmountTriple
 *
 * @property {Amount} amountOut
 * @property {Amount} amountIn
 * @property {Amount} centralAmount
 */

/**
 * @param {ContractFacet} zcf
 * @param {(brand: Brand) => boolean} isSecondary
 * @param {(brand: Brand) => boolean} isCentral
 * @param {(brand: Brand) => Pool} getPool
 * @param {(amountIn, brandOut) => PriceAmountTriple} getPriceGivenAvailableInput
 * @param {(brandIn, amountOut) => PriceAmountTriple} getPriceGivenRequiredOutput
 */
export const makeMakeSwapInvitation = (
  zcf,
  isSecondary,
  isCentral,
  getPool,
  getPriceGivenAvailableInput,
  getPriceGivenRequiredOutput,
) => {
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
      const pool = getPool(brandOut);
      const {
        amountOut,
        amountIn: reducedAmountIn,
      } = pool.getPriceGivenAvailableInput(amountIn, brandOut);
      trade(
        zcf,
        {
          seat: pool.getPoolSeat(),
          gains: { Central: reducedAmountIn },
          losses: { Secondary: amountOut },
        },
        {
          seat,
          gains: { Out: amountOut },
          losses: { In: reducedAmountIn },
        },
      );
      seat.exit();
      return `Swap successfully completed.`;
    } else if (isSecondary(brandIn) && isCentral(brandOut)) {
      // this branch is very similar to the above, with only pool and the left
      // seat's gains and losses changing. Sharing code makes it less readable.
      const pool = getPool(brandIn);
      const {
        amountOut,
        amountIn: reducedAmountIn,
      } = pool.getPriceGivenAvailableInput(amountIn, brandOut);
      trade(
        zcf,
        {
          seat: pool.getPoolSeat(),
          gains: { Secondary: reducedAmountIn },
          losses: { Central: amountOut },
        },
        {
          seat,
          gains: { Out: amountOut },
          losses: { In: reducedAmountIn },
        },
      );
      seat.exit();
      return `Swap successfully completed.`;
    } else if (isSecondary(brandIn) && isSecondary(brandOut)) {
      const {
        amountIn: reducedAmountIn,
        amountOut,
        centralAmount: reducedCentralAmount,
      } = getPriceGivenAvailableInput(amountIn, brandOut);

      const brandInPool = getPool(brandIn);
      const brandOutPool = getPool(brandOut);
      const brandInAmountMath = brandInPool.getAmountMath();

      const seatStaging = seat.stage(
        harden({
          In: brandInAmountMath.subtract(amountIn, reducedAmountIn),
          Out: amountOut,
        }),
      );

      const centralTokenAmountMath = brandInPool.getCentralAmountMath();
      const brandOutAmountMath = brandOutPool.getAmountMath();

      const poolBrandInStaging = brandInPool.getPoolSeat().stage({
        Secondary: brandInAmountMath.add(
          brandInPool.getSecondaryAmount(),
          reducedAmountIn,
        ),
        Central: centralTokenAmountMath.subtract(
          brandInPool.getCentralAmount(),
          reducedCentralAmount,
        ),
      });

      const poolBrandOutStaging = brandOutPool.getPoolSeat().stage({
        Central: centralTokenAmountMath.add(
          brandOutPool.getCentralAmount(),
          reducedCentralAmount,
        ),
        Secondary: brandOutAmountMath.subtract(
          brandOutPool.getSecondaryAmount(),
          amountOut,
        ),
      });

      zcf.reallocate(poolBrandInStaging, poolBrandOutStaging, seatStaging);
      seat.exit();
      return `Swap successfully completed.`;
    }

    throw new Error(`brands were not recognized`);
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
      const pool = getPool(brandIn);
      const {
        amountIn,
        amountOut: improvedAmountOut,
      } = pool.getPriceGivenRequiredOutput(brandIn, amountOut);

      const brandInAmountMath = getPool(brandIn).getAmountMath();
      if (!brandInAmountMath.isGTE(offeredAmountIn, amountIn)) {
        seat.fail();
        return `offeredAmountIn ${offeredAmountIn} is insufficient to buy amountOut ${amountOut}`;
      }

      trade(
        zcf,
        {
          seat: pool.getPoolSeat(),
          gains: { Secondary: amountIn },
          losses: { Central: improvedAmountOut },
        },
        {
          seat,
          gains: { Out: improvedAmountOut },
          losses: { In: amountIn },
        },
      );
      seat.exit();
      return `Swap successfully completed.`;
    } else if (isSecondary(brandOut) && isCentral(brandIn)) {
      const pool = getPool(brandOut);
      const {
        amountIn,
        amountOut: improvedAmountOut,
      } = pool.getPriceGivenRequiredOutput(brandIn, amountOut);

      trade(
        zcf,
        {
          seat: pool.getPoolSeat(),
          gains: { Central: amountIn },
          losses: { Secondary: improvedAmountOut },
        },
        {
          seat,
          gains: { Out: improvedAmountOut },
          losses: { In: amountIn },
        },
      );
      seat.exit();
      return `Swap successfully completed.`;
    } else if (isSecondary(brandOut) && isSecondary(brandIn)) {
      const {
        amountIn,
        amountOut: improvedAmountOut,
        centralAmount: improvedCentralAmount,
      } = getPriceGivenRequiredOutput(brandIn, amountOut);
      const brandInPool = getPool(brandIn);
      const brandOutPool = getPool(brandOut);
      const brandOutAmountMath = brandOutPool.getAmountMath();

      const seatStaging = seat.stage(
        harden({
          In: amountIn,
          Out: brandOutAmountMath().subtract(improvedAmountOut, amountOut),
        }),
      );

      const centralAmountMath = brandInPool.getCentralAmountMath();
      const brandInAmountMath = brandInPool.getAmountMath();

      const poolBrandInStaging = brandInPool.getPoolSeat().stage({
        Secondary: brandInAmountMath.add(
          brandInPool.getSecondaryAmount(),
          amountIn,
        ),
        Central: centralAmountMath.subtract(
          brandInPool.getCentralAmount(),
          improvedCentralAmount,
        ),
      });

      const poolBrandOutStaging = brandOutPool.getPoolSeat().stage({
        Central: centralAmountMath.add(
          brandOutPool.getCentralAmount(),
          improvedCentralAmount,
        ),
        Secondary: brandOutAmountMath.subtract(
          brandOutPool.getSecondaryAmount(),
          improvedAmountOut,
        ),
      });

      zcf.reallocate(poolBrandInStaging, poolBrandOutStaging, seatStaging);
      seat.exit();
      return `Swap successfully completed.`;
    }

    throw new Error(`brands were not recognized`);
  };

  const makeSwapInInvitation = () =>
    zcf.makeInvitation(swapIn, 'autoswap swapIn');

  const makeSwapOutInvitation = () =>
    zcf.makeInvitation(swapOut, 'autoswap swapOut');

  return { makeSwapInInvitation, makeSwapOutInvitation };
};
