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
      want: { Out: wantedAmountOut },
    } = seat.getProposal();
    const { brand: brandIn, value: inputValue } = amountIn;
    const brandOut = wantedAmountOut.brand;

    // we could be swapping (1) central to secondary, (2) secondary to
    // central, or (3) secondary to secondary

    if (isCentral(brandIn) && isSecondary(brandOut)) {
      const pool = getPool(brandOut);
      const amountOut = pool.getCentralToSecondaryInputPrice(inputValue);
      trade(
        zcf,
        {
          seat: pool.getPoolSeat(),
          gains: { Central: amountIn },
          losses: { Secondary: amountOut },
        },
        {
          seat,
          gains: { Out: amountOut },
          losses: { In: amountIn },
        },
      );
      seat.exit();
      return `Swap successfully completed.`;
    }

    if (isSecondary(brandIn) && isCentral(brandOut)) {
      const pool = getPool(brandIn);
      const amountOut = pool.getSecondaryToCentralInputPrice(inputValue);
      trade(
        zcf,
        {
          seat: pool.getPoolSeat(),
          gains: { Secondary: amountIn },
          losses: { Central: amountOut },
        },
        {
          seat,
          gains: { Out: amountOut },
          losses: { In: amountIn },
        },
      );
      seat.exit();
      return `Swap successfully completed.`;
    }

    if (isSecondary(brandIn) && isSecondary(brandOut)) {
      // We must do two consecutive `getCurrentPrice` calls: from
      // the brandIn to the central token, then from the central
      // token to the brandOut.

      const brandInPool = getPool(brandIn);
      const brandOutPool = getPool(brandOut);

      const centralAmount = brandInPool.getSecondaryToCentralInputPrice(
        inputValue,
      );
      const amountOut = brandOutPool.getCentralToSecondaryInputPrice(
        centralAmount.value,
      );

      const seatStaging = seat.stage(
        harden({
          In: brandInPool.getAmountMath().getEmpty(),
          Out: amountOut,
        }),
      );

      const centralTokenAmountMath = brandInPool.getCentralAmountMath();
      const brandInAmountMath = brandInPool.getAmountMath();
      const brandOutAmountMath = brandOutPool.getAmountMath();

      const poolBrandInStaging = brandInPool.getPoolSeat().stage({
        Secondary: brandInAmountMath.add(
          brandInPool.getSecondaryAmount(),
          amountIn,
        ),
        Central: centralTokenAmountMath.subtract(
          brandInPool.getCentralAmount(),
          centralAmount,
        ),
      });

      const poolBrandOutStaging = brandOutPool.getPoolSeat().stage({
        Central: centralTokenAmountMath.add(
          brandOutPool.getCentralAmount(),
          centralAmount,
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
    // The offer's amountOut is exact; the offeredAmountIn is a max.
    const {
      give: { In: offeredAmountIn },
      want: { Out: amountOut },
    } = seat.getProposal();
    const { brand: brandOut, value: outputValue } = amountOut;
    const brandIn = offeredAmountIn.brand;

    // we could be swapping (1) central to secondary, (2) secondary to
    // central, or (3) secondary to secondary

    if (isCentral(brandOut) && isSecondary(brandIn)) {
      const pool = getPool(brandIn);
      const amountIn = pool.getSecondaryToCentralOutputPrice(outputValue);

      const brandInAmountMath = getPool(brandIn).getAmountMath();
      if (!brandInAmountMath.isGTE(offeredAmountIn, amountIn)) {
        seat.fail();
        return `insufficient funds offered`;
      }

      trade(
        zcf,
        {
          seat: pool.getPoolSeat(),
          gains: { Secondary: amountIn },
          losses: { Central: amountOut },
        },
        {
          seat,
          gains: { Out: amountOut },
          losses: { In: amountIn },
        },
      );
      seat.exit();
      return `Swap successfully completed.`;
    }

    if (isSecondary(brandOut) && isCentral(brandIn)) {
      const pool = getPool(brandOut);
      const amountIn = pool.getCentralToSecondaryOutputPrice(outputValue);
      trade(
        zcf,
        {
          seat: pool.getPoolSeat(),
          gains: { Central: amountIn },
          losses: { Secondary: amountOut },
        },
        {
          seat,
          gains: { Out: amountOut },
          losses: { In: amountIn },
        },
      );
      seat.exit();
      return `Swap successfully completed.`;
    }

    if (isSecondary(brandOut) && isSecondary(brandIn)) {
      // We must do two consecutive `getCurrentPrice` calls: from
      // the brandOut to the central token, then from the central
      // token to the brandIn.

      const brandInPool = getPool(brandOut);
      const brandOutPool = getPool(brandIn);

      const centralAmount = brandInPool.getSecondaryToCentralOutputPrice(
        outputValue,
      );
      const amountIn = brandOutPool.getCentralToSecondaryOutputPrice(
        centralAmount.value,
      );

      const seatStaging = seat.stage(
        harden({
          In: brandInPool.getAmountMath().getEmpty(),
          Out: amountOut,
        }),
      );

      const centralAmountMath = brandInPool.getCentralAmountMath();
      const brandInAmountMath = brandInPool.getAmountMath();
      const brandOutAmountMath = brandOutPool.getAmountMath();

      const poolBrandInStaging = brandInPool.getPoolSeat().stage({
        Secondary: brandInAmountMath.add(
          brandInPool.getSecondaryAmount(),
          amountIn,
        ),
        Central: centralAmountMath.subtract(
          brandInPool.getCentralAmount(),
          centralAmount,
        ),
      });

      const poolBrandOutStaging = brandOutPool.getPoolSeat().stage({
        Central: centralAmountMath.add(
          brandOutPool.getCentralAmount(),
          centralAmount,
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

  const makeSwapInInvitation = () =>
    zcf.makeInvitation(swapIn, 'autoswap swapIn');

  const makeSwapOutInvitation = () =>
    zcf.makeInvitation(swapOut, 'autoswap swapOut');

  return { makeSwapInInvitation, makeSwapOutInvitation };
};
