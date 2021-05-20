// @ts-check

import { assert, details as X } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';

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
      RUN: AmountMath.add(
        protocolSeat.getAmountAllocated('RUN', protocolFee.brand),
        protocolFee,
      ),
    });
    return protocolStage;
  }

  function poolStagingFromCentral(amountIn, amountOut, protocolFee) {
    const pool = getPool(amountOut.brand);
    // gains (amountIn - protocolFee), loses amountOut
    return pool.stageSeat({
      Central: AmountMath.add(
        pool.getCentralAmount(),
        AmountMath.subtract(amountIn, protocolFee),
      ),
      Secondary: AmountMath.subtract(pool.getSecondaryAmount(), amountOut),
    });
  }

  function poolStagingToCentral(amountIn, amountOut, protocolFee) {
    const pool = getPool(amountIn.brand);
    // gains reducedAmountIn, loses (amountOut + protocolFee)
    return pool.stageSeat({
      Central: AmountMath.subtract(
        pool.getCentralAmount(),
        AmountMath.add(amountOut, protocolFee),
      ),
      Secondary: AmountMath.add(pool.getSecondaryAmount(), amountIn),
    });
  }

  function secondaryPoolStagings(
    amountIn,
    amountOut,
    centralAmount,
    protocolFee,
  ) {
    const brandInPool = getPool(amountIn.brand);
    // gains reducedAmountIn, loses (centralAmount + protocolFee)
    const brandInStaging = brandInPool.stageSeat({
      Secondary: AmountMath.add(brandInPool.getSecondaryAmount(), amountIn),
      Central: AmountMath.subtract(
        brandInPool.getCentralAmount(),
        AmountMath.add(centralAmount, protocolFee),
      ),
    });

    const brandOutPool = getPool(amountOut.brand);
    // gains centralAmount, loses amountOut
    const brandOutStaging = brandOutPool.stageSeat({
      Central: AmountMath.add(brandOutPool.getCentralAmount(), centralAmount),
      Secondary: AmountMath.subtract(
        brandOutPool.getSecondaryAmount(),
        amountOut,
      ),
    });
    return [brandInStaging, brandOutStaging];
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
    stagings.push(
      seat.stage(
        harden({
          In: AmountMath.subtract(amountIn, reducedAmountIn),
          Out: amountOut,
        }),
      ),
    );

    // central to secondary, secondary to central, or secondary to secondary
    const pools = [];
    if (isCentral(brandIn) && isSecondary(brandOut)) {
      stagings.push(
        poolStagingFromCentral(reducedAmountIn, amountOut, protocolFee),
      );
      pools.push(getPool(brandOut));
    } else if (isSecondary(brandIn) && isCentral(brandOut)) {
      stagings.push(
        poolStagingToCentral(reducedAmountIn, amountOut, protocolFee),
      );
      pools.push(getPool(brandIn));
    } else if (isSecondary(brandIn) && isSecondary(brandOut)) {
      const secondaryStagings = secondaryPoolStagings(
        reducedAmountIn,
        amountOut,
        centralAmount,
        protocolFee,
      );
      stagings.push(...secondaryStagings);
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

    if (!AmountMath.isGTE(offeredAmountIn, amountIn)) {
      const reason = `offeredAmountIn ${offeredAmountIn} is insufficient to buy amountOut ${amountOut}`;
      throw seat.fail(Error(reason));
    }

    const stagings = [];
    stagings.push(stageProtocolSeatFee(protocolFee));
    stagings.push(
      seat.stage({
        In: AmountMath.subtract(offeredAmountIn, amountIn),
        Out: improvedAmountOut,
      }),
    );

    // central to secondary, secondary to central, or secondary to secondary
    const pools = [];
    if (isCentral(brandOut) && isSecondary(brandIn)) {
      stagings.push(
        poolStagingToCentral(amountIn, improvedAmountOut, protocolFee),
      );
      pools.push(getPool(brandIn));
    } else if (isSecondary(brandOut) && isCentral(brandIn)) {
      stagings.push(
        poolStagingFromCentral(amountIn, improvedAmountOut, protocolFee),
      );
      pools.push(getPool(brandOut));
    } else if (isSecondary(brandOut) && isSecondary(brandIn)) {
      const secondaryStagings = secondaryPoolStagings(
        amountIn,
        improvedAmountOut,
        centralAmount,
        protocolFee,
      );
      stagings.push(...secondaryStagings);
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
