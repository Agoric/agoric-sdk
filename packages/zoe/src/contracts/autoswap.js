// @ts-check

import { assert } from '@agoric/assert';

// Eventually will be importable from '@agoric/zoe-contract-support'
import {
  getInputPrice,
  getOutputPrice,
  calcLiqValueToMint,
  calcValueToRemove,
  assertProposalShape,
  assertUsesNatMath,
  trade,
  natSafeMath,
  calcSecondaryRequired,
} from '../contractSupport';

import '../../exported';

const { multiply } = natSafeMath;

/**
 * Autoswap is a rewrite of Uniswap. Please see the documentation for
 * more https://agoric.com/documentation/zoe/guide/contracts/autoswap.html
 *
 * When the contract is instantiated, the two tokens (Central and Secondary) are
 * specified in the terms.issuers. There is no behavioral difference between the
 * two when trading; the name was chosen for consistency with our
 * multipoolAutoswap. When trading, use the keywords In and Out to specify the
 * amount to be paid in, and the amount to be received.
 *
 * When adding or removing liquidity, the amounts deposited must be in
 * proportion to the current balances in the pool. The amount of the Central
 * asset is used as the basis. The Secondary assets must be added in proportion.
 * If less Secondary is provided than required, we refuse the offer. If more is
 * provide than is required, we return the excess.
 *
 * Before trading can take place, it is necessary to add liquidity using
 * makeAddLiquidityInvitation(). Separate invitations are available for adding
 * and removing liquidity, and for doing a swap. Other API operations support
 * price checks and monitoring the size of the liquidity pool.
 *
 * The swap operation is sensitive to whether the Out amount was specified. If
 * it's positive, it is treated as a request for an exact amount of output, and
 * the In amount must be sufficient or the offer will be refused. If Out is 0,
 * the payout will be calculated based on the In amount.
 *
 * The publicFacet can make new invitations (makeSwapInvitation,
 * makeAddLiquidityInvitation, and makeRemoveLiquidityInvitation), tell how much
 * would be paid for a given input (getCurrentPrice), or how much would be
 * earned by depositing a specified amount (getPriceForOutput). In addition,
 * there are requests for the LiquidityIssuer (getLiquidityIssuer), the current
 * outstanding liquidity (getLiquidityTokens), and the current balances in the
 * pool (getPoolAllocation).
 *
 * @type {ContractStartFn}
 */
const start = async zcf => {
  // Create a local liquidity mint and issuer.
  const liquidityMint = await zcf.makeZCFMint('Liquidity');
  // AWAIT  ////////////////////

  const {
    issuer: liquidityIssuer,
    amountMath: liquidityMath,
  } = liquidityMint.getIssuerRecord();
  let liqTokenSupply = 0;

  // In order to get all the brands, we must call zcf.getTerms() after
  // we create the liquidityIssuer
  const {
    brands,
    maths: { Central: centralMath, Secondary: secondaryMath },
  } = zcf.getTerms();
  Object.values(brands).forEach(brand => assertUsesNatMath(zcf, brand));
  /** @typedef {Map<Brand,Keyword>} */
  const brandToKeyword = new Map(
    Object.entries(brands).map(([keyword, brand]) => [brand, keyword]),
  );
  /** @return {string} */
  const getPoolKeyword = brand => {
    assert(brandToKeyword.has(brand), 'getPoolKeyword: brand not found');
    // @ts-ignore
    return brandToKeyword.get(brand);
  };

  const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();
  const getPoolAmount = brand => {
    const keyword = getPoolKeyword(brand);
    return poolSeat.getAmountAllocated(keyword, brand);
  };

  /**
   * Swap one asset for another. In specifies the asset being provided and Out
   * specifies the wanted asset. If the want amount is 0, all of the In amount
   * is expended. If the want amount is positive, then only enough of the In is
   * spent to provide that Out. If the In is insufficient the trade is refused.
   *
   * @type {OfferHandler}
   */
  const swapHandler = swapSeat => {
    if (getPoolAmount(brands.Central).value === 0) {
      swapSeat.exit();
      return 'Pool not initialized';
    }

    const {
      give: { In: amountIn },
      want: { Out: wantedAmountOut },
    } = swapSeat.getProposal();
    let tradeAmountIn;
    let tradeAmountOut;

    // if the proposal specified the Out amount, treat that as an exact request
    if (wantedAmountOut.value > 0) {
      tradeAmountOut = wantedAmountOut;
      const tradePrice = getOutputPrice({
        outputValue: wantedAmountOut.value,
        inputReserve: getPoolAmount(amountIn.brand).value,
        outputReserve: getPoolAmount(wantedAmountOut.brand).value,
      });
      if (tradePrice > amountIn.value) {
        swapSeat.exit();
        return 'amountIn insufficient';
      }
      const inAmountMath = zcf.getAmountMath(amountIn.brand);
      tradeAmountIn = inAmountMath.make(tradePrice);
    } else {
      tradeAmountIn = amountIn;
      const outputValue = getInputPrice(
        harden({
          inputValue: amountIn.value,
          inputReserve: getPoolAmount(amountIn.brand).value,
          outputReserve: getPoolAmount(wantedAmountOut.brand).value,
        }),
      );
      const outAmountMath = zcf.getAmountMath(wantedAmountOut.brand);
      tradeAmountOut = outAmountMath.make(outputValue);
    }

    trade(
      zcf,
      {
        seat: poolSeat,
        gains: {
          [getPoolKeyword(amountIn.brand)]: tradeAmountIn,
        },
        losses: {
          [getPoolKeyword(wantedAmountOut.brand)]: tradeAmountOut,
        },
      },
      {
        seat: swapSeat,
        gains: { Out: tradeAmountOut },
        losses: { In: tradeAmountIn },
      },
    );

    swapSeat.exit();
    return `Swap successfully completed.`;
  };

  const addLiquidity = (seat, centralIn, centralPool, secondaryOut) => {
    const liquidityValueOut = calcLiqValueToMint(
      harden({
        liqTokenSupply,
        inputValue: centralIn,
        inputReserve: centralPool,
      }),
    );
    const liquidityAmountOut = liquidityMath.make(liquidityValueOut);
    liquidityMint.mintGains({ Liquidity: liquidityAmountOut }, poolSeat);
    liqTokenSupply += liquidityValueOut;

    trade(
      zcf,
      {
        seat: poolSeat,
        gains: {
          Central: centralMath.make(centralIn),
          Secondary: secondaryMath.make(secondaryOut),
        },
      },
      { seat, gains: { Liquidity: liquidityAmountOut } },
    );

    seat.exit();
    return 'Added liquidity.';
  };

  const initiateLiquidity = liqSeat => {
    const userAllocation = liqSeat.getCurrentAllocation();
    const centralPool = getPoolAmount(userAllocation.Central.brand).value;
    const centralIn = userAllocation.Central.value;
    const secondaryIn = userAllocation.Secondary.value;

    return addLiquidity(liqSeat, centralIn, centralPool, secondaryIn);
  };

  /**
   * Add liquidity. We use the amount of the Central asset as the basis, and
   * require that Secondary assets be added in proportion. If less Secondary is
   * provided than required, we refuse the offer. If more is provide than is
   * required, we return the excess.
   *
   * If this is the first time liquidity was added, we accept all of both
   * Primary and secondary, establishing the starting trading ratio. In this
   * case, we create liquidity equal to the value of Central asset contributed.
   *
   * @type {OfferHandler}
   */
  const addLiquidityHandler = liqSeat => {
    const userAllocation = liqSeat.getCurrentAllocation();
    const centralPool = getPoolAmount(userAllocation.Central.brand).value;
    if (centralPool === 0) {
      return initiateLiquidity(liqSeat);
    }
    const centralIn = userAllocation.Central.value;
    const secondaryIn = userAllocation.Secondary.value;
    const secondaryPool = getPoolAmount(userAllocation.Secondary.brand).value;

    // Use this method when you want to specify Central precisely, which means
    // that enough secondary must be provided.
    if (
      multiply(centralIn, secondaryPool) >= multiply(secondaryIn, centralPool)
    ) {
      liqSeat.exit();
    }

    // To calculate liquidity, we'll need to calculate alpha from the primary
    // token's value before, and the value that will be added to the pool
    const secondaryOut = calcSecondaryRequired({
      centralIn,
      centralPool,
      secondaryPool,
      secondaryIn,
    });
    if (secondaryIn < secondaryOut) {
      liqSeat.exit();
      return 'insufficient Secondary deposited';
    }

    return addLiquidity(liqSeat, centralIn, centralPool, secondaryOut);
  };

  /** @type {OfferHandler} */
  const removeLiquidityHandler = removeLiqSeat => {
    // TODO (hibbert) should we burn tokens?
    const userAllocation = removeLiqSeat.getCurrentAllocation();
    const liquidityValueIn = userAllocation.Liquidity.value;

    const newUserCentralAmount = centralMath.make(
      calcValueToRemove(
        harden({
          liqTokenSupply,
          poolValue: getPoolAmount(userAllocation.Central.brand).value,
          liquidityValueIn,
        }),
      ),
    );
    const newUserSecondaryAmount = secondaryMath.make(
      calcValueToRemove(
        harden({
          liqTokenSupply,
          poolValue: getPoolAmount(userAllocation.Secondary.brand).value,
          liquidityValueIn,
        }),
      ),
    );

    liqTokenSupply -= liquidityValueIn;

    trade(
      zcf,
      {
        seat: poolSeat,
        gains: { Liquidity: userAllocation.Liquidity },
      },
      {
        seat: removeLiqSeat,
        gains: {
          Central: newUserCentralAmount,
          Secondary: newUserSecondaryAmount,
        },
      },
    );

    removeLiqSeat.exit();
    return 'Liquidity successfully removed.';
  };

  const addLiquidityExpected = harden({
    give: { Central: null, Secondary: null },
    want: { Liquidity: null },
  });

  const removeLiquidityExpected = harden({
    want: { Central: null, Secondary: null },
    give: { Liquidity: null },
  });

  const swapExpected = {
    want: { Out: null },
    give: { In: null },
  };

  const makeAddLiquidityInvitation = () =>
    zcf.makeInvitation(
      assertProposalShape(addLiquidityHandler, addLiquidityExpected),
      'autoswap add liquidity',
    );

  const makeRemoveLiquidityInvitation = () =>
    zcf.makeInvitation(
      assertProposalShape(removeLiquidityHandler, removeLiquidityExpected),
      'autoswap remove liquidity',
    );

  const makeSwapInvitation = () =>
    zcf.makeInvitation(
      assertProposalShape(swapHandler, swapExpected),
      'autoswap swap',
    );

  /**
   * `getCurrentPrice` calculates the result of a trade, given a certain amount
   * of digital assets in.
   * @param {Amount} amountIn - the amount of digital
   * assets to be sent in
   * @param brandOut - The brand of asset desired
   */
  const getCurrentPrice = (amountIn, brandOut) => {
    const inputReserve = getPoolAmount(amountIn.brand).value;
    const outputReserve = getPoolAmount(brandOut).value;
    const outputValue = getInputPrice(
      harden({
        inputValue: amountIn.value,
        inputReserve,
        outputReserve,
      }),
    );
    return zcf.getAmountMath(brandOut).make(outputValue);
  };

  /**
   * `getPriceForOutput` calculates the amount of assets required to be
   * provided in order to obtain a specified gain.
   * @param {Amount} amountOut - the amount of digital assets desired
   * @param brandIn - The brand of asset desired
   */
  const getPriceForOutput = (amountOut, brandIn) => {
    const inputReserve = getPoolAmount(brandIn).value;
    const outputReserve = getPoolAmount(amountOut.brand).value;
    const outputValue = getOutputPrice(
      harden({
        outputValue: amountOut.value,
        inputReserve,
        outputReserve,
      }),
    );
    return zcf.getAmountMath(brandIn).make(outputValue);
  };

  const getPoolAllocation = poolSeat.getCurrentAllocation;

  /** @type {AutoswapPublicFacet} */
  const publicFacet = harden({
    getCurrentPrice,
    getPriceForOutput,
    getLiquidityIssuer: () => liquidityIssuer,
    getLiquidityTokens: () => liqTokenSupply,
    getPoolAllocation,
    makeSwapInvitation,
    makeAddLiquidityInvitation,
    makeRemoveLiquidityInvitation,
  });

  return harden({ publicFacet });
};

harden(start);
export { start };
