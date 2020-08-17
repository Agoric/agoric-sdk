// @ts-check

import { assert } from '@agoric/assert';

// Eventually will be importable from '@agoric/zoe-contract-support'
import {
  getInputPrice,
  calcLiqValueToMint,
  calcValueToRemove,
  assertProposalKeywords,
  assertUsesNatMath,
  trade,
} from '../contractSupport';

import '../../exported';

/**
 * Autoswap is a rewrite of Uniswap. Please see the documentation for
 * more https://agoric.com/documentation/zoe/guide/contracts/autoswap.html
 *
 * When the contract is instantiated, the two tokens are specified in the
 * terms.issuers. The party that calls startInstance gets an invitation
 * to add liquidity. The same invitation is available by calling
 * `E(publicFacet).makeAddLiquidityInvitation()`. Separate invitations are available for
 * adding and removing liquidity, and for doing a swap. Other API operations
 * support monitoring the price and the size of the liquidity pool.
 *
 * @type {ContractStartFn}
 */
const start = async zcf => {
  // Create a local liquidity mint and issuer.
  const liquidityMint = await zcf.makeZCFMint('Liquidity');
  // AWAIT  ////////////////////

  const {
    issuer: liquidityIssuer,
    amountMath: liquidityAmountMath,
  } = liquidityMint.getIssuerRecord();
  let liqTokenSupply = 0;

  // In order to get all the brands, we must call zcf.getTerms() after
  // we create the liquidityIssuer
  const {
    brands,
    maths: { TokenA: tokenAMath, TokenB: tokenBMath },
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

  /** @type {OfferHandler} */
  const swapHandler = swapSeat => {
    const {
      give: { In: amountIn },
      want: { Out: wantedAmountOut },
    } = swapSeat.getProposal();
    const outputValue = getInputPrice(
      harden({
        inputValue: amountIn.value,
        inputReserve: getPoolAmount(amountIn.brand).value,
        outputReserve: getPoolAmount(wantedAmountOut.brand).value,
      }),
    );
    const amountOut = zcf
      .getAmountMath(wantedAmountOut.brand)
      .make(outputValue);

    trade(
      zcf,
      {
        seat: poolSeat,
        gains: {
          [getPoolKeyword(amountIn.brand)]: amountIn,
        },
        losses: {
          [getPoolKeyword(amountOut.brand)]: amountOut,
        },
      },
      {
        seat: swapSeat,
        gains: { Out: amountOut },
        losses: { In: amountIn },
      },
    );
    swapSeat.exit();
    return `Swap successfully completed.`;
  };

  /** @type {OfferHandler} */
  const addLiquidityHandler = liqSeat => {
    const userAllocation = liqSeat.getCurrentAllocation();

    // Calculate how many liquidity tokens we should be minting.
    // Calculations are based on the values represented by TokenA.
    // If the current supply is zero, start off by just taking the
    // value at TokenA and using it as the value for the
    // liquidity token.
    const liquidityValueOut = calcLiqValueToMint(
      harden({
        liqTokenSupply,
        inputValue: userAllocation.TokenA.value,
        inputReserve: getPoolAmount(userAllocation.TokenA.brand).value,
      }),
    );
    const liquidityAmountOut = liquidityAmountMath.make(liquidityValueOut);
    liquidityMint.mintGains({ Liquidity: liquidityAmountOut }, poolSeat);
    liqTokenSupply += liquidityValueOut;

    trade(
      zcf,
      {
        seat: poolSeat,
        gains: {
          TokenA: userAllocation.TokenA,
          TokenB: userAllocation.TokenB,
        },
      },
      { seat: liqSeat, gains: { Liquidity: liquidityAmountOut } },
    );

    liqSeat.exit();
    return 'Added liquidity.';
  };

  /** @type {OfferHandler} */
  const removeLiquidityHandler = removeLiqSeat => {
    // TODO (hibbert) should we burn tokens?
    const userAllocation = removeLiqSeat.getCurrentAllocation();
    const liquidityValueIn = userAllocation.Liquidity.value;

    const newUserTokenAAmount = tokenAMath.make(
      calcValueToRemove(
        harden({
          liqTokenSupply,
          poolValue: getPoolAmount(userAllocation.TokenA.brand).value,
          liquidityValueIn,
        }),
      ),
    );
    const newUserTokenBAmount = tokenBMath.make(
      calcValueToRemove(
        harden({
          liqTokenSupply,
          poolValue: getPoolAmount(userAllocation.TokenB.brand).value,
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
          TokenA: newUserTokenAAmount,
          TokenB: newUserTokenBAmount,
        },
      },
    );

    removeLiqSeat.exit();
    return 'Liquidity successfully removed.';
  };

  const addLiquidityExpected = harden({
    give: { TokenA: null, TokenB: null },
    want: { Liquidity: null },
  });

  const removeLiquidityExpected = harden({
    want: { TokenA: null, TokenB: null },
    give: { Liquidity: null },
  });

  const swapExpected = {
    want: { Out: null },
    give: { In: null },
  };

  const makeAddLiquidityInvitation = () =>
    zcf.makeInvitation(
      assertProposalKeywords(addLiquidityHandler, addLiquidityExpected),
      'autoswap add liquidity',
    );

  const makeRemoveLiquidityInvitation = () =>
    zcf.makeInvitation(
      assertProposalKeywords(removeLiquidityHandler, removeLiquidityExpected),
      'autoswap remove liquidity',
    );

  const makeSwapInvitation = () =>
    zcf.makeInvitation(
      assertProposalKeywords(swapHandler, swapExpected),
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

  const getPoolAllocation = poolSeat.getCurrentAllocation;

  /** @type {AutoswapPublicFacet} */
  const publicFacet = harden({
    getCurrentPrice,
    getLiquidityIssuer: () => liquidityIssuer,
    getPoolAllocation,
    makeSwapInvitation,
    makeAddLiquidityInvitation,
    makeRemoveLiquidityInvitation,
  });

  return harden({ publicFacet });
};

harden(start);
export { start };
