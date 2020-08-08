// @ts-check

import makeIssuerKit from '@agoric/ertp';

// Eventually will be importable from '@agoric/zoe-contract-support'
import {
  getInputPrice,
  calcLiqValueToMint,
  calcValueToRemove,
  makeZoeHelpers,
} from '../contractSupport';

import '../../exported';

/**
 * Autoswap is a rewrite of Uniswap. Please see the documentation for
 * more https://agoric.com/documentation/zoe/guide/contracts/autoswap.html
 *
 * When the contract is instantiated, the two tokens are specified in the
 * issuerKeywordRecord. The party that calls makeInstance gets an invitation
 * to add liquidity. The same invitation is available by calling
 * `await E(publicAPI).makeAddLiquidityInvite()`. Separate invitations are available for
 * adding and removing liquidity, and for doing a swap. Other API operations
 * support monitoring the price and the size of the liquidity pool.
 *
 * @param {ContractFacet} zcf
 */
const makeContract = zcf => {
  // Create the liquidity mint and issuer.
  const {
    mint: liquidityMint,
    issuer: liquidityIssuer,
    amountMath: liquidityAmountMath,
  } = makeIssuerKit('liquidity');

  let liqTokenSupply = 0;

  const {
    makeEmptyOffer,
    checkHook,
    escrowAndAllocateTo,
    assertNatMathHelpers,
    trade,
  } = makeZoeHelpers(zcf);

  return zcf.addNewIssuer(liquidityIssuer, 'Liquidity').then(() => {
    const { brandKeywordRecord } = zcf.getInstanceRecord();
    Object.values(brandKeywordRecord).forEach(brand =>
      assertNatMathHelpers(brand),
    );
    const getPoolKeyword = brandToMatch => {
      const entries = Object.entries(brandKeywordRecord);
      for (const [keyword, brand] of entries) {
        if (brand === brandToMatch) {
          return keyword;
        }
      }
      throw new Error('getPoolKeyword: brand not found');
    };

    return makeEmptyOffer().then(poolHandle => {
      const getPoolAmount = brand => {
        const keyword = getPoolKeyword(brand);
        return zcf.getCurrentAllocation(poolHandle)[keyword];
      };

      const swapHook = offerHandle => {
        const {
          proposal: {
            give: { In: amountIn },
            want: { Out: wantedAmountOut },
          },
        } = zcf.getOffer(offerHandle);
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
          {
            offerHandle: poolHandle,
            gains: {
              [getPoolKeyword(amountIn.brand)]: amountIn,
            },
            losses: {
              [getPoolKeyword(amountOut.brand)]: amountOut,
            },
          },
          {
            offerHandle,
            gains: { Out: amountOut },
            losses: { In: amountIn },
          },
        );
        zcf.complete(harden([offerHandle]));
        return `Swap successfully completed.`;
      };

      const addLiquidityHook = offerHandle => {
        const userAllocation = zcf.getCurrentAllocation(offerHandle);

        // Calculate how many liquidity tokens we should be minting.
        // Calculations are based on the values represented by TokenA.
        // If the current supply is zero, start off by just taking the
        // value at TokenA and using it as the value for the
        // liquidity token.
        const tokenAPoolAmount = getPoolAmount(userAllocation.TokenA.brand);
        const inputReserve = tokenAPoolAmount ? tokenAPoolAmount.value : 0;
        const liquidityValueOut = calcLiqValueToMint(
          harden({
            liqTokenSupply,
            inputValue: userAllocation.TokenA.value,
            inputReserve,
          }),
        );
        const liquidityAmountOut = liquidityAmountMath.make(liquidityValueOut);
        const liquidityPaymentE = liquidityMint.mintPayment(liquidityAmountOut);

        return escrowAndAllocateTo({
          amount: liquidityAmountOut,
          payment: liquidityPaymentE,
          keyword: 'Liquidity',
          recipientHandle: offerHandle,
        }).then(() => {
          liqTokenSupply += liquidityValueOut;

          trade(
            {
              offerHandle: poolHandle,
              gains: {
                TokenA: userAllocation.TokenA,
                TokenB: userAllocation.TokenB,
              },
            },
            // We've already given the user their liquidity using
            // escrowAndAllocateTo
            { offerHandle, gains: {} },
          );

          zcf.complete(harden([offerHandle]));
          return 'Added liquidity.';
        });
      };

      const removeLiquidityHook = offerHandle => {
        const userAllocation = zcf.getCurrentAllocation(offerHandle);
        const liquidityValueIn = userAllocation.Liquidity.value;

        const newUserTokenAAmount = zcf
          .getAmountMath(userAllocation.TokenA.brand)
          .make(
            calcValueToRemove(
              harden({
                liqTokenSupply,
                poolValue: getPoolAmount(userAllocation.TokenA.brand).value,
                liquidityValueIn,
              }),
            ),
          );
        const newUserTokenBAmount = zcf
          .getAmountMath(userAllocation.TokenB.brand)
          .make(
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
          {
            offerHandle: poolHandle,
            gains: { Liquidity: userAllocation.Liquidity },
          },
          {
            offerHandle,
            gains: {
              TokenA: newUserTokenAAmount,
              TokenB: newUserTokenBAmount,
            },
          },
        );

        zcf.complete(harden([offerHandle]));
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

      const makeAddLiquidityInvite = () =>
        zcf.makeInvitation(
          checkHook(addLiquidityHook, addLiquidityExpected),
          'autoswap add liquidity',
        );

      const makeRemoveLiquidityInvite = () =>
        zcf.makeInvitation(
          checkHook(removeLiquidityHook, removeLiquidityExpected),
          'autoswap remove liquidity',
        );

      const makeSwapInvite = () =>
        zcf.makeInvitation(checkHook(swapHook, swapExpected), 'autoswap swap');

      /**
       * `getCurrentPrice` calculates the result of a trade, given a certain amount
       * of digital assets in.
       * @param {Amount} amountIn - the amount of digital
       * assets to be sent in
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

      const getPoolAllocation = () =>
        zcf.getCurrentAllocation(poolHandle, brandKeywordRecord);

      zcf.initPublicAPI(
        harden({
          getCurrentPrice,
          getLiquidityIssuer: () => liquidityIssuer,
          getPoolAllocation,
          makeSwapInvite,
          makeAddLiquidityInvite,
          makeRemoveLiquidityInvite,
        }),
      );

      return makeAddLiquidityInvite();
    });
  });
};

harden(makeContract);
export { makeContract };
