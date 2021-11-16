// @ts-check

import { assert, details as X } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';

import { assertProposalShape } from '../../contractSupport/index.js';

import '../../../exported.js';
import { LOW_FEE, SHORT_EXP } from '../../constants.js';

/**
 * @typedef {Object} PriceAmountTriple
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
 * @param {(amountIn, brandOut) => PriceAmountPair | PriceAmountTriple} getPriceGivenAvailableInput
 * @param {(brandIn, amountOut) => PriceAmountPair | PriceAmountTriple} getPriceGivenRequiredOutput
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

      const poolSeat = pool.getPoolSeat();

      seat.decrementBy(harden({ In: reducedAmountIn }));
      poolSeat.incrementBy(harden({ Central: reducedAmountIn }));

      poolSeat.decrementBy(harden({ Secondary: amountOut }));
      seat.incrementBy(harden({ Out: amountOut }));

      zcf.reallocate(poolSeat, seat);
      seat.exit();
      getPool(brandOut).updateState();
      return `Swap successfully completed.`;
    } else if (isSecondary(brandIn) && isCentral(brandOut)) {
      // this branch is very similar to the above, with only pool and the left
      // seat's gains and losses changing. Sharing code makes it less readable.
      const pool = getPool(brandIn);
      const {
        amountOut,
        amountIn: reducedAmountIn,
      } = pool.getPriceGivenAvailableInput(amountIn, brandOut);
      const poolSeat = pool.getPoolSeat();

      seat.decrementBy(harden({ In: reducedAmountIn }));
      poolSeat.incrementBy(harden({ Secondary: reducedAmountIn }));

      poolSeat.decrementBy(harden({ Central: amountOut }));
      seat.incrementBy(harden({ Out: amountOut }));

      zcf.reallocate(seat, poolSeat);

      seat.exit();
      getPool(brandIn).updateState();
      return `Swap successfully completed.`;
    } else if (isSecondary(brandIn) && isSecondary(brandOut)) {
      const {
        amountIn: reducedAmountIn,
        amountOut,
        // TODO: determine whether centralAmount will always exist
        // @ts-ignore If has Central, should not be typed as PriceAmountPair
        centralAmount: reducedCentralAmount,
      } = getPriceGivenAvailableInput(amountIn, brandOut);

      const brandInPoolSeat = getPool(brandIn).getPoolSeat();
      const brandOutPoolSeat = getPool(brandOut).getPoolSeat();

      brandOutPoolSeat.decrementBy(harden({ Secondary: amountOut }));
      seat.incrementBy(harden({ Out: amountOut }));

      brandInPoolSeat.decrementBy(harden({ Central: reducedCentralAmount }));
      brandOutPoolSeat.incrementBy(harden({ Central: reducedCentralAmount }));

      seat.decrementBy(harden({ In: reducedAmountIn }));
      brandInPoolSeat.incrementBy(harden({ Secondary: reducedAmountIn }));

      zcf.reallocate(brandOutPoolSeat, brandInPoolSeat, seat);
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
      const pool = getPool(brandIn);
      const {
        amountIn,
        amountOut: improvedAmountOut,
      } = pool.getPriceGivenRequiredOutput(brandIn, amountOut);

      if (!AmountMath.isGTE(offeredAmountIn, amountIn)) {
        const reason = `offeredAmountIn ${offeredAmountIn} is insufficient to buy amountOut ${amountOut}`;
        throw seat.fail(Error(reason));
      }
      const poolSeat = pool.getPoolSeat();
      seat.decrementBy(harden({ In: amountIn }));
      poolSeat.incrementBy(harden({ Secondary: amountIn }));

      poolSeat.decrementBy(harden({ Central: improvedAmountOut }));
      seat.incrementBy(harden({ Out: improvedAmountOut }));

      zcf.reallocate(seat, poolSeat);

      seat.exit();
      getPool(brandIn).updateState();
      return `Swap successfully completed.`;
    } else if (isSecondary(brandOut) && isCentral(brandIn)) {
      const pool = getPool(brandOut);
      const {
        amountIn,
        amountOut: improvedAmountOut,
      } = pool.getPriceGivenRequiredOutput(brandIn, amountOut);

      const poolSeat = pool.getPoolSeat();

      seat.decrementBy(harden({ In: amountIn }));
      poolSeat.incrementBy(harden({ Central: amountIn }));

      poolSeat.decrementBy(harden({ Secondary: improvedAmountOut }));
      seat.incrementBy(harden({ Out: improvedAmountOut }));

      zcf.reallocate(poolSeat, seat);

      seat.exit();
      getPool(brandOut).updateState();
      return `Swap successfully completed.`;
    } else if (isSecondary(brandOut) && isSecondary(brandIn)) {
      const {
        amountIn,
        amountOut: improvedAmountOut,
        // TODO: determine whether centralAmount will always exist
        // @ts-ignore If has Central, should not be typed as PriceAmountPair
        centralAmount: improvedCentralAmount,
      } = getPriceGivenRequiredOutput(brandIn, amountOut);
      const brandInPoolSeat = getPool(brandIn).getPoolSeat();
      const brandOutPoolSeat = getPool(brandOut).getPoolSeat();

      brandOutPoolSeat.decrementBy(harden({ Secondary: improvedAmountOut }));
      seat.incrementBy(harden({ Out: improvedAmountOut }));

      brandInPoolSeat.decrementBy(harden({ Central: improvedCentralAmount }));
      brandOutPoolSeat.incrementBy(harden({ Central: improvedCentralAmount }));

      seat.decrementBy(harden({ In: amountIn }));
      brandInPoolSeat.incrementBy(harden({ Secondary: amountIn }));

      zcf.reallocate(brandInPoolSeat, brandOutPoolSeat, seat);
      seat.exit();
      getPool(brandIn).updateState();
      getPool(brandOut).updateState();
      return `Swap successfully completed.`;
    }

    assert.fail(X`brands were not recognized`);
  };

  const makeSwapInInvitation = () =>
    zcf.makeInvitation(
      swapIn,
      'autoswap swapIn',
      undefined,
      LOW_FEE,
      SHORT_EXP,
    );

  const makeSwapOutInvitation = () =>
    zcf.makeInvitation(
      swapOut,
      'autoswap swapOut',
      undefined,
      LOW_FEE,
      SHORT_EXP,
    );

  return { makeSwapInInvitation, makeSwapOutInvitation };
};
