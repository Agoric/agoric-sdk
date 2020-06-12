// @ts-check

import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { assert, details } from '@agoric/assert';

// Eventually will be importable from '@agoric/zoe-contract-support'
import {
  getCurrentPrice,
  calcLiqExtentToMint,
  calcExtentToRemove,
  makeZoeHelpers,
} from '../contractSupport';

// Autoswap is a rewrite of Uniswap. Please see the documentation for
// more https://agoric.com/documentation/zoe/guide/contracts/autoswap.html

/**
 * @typedef {import('../zoe').ContractFacet} ContractFacet
 */

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(
  /** @param {ContractFacet} zcf */ zcf => {
    // Create the liquidity mint and issuer.
    const {
      mint: liquidityMint,
      issuer: liquidityIssuer,
      amountMath: liquidityAmountMath,
    } = produceIssuer('liquidity');

    let liqTokenSupply = 0;

    const {
      checkIfProposal,
      rejectOffer,
      makeEmptyOffer,
      checkHook,
      escrowAndAllocateTo,
      assertNatMathHelpers,
    } = makeZoeHelpers(zcf);

    return zcf.addNewIssuer(liquidityIssuer, 'Liquidity').then(() => {
      const keywords = harden(['TokenA', 'TokenB', 'Liquidity']);
      const { issuerKeywordRecord } = zcf.getInstanceRecord();
      const amountMathKeywordRecord = {};
      keywords.forEach(keyword => {
        const issuer = issuerKeywordRecord[keyword];
        const brand = zcf.getBrandForIssuer(issuer);
        assertNatMathHelpers(brand);
        amountMathKeywordRecord[keyword] = zcf.getAmountMath(brand);
      });

      function getPoolKeywords(poolAllocation, inBrand) {
        const tokenABrand = poolAllocation.TokenA.brand;
        const tokenBBrand = poolAllocation.TokenB.brand;
        const [inKeyword, outKeyword, outAmountMath] =
          inBrand === tokenABrand
            ? ['TokenA', 'TokenB', zcf.getAmountMath(tokenBBrand)]
            : ['TokenB', 'TokenA', zcf.getAmountMath(tokenABrand)];
        return { inKeyword, outKeyword, outAmountMath };
      }

      return makeEmptyOffer().then(poolHandle => {
        const getPoolAllocation = () =>
          zcf.getCurrentAllocation(poolHandle, amountMathKeywordRecord);

        const swap = offerHandle => {
          const { proposal } = zcf.getOffer(offerHandle);
          const inBrand = proposal.give.In.brand;
          const outBrand = proposal.want.Out.brand;
          if (proposal.want.Liquidity !== undefined) {
            rejectOffer(
              offerHandle,
              `A Liquidity amount should not be present in a swap`,
            );
          }

          const poolAllocation = getPoolAllocation();
          const { inKeyword, outKeyword } = getPoolKeywords(
            poolAllocation,
            inBrand,
          );
          const {
            outputExtent,
            newInputReserve,
            newOutputReserve,
          } = getCurrentPrice(
            harden({
              inputExtent: proposal.give.In.extent,
              inputReserve: poolAllocation[inKeyword].extent,
              outputReserve: poolAllocation[outKeyword].extent,
            }),
          );
          const wantAmountMath = zcf.getAmountMath(outBrand);
          const giveAmountMath = zcf.getAmountMath(inBrand);
          const amountOut = wantAmountMath.make(outputExtent);

          const satisfiesWantedAmounts = () =>
            wantAmountMath.isGTE(amountOut, proposal.want.Out);
          if (!satisfiesWantedAmounts()) {
            throw rejectOffer(offerHandle);
          }

          const newUserAmounts = {
            Liquidity: liquidityAmountMath.getEmpty(),
            In: giveAmountMath.getEmpty(),
            Out: amountOut,
          };

          const newPoolAmounts = {
            Liquidity: poolAllocation.Liquidity,
            [inKeyword]: giveAmountMath.make(newInputReserve),
            [outKeyword]: wantAmountMath.make(newOutputReserve),
          };

          zcf.reallocate(
            harden([offerHandle, poolHandle]),
            harden([newUserAmounts, newPoolAmounts]),
          );
          zcf.complete(harden([offerHandle]));
          return `Swap successfully completed.`;
        };

        const expected = harden({
          give: { In: null },
          want: { Out: null },
        });

        const swapHook = offerHandle => {
          assert(
            !checkIfProposal(offerHandle, { give: { Liquidity: null } }),
            details`A Liquidity amount should not be present in a swap`,
          );
          assert(
            !checkIfProposal(offerHandle, { want: { Liquidity: null } }),
            details`A Liquidity amount should not be present in a swap`,
          );
          // The offer should give 'In', and want 'Out'
          if (checkIfProposal(offerHandle, expected)) {
            return swap(offerHandle);
            /* eslint-disable no-else-return */
          } else {
            // Eject because the offer must be invalid
            return rejectOffer(offerHandle);
          }
        };

        const addLiquidityHook = offerHandle => {
          const userAllocation = zcf.getCurrentAllocation(offerHandle);
          const poolAllocation = getPoolAllocation();

          // Calculate how many liquidity tokens we should be minting.
          // Calculations are based on the extents represented by TokenA.
          // If the current supply is zero, start off by just taking the
          // extent at TokenA and using it as the extent for the
          // liquidity token.
          const liquidityExtentOut = calcLiqExtentToMint(
            harden({
              liqTokenSupply,
              inputExtent: userAllocation.TokenA.extent,
              inputReserve: poolAllocation.TokenA.extent,
            }),
          );

          const liquidityAmountOut = liquidityAmountMath.make(
            liquidityExtentOut,
          );

          const liquidityPaymentP = liquidityMint.mintPayment(
            liquidityAmountOut,
          );

          return escrowAndAllocateTo({
            amount: liquidityAmountOut,
            payment: liquidityPaymentP,
            keywords: ['Liquidity', 'Liquidity'],
            recipientHandle: offerHandle,
          }).then(() => {
            liqTokenSupply += liquidityExtentOut;

            const add = (key, obj1, obj2) =>
              zcf.getAmountMath(obj1[key].brand).add(obj1[key], obj2[key]);
            const newPoolAmounts = harden({
              TokenA: add('TokenA', userAllocation, poolAllocation),
              TokenB: add('TokenB', userAllocation, poolAllocation),
              Liquidity: poolAllocation.Liquidity,
            });

            const getEmpty = (key, alloc) =>
              zcf.getAmountMath(alloc[key].brand).getEmpty();
            const newUserAmounts = harden({
              TokenA: getEmpty('TokenA', userAllocation),
              TokenB: getEmpty('TokenB', userAllocation),
              Liquidity: liquidityAmountOut,
            });

            zcf.reallocate(
              harden([offerHandle, poolHandle]),
              harden([newUserAmounts, newPoolAmounts]),
              harden(['TokenA', 'TokenB', 'Liquidity']),
            );
            zcf.complete(harden([offerHandle]));
            return 'Added liquidity.';
          });
        };

        const addLiquidityExpected = harden({
          give: { TokenA: null, TokenB: null },
          want: { Liquidity: null },
        });

        const removeLiquidityHook = offerHandle => {
          const userAllocation = zcf.getCurrentAllocation(offerHandle);
          const liquidityExtentIn = userAllocation.Liquidity.extent;

          const poolAllocation = getPoolAllocation();
          const tokenAAmountMath = zcf.getAmountMath(
            userAllocation.TokenA.brand,
          );
          const tokenBAmountMath = zcf.getAmountMath(
            userAllocation.TokenB.brand,
          );

          const newUserTokenAAmount = tokenAAmountMath.make(
            calcExtentToRemove(
              harden({
                liqTokenSupply,
                poolExtent: poolAllocation.TokenA.extent,
                liquidityExtentIn,
              }),
            ),
          );

          const newUserTokenBAmount = tokenBAmountMath.make(
            calcExtentToRemove(
              harden({
                liqTokenSupply,
                poolExtent: poolAllocation.TokenB.extent,
                liquidityExtentIn,
              }),
            ),
          );

          const newUserAmounts = harden({
            TokenA: newUserTokenAAmount,
            TokenB: newUserTokenBAmount,
            Liquidity: liquidityAmountMath.getEmpty(),
          });

          const newPoolAmounts = harden({
            TokenA: tokenAAmountMath.subtract(
              poolAllocation.TokenA,
              newUserAmounts.TokenA,
            ),
            TokenB: tokenBAmountMath.subtract(
              poolAllocation.TokenB,
              newUserAmounts.TokenB,
            ),
            Liquidity: liquidityAmountMath.add(
              poolAllocation.Liquidity,
              liquidityAmountMath.make(liquidityExtentIn),
            ),
          });

          liqTokenSupply -= liquidityExtentIn;

          zcf.reallocate(
            harden([offerHandle, poolHandle]),
            harden([newUserAmounts, newPoolAmounts]),
          );
          zcf.complete(harden([offerHandle]));
          return 'Liquidity successfully removed.';
        };

        const removeLiquidityExpected = harden({
          want: { TokenA: null, TokenB: null },
          give: { Liquidity: null },
        });

        const makeAddLiquidityInvite = () =>
          zcf.makeInvitation(
            checkHook(addLiquidityHook, addLiquidityExpected),
            'autoswap add liquidity',
          );

        zcf.initPublicAPI(
          harden({
            /**
             * `getCurrentPrice` calculates the result of a trade, given a certain amount
             * of digital assets in.
             * @param {object} amountInObj - the amount of digital
             * assets to be sent in, keyed by keyword
             */
            getCurrentPrice: amountInObj => {
              const inKeywords = Object.getOwnPropertyNames(amountInObj);
              assert(
                inKeywords.length === 1,
                details`argument to 'getCurrentPrice' must have one keyword`,
              );
              assert(
                inKeywords.includes('In'),
                details`keyword ${inKeywords} must only include 'In'`,
              );
              const inBrand = amountInObj.In.brand;
              const inputExtent = zcf
                .getAmountMath(inBrand)
                .getExtent(amountInObj.In);
              const poolAllocation = getPoolAllocation();
              const { inKeyword, outKeyword, outAmountMath } = getPoolKeywords(
                poolAllocation,
                inBrand,
              );
              const inputReserve = poolAllocation[inKeyword].extent;
              const outputReserve = poolAllocation[outKeyword].extent;
              const { outputExtent } = getCurrentPrice(
                harden({
                  inputExtent,
                  inputReserve,
                  outputReserve,
                }),
              );
              return outAmountMath.make(outputExtent);
            },

            getLiquidityIssuer: () => liquidityIssuer,

            getPoolAllocation,

            makeSwapInvite: () => zcf.makeInvitation(swapHook, 'autoswap swap'),

            makeAddLiquidityInvite,

            makeRemoveLiquidityInvite: () =>
              zcf.makeInvitation(
                checkHook(removeLiquidityHook, removeLiquidityExpected),
                'autoswap remove liquidity',
              ),
          }),
        );

        return makeAddLiquidityInvite();
      });
    });
  },
);
