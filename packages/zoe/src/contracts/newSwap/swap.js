// @ts-check

import { assert, details as X } from '@agoric/assert';
import { amountMath } from '@agoric/ertp';

import { assertProposalShape } from '../../contractSupport';

import '../../../exported';

const SUCCESS_STRING = `Swap successfully completed.`;

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

    const {
      amountIn: reducedAmountIn,
      amountOut,
      protocolFee,
      // @ts-ignore two pool version of getPrice returns central
      centralAmount,
    } = getPriceGivenAvailableInput(amountIn, brandOut);

    const stagings = [];
    stagings.push(stageProtocolSeatFee(protocolFee));
    // The seat's staging is the same for every trade
    stagings.push(
      seat.stage(
        harden({
          In: amountMath.subtract(amountIn, reducedAmountIn),
          Out: amountOut,
        }),
      ),
    );

    function poolStagingFromCentral() {
      const pool = getPool(amountOut.brand);
      // gains (amountIn - protocolFee), loses amountOut
      return pool.stageSeat({
        Central: amountMath.add(
          pool.getCentralAmount(),
          amountMath.subtract(amountIn, protocolFee),
        ),
        Secondary: amountMath.subtract(pool.getSecondaryAmount(), amountOut),
      });
    }

    function poolStagingToCentral() {
      const pool = getPool(reducedAmountIn.brand);
      // gains reducedAmountIn, loses (amountOut + protocolFee)
      return pool.stageSeat({
        Central: amountMath.subtract(
          pool.getCentralAmount(),
          amountMath.add(amountOut, protocolFee),
        ),
        Secondary: amountMath.add(pool.getSecondaryAmount(), reducedAmountIn),
      });
    }

    function secondaryPoolStagings() {
      const brandInPool = getPool(brandIn);
      // gains reducedAmountIn, loses (centralAmount + protocolFee)
      const brandInStaging = brandInPool.stageSeat({
        Secondary: amountMath.add(
          brandInPool.getSecondaryAmount(),
          reducedAmountIn,
        ),
        Central: amountMath.subtract(
          brandInPool.getCentralAmount(),
          amountMath.add(centralAmount, protocolFee),
        ),
      });

      const brandOutPool = getPool(brandOut);
      // gains centralAmount, loses amountOut
      const brandOutStaging = brandOutPool.stageSeat({
        Central: amountMath.add(brandOutPool.getCentralAmount(), centralAmount),
        Secondary: amountMath.subtract(
          brandOutPool.getSecondaryAmount(),
          amountOut,
        ),
      });
      return [brandInStaging, brandOutStaging];
    }

    // central to secondary, secondary to central, or secondary to secondary
    const pools = [];
    if (isCentral(brandIn) && isSecondary(brandOut)) {
      stagings.push(poolStagingFromCentral());
      pools.push(getPool(brandOut));
    } else if (isSecondary(brandIn) && isCentral(brandOut)) {
      stagings.push(poolStagingToCentral());
      pools.push(getPool(brandIn));
    } else if (isSecondary(brandIn) && isSecondary(brandOut)) {
      stagings.push(...secondaryPoolStagings());
      pools.push(getPool(brandIn));
      pools.push(getPool(brandOut));
    } else {
      assert.fail(X`brands were not recognized`);
    }

    // @ts-ignore typescript can't tell that we started by adding two stagings
    zcf.reallocate(...stagings);
    seat.exit();
    pools.forEach(p => p.updateState());
    return SUCCESS_STRING;
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

    const {
      amountIn,
      amountOut: improvedAmountOut,
      protocolFee,
      // @ts-ignore two pool version of getPrice returns central
      centralAmount,
    } = getPriceGivenRequiredOutput(brandIn, amountOut);

    const stagings = [];
    stagings.push(stageProtocolSeatFee(protocolFee));
    // The seat's staging is the same for every trade
    stagings.push(
      seat.stage({
        In: amountMath.subtract(offeredAmountIn, amountIn),
        Out: improvedAmountOut,
      }),
    );

    function poolStagingToCentral() {
      const pool = getPool(brandIn);
      // gains amountIn, loses (improvedAmountOut + protocolFee)
      return pool.stageSeat({
        Central: amountMath.subtract(
          pool.getCentralAmount(),
          amountMath.add(improvedAmountOut, protocolFee),
        ),
        Secondary: amountMath.add(pool.getSecondaryAmount(), amountIn),
      });
    }

    function poolStagingFromCentral() {
      const pool = getPool(brandOut);
      // gains (amountIn - protocolFee), loses improvedAmountOut
      return pool.stageSeat({
        Central: amountMath.add(
          pool.getCentralAmount(),
          amountMath.subtract(amountIn, protocolFee),
        ),
        Secondary: amountMath.subtract(
          pool.getSecondaryAmount(),
          improvedAmountOut,
        ),
      });
    }

    function secondaryPoolStagings() {
      const brandInPool = getPool(brandIn);
      // gains amountIn, loses (centralAmount + protocolFee)
      const brandInStaging = brandInPool.stageSeat({
        Secondary: amountMath.add(brandInPool.getSecondaryAmount(), amountIn),
        Central: amountMath.subtract(
          brandInPool.getCentralAmount(),
          amountMath.add(centralAmount, protocolFee),
        ),
      });

      const brandOutPool = getPool(brandOut);
      // gains centralAmount, loses improvedAmountOut
      const brandOutStaging = brandOutPool.stageSeat({
        Central: amountMath.add(brandOutPool.getCentralAmount(), centralAmount),
        Secondary: amountMath.subtract(
          brandOutPool.getSecondaryAmount(),
          improvedAmountOut,
        ),
      });
      return [brandInStaging, brandOutStaging];
    }

    // central to secondary, secondary to central, or secondary to secondary
    const pools = [];
    if (isCentral(brandOut) && isSecondary(brandIn)) {
      if (!amountMath.isGTE(offeredAmountIn, amountIn)) {
        const reason = `offeredAmountIn ${offeredAmountIn} is insufficient to buy amountOut ${amountOut}`;
        throw seat.fail(Error(reason));
      }
      stagings.push(poolStagingToCentral());
      pools.push(getPool(brandIn));
    } else if (isSecondary(brandOut) && isCentral(brandIn)) {
      stagings.push(poolStagingFromCentral());
      pools.push(getPool(brandOut));
    } else if (isSecondary(brandOut) && isSecondary(brandIn)) {
      stagings.push(...secondaryPoolStagings());
      pools.push(getPool(brandIn), getPool(brandOut));
    } else {
      assert.fail(X`brands were not recognized`);
    }

    // @ts-ignore typescript can't tell that we started by adding two stagings
    zcf.reallocate(...stagings);
    seat.exit();
    pools.forEach(p => p.updateState());
    return SUCCESS_STRING;
  };

  const makeSwapInInvitation = () =>
    zcf.makeInvitation(swapIn, 'autoswap swapIn');

  const makeSwapOutInvitation = () =>
    zcf.makeInvitation(swapOut, 'autoswap swapOut');

  return { makeSwapInInvitation, makeSwapOutInvitation };
};
