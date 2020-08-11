import { assertProposalKeywords, trade } from '../../contractSupport';

import '../../../exported';

/**
 *
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
  const swapExpected = harden({
    give: { In: null },
    want: { Out: null },
  });

  const swap = seat => {
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
      const amountOut = pool.getCurrentPrice(true, inputValue);
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
      const amountOut = pool.getCurrentPrice(false, inputValue);
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

      const centralTokenAmount = brandInPool.getCurrentPrice(false, inputValue);
      const amountOut = brandOutPool.getCurrentPrice(
        true,
        centralTokenAmount.value,
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
          centralTokenAmount,
        ),
      });

      const poolBrandOutStaging = brandOutPool.getPoolSeat().stage({
        Central: centralTokenAmountMath.add(
          brandOutPool.getCentralAmount(),
          centralTokenAmount,
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

  const makeSwapInvitation = () =>
    zcf.makeInvitation(
      assertProposalKeywords(swap, swapExpected),
      'autoswap swap',
    );

  return makeSwapInvitation;
};
