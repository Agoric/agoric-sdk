/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { assert, details } from '@agoric/assert';

import { makeZoeHelpers } from './helpers/zoeHelpers';
import { makeConstProductBC } from './helpers/bondingCurves';

export const makeContract = harden(zoe => {
  // Create the liquidity mint and issuer.
  const { mint: liquidityMint, issuer: liquidityIssuer } = produceIssuer(
    'liquidity',
  );

  let poolHandle;
  let liqTokenSupply = 0;

  return zoe.addNewIssuer(liquidityIssuer, 'Liquidity').then(() => {
    const { roles, roleNames } = zoe.getInstanceRecord();
    const amountMaths = zoe.getAmountMathsForRoles(roles);
    Object.values(amountMaths).forEach(amountMath =>
      assert(
        amountMath.getMathHelpersName() === 'nat',
        details`issuers must have natMathHelpers`,
      ),
    );
    const {
      rejectOffer,
      makeEmptyOffer,
      rejectIfNotOfferRules,
      checkIfOfferRules,
    } = makeZoeHelpers(zoe);
    const {
      getPrice,
      calcLiqExtentToMint,
      calcAmountsToRemove,
    } = makeConstProductBC(zoe);

    const getPoolAmounts = () => zoe.getOffer(poolHandle).amounts;

    return makeEmptyOffer().then(handle => {
      poolHandle = handle;

      const makeInvite = () => {
        const seat = harden({
          swap: () => {
            const { offerRules } = zoe.getOffer(inviteHandle);
            const offerTokenA = harden({
              offer: ['TokenA'],
              want: ['TokenB', 'Liquidity'],
            });
            const offerTokenB = harden({
              offer: ['TokenB'],
              want: ['TokenA', 'Liquidity'],
            });
            let offerRoleName;
            let wantRoleName;
            if (checkIfOfferRules(inviteHandle, offerTokenA)) {
              offerRoleName = 'TokenA';
              wantRoleName = 'TokenB';
            } else if (checkIfOfferRules(inviteHandle, offerTokenB)) {
              offerRoleName = 'TokenB';
              wantRoleName = 'TokenA';
            } else {
              return rejectOffer(inviteHandle);
            }

            const poolAmounts = getPoolAmounts();
            const {
              outputExtent,
              newInputReserve,
              newOutputReserve,
            } = getPrice(
              harden({
                inputExtent: offerRules.offer[offerRoleName].extent,
                inputReserve: poolAmounts[offerRoleName].extent,
                outputReserve: poolAmounts[wantRoleName].extent,
              }),
            );
            const amountOut = amountMaths[wantRoleName].make(outputExtent);
            const wantedAmount = offerRules.want[wantRoleName];
            const satisfiesWantedAmounts = () =>
              amountMaths[wantRoleName].isGTE(amountOut, wantedAmount);
            if (!satisfiesWantedAmounts()) {
              throw rejectOffer(inviteHandle);
            }

            const newUserAmounts = {
              Liquidity: amountMaths.Liquidity.getEmpty(),
            };
            newUserAmounts[offerRoleName] = amountMaths[
              offerRoleName
            ].getEmpty();
            newUserAmounts[wantRoleName] = amountOut;

            const newPoolAmounts = { Liquidity: poolAmounts.Liquidity };
            newPoolAmounts[offerRoleName] = amountMaths[offerRoleName].make(
              newInputReserve,
            );
            newPoolAmounts[wantRoleName] = amountMaths[wantRoleName].make(
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
              offer: ['TokenA', 'TokenB'],
              want: ['Liquidity'],
            });
            rejectIfNotOfferRules(inviteHandle, expected);

            const userAmounts = zoe.getOffer(inviteHandle).amounts;
            const poolAmounts = getPoolAmounts();

            // Calculate how many liquidity tokens we should be minting.
            // Calculations are based on the extents represented by index 0.
            // If the current supply is zero, start off by just taking the
            // extent at index 0 and using it as the extent for the
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
            const offerRules = harden({
              offer: { Liquidity: liquidityAmountOut },
            });
            const { inviteHandle: tempLiqHandle, invite } = zoe.makeInvite();
            const zoeService = zoe.getZoeService();
            return zoeService
              .redeem(
                invite,
                offerRules,
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
              offer: ['Liquidity'],
            });
            rejectIfNotOfferRules(inviteHandle, expected);

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
           * assets to be sent in, keyed by roleName
           */
          getPrice: amountInObj => {
            const [inRoleName] = Object.getOwnPropertyNames(amountInObj);
            assert(
              roleNames.includes(inRoleName),
              details`roleName ${inRoleName} was not valid`,
            );
            const inputExtent = amountMaths[inRoleName].getExtent(
              amountInObj[inRoleName],
            );
            const poolAmounts = getPoolAmounts();
            const inputReserve = poolAmounts[inRoleName].extent;
            const outRoleName = inRoleName === 'TokenA' ? 'TokenB' : 'TokenA';
            const outputReserve = poolAmounts[outRoleName].extent;
            const { outputExtent } = getPrice(
              harden({
                inputExtent,
                inputReserve,
                outputReserve,
              }),
            );
            return amountMaths[outRoleName].make(outputExtent);
          },
          getLiquidityIssuer: () => liquidityIssuer,
          getPoolAmounts,
          makeInvite,
        },
      });
    });
  });
});
