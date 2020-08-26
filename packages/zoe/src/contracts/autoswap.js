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
  calcSecondaryRequired,
} from '../contractSupport';

import '../../exported';

/**
 * Autoswap is a rewrite of Uniswap. Please see the documentation for
 * more https://agoric.com/documentation/zoe/guide/contracts/autoswap.html
 *
 * When the contract is instantiated, the two tokens (Central and Secondary) are
 * specified in the issuerKeywordRecord. There is no behavioral difference
 * between the two when trading; the names were chosen for consistency with our
 * multipoolAutoswap. When trading, use the keywords In and Out to specify the
 * amount to be paid in, and the amount to be received.
 *
 * When adding or removing liquidity, the amounts deposited must be in
 * proportion to the current balances in the pool. The amount of the Central
 * asset is used as the basis. The Secondary assets must be added in proportion.
 * If less Secondary is provided than required, we refuse the offer. If more is
 * provided than is required, we return the excess.
 *
 * Before trading can take place, it is necessary to add liquidity using
 * makeAddLiquidityInvitation(). Separate invitations are available for adding
 * and removing liquidity, and for doing swaps. Other API operations support
 * price checks and checking the size of the liquidity pool.
 *
 * The swap operation requires either the input amount or the output amount to
 * be specified. makeSwapInInvitation treats the give amount as definitive,
 * while makeSwapOutInvitation honors the want amount. With swapIn, a want
 * amount can be specified, and if the offer can't be satisfied, the offer will
 * be refunded. Similarly with swapOut, the want amount will be satisfied if
 * possible. If more is provided as the give amount than necessary, the excess
 * will be refunded. If not enough is provided, the offer will be refunded.
 *
 * The publicFacet can make new invitations (makeSwapInInvitation,
 * makeSwapOutInvitation, makeAddLiquidityInvitation, and
 * makeRemoveLiquidityInvitation), tell how much would be paid for a given input
 * (getInputPrice), or how much would be earned by depositing a specified amount
 * (getOutputPrice). In addition, there are requests for the LiquidityIssuer
 * (getLiquidityIssuer), the current outstanding liquidity (getLiquiditySupply),
 * and the current balances in the pool (getPoolAllocation).
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

  function consummate(tradeAmountIn, tradeAmountOut, swapSeat) {
    trade(
      zcf,
      {
        seat: poolSeat,
        gains: {
          [getPoolKeyword(tradeAmountIn.brand)]: tradeAmountIn,
        },
        losses: {
          [getPoolKeyword(tradeAmountOut.brand)]: tradeAmountOut,
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
  }

  /**
   * Swap one asset for another. In specifies the asset being provided and Out
   * specifies the wanted asset. If the want amount is 0, all of the In amount
   * is expended. If the want amount is positive, then only enough of the In is
   * spent to provide that Out. If the In is insufficient the trade is refused.
   *
   * @type {OfferHandler}
   */
  const swapInHandler = swapSeat => {
    assert(
      !centralMath.isEmpty(getPoolAmount(brands.Central)),
      `Pool not initialized`,
    );

    const {
      give: { In: amountIn },
      want: { Out: wantedAmountOut },
    } = swapSeat.getProposal();

    const tradeAmountIn = amountIn;
    const outputValue = getInputPrice(
      harden({
        inputValue: amountIn.value,
        inputReserve: getPoolAmount(amountIn.brand).value,
        outputReserve: getPoolAmount(wantedAmountOut.brand).value,
      }),
    );
    const outAmountMath = zcf.getAmountMath(wantedAmountOut.brand);
    const tradeAmountOut = outAmountMath.make(outputValue);
    return consummate(tradeAmountIn, tradeAmountOut, swapSeat);
  };

  /**
   * Swap one asset for another. In specifies the asset being provided and Out
   * specifies the wanted asset. If the want amount is 0, all of the In amount
   * is expended. If the want amount is positive, then only enough of the In is
   * spent to provide that Out. If the In is insufficient the trade is refused.
   *
   * @type {OfferHandler}
   */
  const swapOutHandler = swapSeat => {
    assert(
      !centralMath.isEmpty(getPoolAmount(brands.Central)),
      'Pool not initialized',
    );

    const {
      give: { In: amountIn },
      want: { Out: wantedAmountOut },
    } = swapSeat.getProposal();

    const tradeAmountOut = wantedAmountOut;
    const tradePrice = getOutputPrice({
      outputValue: wantedAmountOut.value,
      inputReserve: getPoolAmount(amountIn.brand).value,
      outputReserve: getPoolAmount(wantedAmountOut.brand).value,
    });
    assert(tradePrice <= amountIn.value, 'amountIn insufficient');
    const inAmountMath = zcf.getAmountMath(amountIn.brand);
    const tradeAmountIn = inAmountMath.make(tradePrice);

    return consummate(tradeAmountIn, tradeAmountOut, swapSeat);
  };

  const addLiquidity = (seat, secondaryValue) => {
    const userAllocation = seat.getCurrentAllocation();
    const centralPool = getPoolAmount(brands.Central).value;
    const centralIn = userAllocation.Central.value;
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
          Secondary: secondaryMath.make(secondaryValue),
        },
      },
      { seat, gains: { Liquidity: liquidityAmountOut } },
    );

    seat.exit();
    return 'Added liquidity.';
  };

  const initiateLiquidity = liqSeat => {
    const userAllocation = liqSeat.getCurrentAllocation();
    return addLiquidity(liqSeat, userAllocation.Secondary.value);
  };

  /**
   * Add liquidity. We use the amount of the Central asset as the basis, and
   * require that Secondary assets be added in proportion. If less Secondary is
   * provided than required, we refuse the offer. If more is provided than is
   * required, we return the excess.
   *
   * If this is the first time liquidity was added, we accept all of both
   * Primary and Secondary, to establish the initial trading ratio. In this
   * case, we create liquidity equal to the value of Central asset contributed.
   *
   * @type {OfferHandler}
   */
  const addLiquidityHandler = liqSeat => {
    if (centralMath.isEmpty(getPoolAmount(brands.Central))) {
      return initiateLiquidity(liqSeat);
    }

    const userAllocation = liqSeat.getCurrentAllocation();
    const secondaryIn = userAllocation.Secondary.value;

    // To calculate liquidity, we'll need to calculate alpha from the primary
    // token's value before, and the value that will be added to the pool
    const secondaryOut = calcSecondaryRequired({
      centralIn: userAllocation.Central.value,
      centralPool: getPoolAmount(brands.Central).value,
      secondaryPool: getPoolAmount(brands.Secondary).value,
      secondaryIn,
    });

    // Central was specified precisely so offer must provide enough secondary.
    assert(secondaryIn >= secondaryOut, 'insufficient Secondary deposited');

    return addLiquidity(liqSeat, secondaryOut);
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
          poolValue: getPoolAmount(brands.Central).value,
          liquidityValueIn,
        }),
      ),
    );
    const newUserSecondaryAmount = secondaryMath.make(
      calcValueToRemove(
        harden({
          liqTokenSupply,
          poolValue: getPoolAmount(brands.Secondary).value,
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

  const makeSwapInInvitation = () =>
    zcf.makeInvitation(
      assertProposalShape(swapInHandler, swapExpected),
      'autoswap swap',
    );

  const makeSwapOutInvitation = () =>
    zcf.makeInvitation(
      assertProposalShape(swapOutHandler, swapExpected),
      'autoswap swap',
    );

  /**
   * `getOutputForGivenInput` calculates the result of a trade, given a certain
   * amount of digital assets in.
   * @param {Amount} amountIn - the amount of digital
   * assets to be sent in
   * @param brandOut - The brand of asset desired
   */
  const getOutputForGivenInput = (amountIn, brandOut) => {
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
   * `getInputForGivenOutput` calculates the amount of assets required to be
   * provided in order to obtain a specified gain.
   * @param {Amount} amountOut - the amount of digital assets desired
   * @param brandIn - The brand of asset desired
   */
  const getInputForGivenOutput = (amountOut, brandIn) => {
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
    getInputPrice: getOutputForGivenInput,
    getOutputPrice: getInputForGivenOutput,
    getLiquidityIssuer: () => liquidityIssuer,
    getLiquiditySupply: () => liqTokenSupply,
    getPoolAllocation,
    makeSwapInvitation: makeSwapInInvitation,
    makeSwapInInvitation,
    makeSwapOutInvitation,
    makeAddLiquidityInvitation,
    makeRemoveLiquidityInvitation,
  });

  return harden({ publicFacet });
};

harden(start);
export { start };
