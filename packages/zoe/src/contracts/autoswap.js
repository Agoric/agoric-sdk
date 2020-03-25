/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { assert, details } from '@agoric/assert';

import { makeZoeHelpers } from './helpers/zoeHelpers';
import { makeConstProductBC } from './helpers/bondingCurves';

// Autoswap is a rewrite of Uniswap. Please see the documentation for
// more https://agoric.com/documentation/zoe/guide/contracts/autoswap.html

export const makeContract = harden(zoe => {
  // Create the liquidity mint and issuer.
  const { mint: liquidityMint, issuer: liquidityIssuer } = produceIssuer(
    'liquidity',
  );

  let liqTokenSupply = 0;

  return zoe.addNewIssuer(liquidityIssuer, 'Liquidity').then(() => {
    const { issuerKeywordRecord } = zoe.getInstanceRecord();
    const amountMaths = zoe.getAmountMaths(issuerKeywordRecord);
    Object.values(amountMaths).forEach(amountMath =>
      assert(
        amountMath.getMathHelpersName() === 'nat',
        details`issuers must have natMathHelpers`,
      ),
    );
    const {
      rejectOffer,
      makeEmptyOffer,
      rejectIfNotProposal,
      checkIfProposal,
    } = makeZoeHelpers(zoe);
    const {
      getPrice,
      calcLiqExtentToMint,
      calcAmountsToRemove,
    } = makeConstProductBC(zoe);

    return makeEmptyOffer().then(poolHandle => {
      const getPoolAmounts = () => zoe.getOffer(poolHandle).amounts;

      const makeInvite = () => {
        const seat = harden({
          swap: () => {
            const { proposal } = zoe.getOffer(inviteHandle);
            const giveTokenA = harden({
              give: ['TokenA'],
              want: ['TokenB', 'Liquidity'],
            });
            const giveTokenB = harden({
              give: ['TokenB'],
              want: ['TokenA', 'Liquidity'],
            });
            let giveKeyword;
            let wantKeyword;
            if (checkIfProposal(inviteHandle, giveTokenA)) {
              giveKeyword = 'TokenA';
              wantKeyword = 'TokenB';
            } else if (checkIfProposal(inviteHandle, giveTokenB)) {
              giveKeyword = 'TokenB';
              wantKeyword = 'TokenA';
            } else {
              return rejectOffer(inviteHandle);
            }
            if (!amountMaths.Liquidity.isEmpty(proposal.want.Liquidity)) {
              rejectOffer(
                inviteHandle,
                `A Liquidity amount should not be present in a swap`,
              );
            }

            const poolAmounts = getPoolAmounts();
            const {
              outputExtent,
              newInputReserve,
              newOutputReserve,
            } = getPrice(
              harden({
                inputExtent: proposal.give[giveKeyword].extent,
                inputReserve: poolAmounts[giveKeyword].extent,
                outputReserve: poolAmounts[wantKeyword].extent,
              }),
            );
            const amountOut = amountMaths[wantKeyword].make(outputExtent);
            const wantedAmount = proposal.want[wantKeyword];
            const satisfiesWantedAmounts = () =>
              amountMaths[wantKeyword].isGTE(amountOut, wantedAmount);
            if (!satisfiesWantedAmounts()) {
              throw rejectOffer(inviteHandle);
            }

            const newUserAmounts = {
              Liquidity: amountMaths.Liquidity.getEmpty(),
            };
            newUserAmounts[giveKeyword] = amountMaths[giveKeyword].getEmpty();
            newUserAmounts[wantKeyword] = amountOut;

            const newPoolAmounts = { Liquidity: poolAmounts.Liquidity };
            newPoolAmounts[giveKeyword] = amountMaths[giveKeyword].make(
              newInputReserve,
            );
            newPoolAmounts[wantKeyword] = amountMaths[wantKeyword].make(
              newOutputReserve,
            );

            zoe.reallocate(
              harden([inviteHandle, poolHandle]),
              harden([newUserAmounts, newPoolAmounts]),
            );
            zoe.complete(harden([inviteHandle]));
            return `Swap successfully completed.`;
          },
          addLiquidity: () => {
            const expected = harden({
              give: ['TokenA', 'TokenB'],
              want: ['Liquidity'],
            });
            rejectIfNotProposal(inviteHandle, expected);

            const userAmounts = zoe.getOffer(inviteHandle).amounts;
            const poolAmounts = getPoolAmounts();

            // Calculate how many liquidity tokens we should be minting.
            // Calculations are based on the extents represented by TokenA.
            // If the current supply is zero, start off by just taking the
            // extent at TokenA and using it as the extent for the
            // liquidity token.
            const liquidityExtentOut = calcLiqExtentToMint(
              harden({
                liqTokenSupply,
                inputExtent: userAmounts.TokenA.extent,
                inputReserve: poolAmounts.TokenA.extent,
              }),
            );

            const liquidityAmountOut = amountMaths.Liquidity.make(
              liquidityExtentOut,
            );

            const liquidityPaymentP = liquidityMint.mintPayment(
              liquidityAmountOut,
            );
            const proposal = harden({
              give: { Liquidity: liquidityAmountOut },
            });
            const { inviteHandle: tempLiqHandle, invite } = zoe.makeInvite();
            const zoeService = zoe.getZoeService();
            return zoeService
              .redeem(
                invite,
                proposal,
                harden({ Liquidity: liquidityPaymentP }),
              )
              .then(() => {
                liqTokenSupply += liquidityExtentOut;

                const add = (key, obj1, obj2) =>
                  amountMaths[key].add(obj1[key], obj2[key]);

                const newPoolAmounts = harden({
                  TokenA: add('TokenA', userAmounts, poolAmounts),
                  TokenB: add('TokenB', userAmounts, poolAmounts),
                  Liquidity: poolAmounts.Liquidity,
                });

                const newUserAmounts = harden({
                  TokenA: amountMaths.TokenA.getEmpty(),
                  TokenB: amountMaths.TokenB.getEmpty(),
                  Liquidity: liquidityAmountOut,
                });

                const newTempLiqAmounts = harden({
                  TokenA: amountMaths.TokenA.getEmpty(),
                  TokenB: amountMaths.TokenB.getEmpty(),
                  Liquidity: amountMaths.Liquidity.getEmpty(),
                });

                zoe.reallocate(
                  harden([inviteHandle, poolHandle, tempLiqHandle]),
                  harden([newUserAmounts, newPoolAmounts, newTempLiqAmounts]),
                );
                zoe.complete(harden([inviteHandle, tempLiqHandle]));
                return 'Added liquidity.';
              });
          },
          removeLiquidity: () => {
            const expected = harden({
              want: ['TokenA', 'TokenB'],
              give: ['Liquidity'],
            });
            rejectIfNotProposal(inviteHandle, expected);

            const userAmounts = zoe.getOffer(inviteHandle).amounts;
            const liquidityExtentIn = userAmounts.Liquidity.extent;

            const poolAmounts = getPoolAmounts();

            const newUserAmounts = calcAmountsToRemove(
              harden({
                liqTokenSupply,
                poolAmounts,
                liquidityExtentIn,
              }),
            );

            const newPoolAmounts = harden({
              TokenA: amountMaths.TokenA.subtract(
                poolAmounts.TokenA,
                newUserAmounts.TokenA,
              ),
              TokenB: amountMaths.TokenB.subtract(
                poolAmounts.TokenB,
                newUserAmounts.TokenB,
              ),
              Liquidity: amountMaths.Liquidity.add(
                poolAmounts.Liquidity,
                amountMaths.Liquidity.make(liquidityExtentIn),
              ),
            });

            liqTokenSupply -= liquidityExtentIn;

            zoe.reallocate(
              harden([inviteHandle, poolHandle]),
              harden([newUserAmounts, newPoolAmounts]),
            );
            zoe.complete(harden([inviteHandle]));
            return 'Liquidity successfully removed.';
          },
        });
        const { invite, inviteHandle } = zoe.makeInvite(seat, {
          seatDesc: 'autoswapSeat',
        });
        return invite;
      };

      return harden({
        invite: makeInvite(),
        publicAPI: {
          /**
           * `getPrice` calculates the result of a trade, given a certain amount
           * of digital assets in.
           * @param {object} amountInObj - the amount of digital
           * assets to be sent in, keyed by keyword
           */
          getPrice: amountInObj => {
            const inKeywords = Object.getOwnPropertyNames(amountInObj);
            assert(
              inKeywords.length === 1,
              details`argument to 'getPrice' must have one keyword`,
            );
            const [inKeyword] = inKeywords;
            assert(
              ['TokenA', 'TokenB'].includes(inKeyword),
              details`keyword ${inKeyword} was not valid`,
            );
            const inputExtent = amountMaths[inKeyword].getExtent(
              amountInObj[inKeyword],
            );
            const poolAmounts = getPoolAmounts();
            const inputReserve = poolAmounts[inKeyword].extent;
            const outKeyword = inKeyword === 'TokenA' ? 'TokenB' : 'TokenA';
            const outputReserve = poolAmounts[outKeyword].extent;
            const { outputExtent } = getPrice(
              harden({
                inputExtent,
                inputReserve,
                outputReserve,
              }),
            );
            return amountMaths[outKeyword].make(outputExtent);
          },
          getLiquidityIssuer: () => liquidityIssuer,
          getPoolAmounts,
          makeInvite,
        },
      });
    });
  });
});
