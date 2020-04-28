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

// zcf is the Zoe Contract Facet, i.e. the contract-facing API of Zoe
export const makeContract = harden(zcf => {
  // Create the liquidity mint and issuer.
  const { mint: liquidityMint, issuer: liquidityIssuer } = produceIssuer(
    'liquidity',
  );

  let liqTokenSupply = 0;

  const {
    checkIfProposal,
    rejectOffer,
    makeEmptyOffer,
    inviteAnOffer,
    escrowAndAllocateTo,
  } = makeZoeHelpers(zcf);

  return zcf.addNewIssuer(liquidityIssuer, 'Liquidity').then(() => {
    const amountMaths = zcf.getAmountMaths(
      harden(['TokenA', 'TokenB', 'Liquidity']),
    );
    Object.values(amountMaths).forEach(amountMath =>
      assert(
        amountMath.getMathHelpersName() === 'nat',
        details`issuers must have natMathHelpers`,
      ),
    );

    return makeEmptyOffer().then(poolHandle => {
      const getPoolAllocation = () => zcf.getCurrentAllocation(poolHandle);

      const swap = (offerHandle, giveKeyword, wantKeyword) => {
        const { proposal } = zcf.getOffer(offerHandle);
        if (proposal.want.Liquidity !== undefined) {
          rejectOffer(
            offerHandle,
            `A Liquidity amount should not be present in a swap`,
          );
        }

        const poolAllocation = getPoolAllocation();
        const {
          outputExtent,
          newInputReserve,
          newOutputReserve,
        } = getCurrentPrice(
          harden({
            inputExtent: proposal.give[giveKeyword].extent,
            inputReserve: poolAllocation[giveKeyword].extent,
            outputReserve: poolAllocation[wantKeyword].extent,
          }),
        );
        const amountOut = amountMaths[wantKeyword].make(outputExtent);
        const wantedAmount = proposal.want[wantKeyword];
        const satisfiesWantedAmounts = () =>
          amountMaths[wantKeyword].isGTE(amountOut, wantedAmount);
        if (!satisfiesWantedAmounts()) {
          throw rejectOffer(offerHandle);
        }

        const newUserAmounts = {
          Liquidity: amountMaths.Liquidity.getEmpty(),
        };
        newUserAmounts[giveKeyword] = amountMaths[giveKeyword].getEmpty();
        newUserAmounts[wantKeyword] = amountOut;

        const newPoolAmounts = { Liquidity: poolAllocation.Liquidity };
        newPoolAmounts[giveKeyword] = amountMaths[giveKeyword].make(
          newInputReserve,
        );
        newPoolAmounts[wantKeyword] = amountMaths[wantKeyword].make(
          newOutputReserve,
        );

        zcf.reallocate(
          harden([offerHandle, poolHandle]),
          harden([newUserAmounts, newPoolAmounts]),
        );
        zcf.complete(harden([offerHandle]));
        return `Swap successfully completed.`;
      };

      const buyASellB = harden({
        give: { TokenB: null },
        want: { TokenA: null },
      });

      const buyBSellA = harden({
        give: { TokenA: null },
        want: { TokenB: null },
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
        if (checkIfProposal(offerHandle, buyASellB)) {
          return swap(offerHandle, 'TokenB', 'TokenA');
          /* eslint-disable no-else-return */
        } else if (checkIfProposal(offerHandle, buyBSellA)) {
          return swap(offerHandle, 'TokenA', 'TokenB');
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

        const liquidityAmountOut = amountMaths.Liquidity.make(
          liquidityExtentOut,
        );

        const liquidityPaymentP = liquidityMint.mintPayment(liquidityAmountOut);

        return escrowAndAllocateTo({
          amount: liquidityAmountOut,
          payment: liquidityPaymentP,
          keyword: 'Liquidity',
          recipientHandle: offerHandle,
        }).then(() => {
          liqTokenSupply += liquidityExtentOut;

          const add = (key, obj1, obj2) =>
            amountMaths[key].add(obj1[key], obj2[key]);

          const newPoolAmounts = harden({
            TokenA: add('TokenA', userAllocation, poolAllocation),
            TokenB: add('TokenB', userAllocation, poolAllocation),
            Liquidity: poolAllocation.Liquidity,
          });

          const newUserAmounts = harden({
            TokenA: amountMaths.TokenA.getEmpty(),
            TokenB: amountMaths.TokenB.getEmpty(),
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

      const removeLiquidityHook = offerHandle => {
        const userAllocation = zcf.getCurrentAllocation(offerHandle);
        const liquidityExtentIn = userAllocation.Liquidity.extent;

        const poolAllocation = getPoolAllocation();

        const newUserTokenAAmount = amountMaths.TokenA.make(
          calcExtentToRemove(
            harden({
              liqTokenSupply,
              poolExtent: poolAllocation.TokenA.extent,
              liquidityExtentIn,
            }),
          ),
        );
        const newUserTokenBAmount = amountMaths.TokenB.make(
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
          Liquidity: amountMaths.Liquidity.getEmpty(),
        });

        const newPoolAmounts = harden({
          TokenA: amountMaths.TokenA.subtract(
            poolAllocation.TokenA,
            newUserAmounts.TokenA,
          ),
          TokenB: amountMaths.TokenB.subtract(
            poolAllocation.TokenB,
            newUserAmounts.TokenB,
          ),
          Liquidity: amountMaths.Liquidity.add(
            poolAllocation.Liquidity,
            amountMaths.Liquidity.make(liquidityExtentIn),
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

      const makeAddLiquidityInvite = () =>
        inviteAnOffer({
          offerHook: addLiquidityHook,
          customProperties: {
            inviteDesc: 'autoswap add liquidity',
          },
          expected: {
            give: { TokenA: null, TokenB: null },
            want: { Liquidity: null },
          },
        });

      return harden({
        invite: makeAddLiquidityInvite(),
        publicAPI: {
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
            const [inKeyword] = inKeywords;
            assert(
              ['TokenA', 'TokenB'].includes(inKeyword),
              details`keyword ${inKeyword} was not valid`,
            );
            const inputExtent = amountMaths[inKeyword].getExtent(
              amountInObj[inKeyword],
            );
            const poolAllocation = getPoolAllocation();
            const inputReserve = poolAllocation[inKeyword].extent;
            const outKeyword = inKeyword === 'TokenA' ? 'TokenB' : 'TokenA';
            const outputReserve = poolAllocation[outKeyword].extent;
            const { outputExtent } = getCurrentPrice(
              harden({
                inputExtent,
                inputReserve,
                outputReserve,
              }),
            );
            return amountMaths[outKeyword].make(outputExtent);
          },
          getLiquidityIssuer: () => liquidityIssuer,
          getPoolAllocation,

          makeSwapInvite: () =>
            inviteAnOffer({
              offerHook: swapHook,
              customProperties: {
                inviteDesc: 'autoswap swap',
              },
            }),
          makeAddLiquidityInvite,
          makeRemoveLiquidityInvite: () =>
            inviteAnOffer({
              offerHook: removeLiquidityHook,
              customProperties: {
                inviteDesc: 'autoswap remove liquidity',
              },
              expected: {
                want: { TokenA: null, TokenB: null },
                give: { Liquidity: null },
              },
            }),
        },
      });
    });
  });
});
