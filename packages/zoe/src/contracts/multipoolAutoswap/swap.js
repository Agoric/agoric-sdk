import { assertProposalShape, trade } from '../../contractSupport';

import '../../../exported';

/**
 * @param {ContractFacet} zcf
 * @param {(brand: Brand) => boolean} isSecondary
 * @param {(brand: Brand) => boolean} isCentral
 * @param {(brand: Brand) => Pool} getPool
 */
export const makeMakeSwapInvitation = (
  zcf,
  isSecondary,
  isCentral,
  getPool,
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
      // We must do two consecutive getPriceGivenAvailableInput() calls,
      // followed by a call to getPriceGivenRequiredOutput().
      // 1) from amountIn to the central token, which tells us how much central
      // would be provided for amountIn (centralAmount)
      // 2) from centralAmount to brandOut, which tells us how much of brandOut
      // will be provided (amountOut) as well as the minimum price in central
      // tokens (reducedCentralAmount), then finally
      // 3) call getPriceGivenRequiredOutput() to see if the same proceeds can
      // be purchased for less (reducedAmountIn).

      const brandInPool = getPool(brandIn);
      const brandOutPool = getPool(brandOut);

      const {
        brands: { Central: centralBrand },
      } = zcf.getTerms();

      const {
        amountOut: centralAmount,
      } = brandInPool.getPriceGivenAvailableInput(amountIn, centralBrand);
      const {
        amountIn: reducedCentralAmount,
        amountOut,
      } = brandOutPool.getPriceGivenAvailableInput(centralAmount, brandOut);

      // propogate reduced prices back to the first pool
      const {
        amountIn: reducedAmountIn,
      } = brandInPool.getPriceGivenRequiredOutput(
        brandIn,
        reducedCentralAmount,
      );

      const centralTokenAmountMath = brandInPool.getCentralAmountMath();
      const brandInAmountMath = brandInPool.getAmountMath();
      const brandOutAmountMath = brandOutPool.getAmountMath();

      const seatStaging = seat.stage(
        harden({
          In: brandInPool.getAmountMath().subtract(amountIn, reducedAmountIn),
          Out: amountOut,
        }),
      );

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
      // We must do two consecutive getPriceGivenRequiredOutput() calls,
      // followed by a call to getPriceGivenAvailableInput().
      // 1) from amountOut to the central token, which tells us how much central
      // is required to obtain amountOut (centralAmount)
      // 2) from centralAmount to brandIn, which tells us how much of brandIn
      // is required (amountIn) as well as the max proceeds in central
      // tokens (improvedCentralAmount), then finally
      // 3) call getPriceGivenAvailableInput() to see if improvedCentralAmount
      // produces a larger amount (improvedAmountOut)

      const brandInPool = getPool(brandOut);
      const brandOutPool = getPool(brandIn);
      const {
        brands: { Central: centralBrand },
      } = zcf.getTerms();

      const {
        amountIn: centralAmount,
      } = brandInPool.getPriceGivenRequiredOutput(centralBrand, amountOut);
      const {
        amountIn,
        amountOut: improvedCentralAmount,
      } = brandOutPool.getPriceGivenRequiredOutput(brandIn, centralAmount);

      // propogate improved prices
      const {
        amountOut: improvedAmountOut,
      } = brandOutPool.getPriceGivenAvailableInput(
        improvedCentralAmount,
        brandOut,
      );

      const centralAmountMath = brandInPool.getCentralAmountMath();
      const brandInAmountMath = brandInPool.getAmountMath();
      const brandOutAmountMath = brandOutPool.getAmountMath();

      const seatStaging = seat.stage(
        harden({
          Out: brandInAmountMath().subtract(improvedAmountOut, amountOut),
          In: amountIn,
        }),
      );

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
