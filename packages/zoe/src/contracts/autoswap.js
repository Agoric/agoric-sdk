/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import produceIssuer from '@agoric/ertp';
import { assert, details } from '@agoric/assert';

import { natSafeMath } from './helpers/safeMath';
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
    const { issuers, roleNames } = zoe.getInstanceRecord();
    const amountMathArray = zoe.getAmountMathForIssuers(issuers);
    amountMathArray.forEach(amountMath =>
      assert(
        amountMath.getMathHelpersName() === 'nat',
        details`issuers must have natMathHelpers`,
      ),
    );
    const {
      rejectOffer,
      vectorWith,
      vectorWithout,
      makeEmptyOffer,
      rejectIfNotOfferRules,
    } = makeZoeHelpers(zoe);
    const {
      getPrice,
      calcLiqExtentToMint,
      calcAmountsToRemove,
    } = makeConstProductBC(zoe, issuers);

    const arrayToObj = (arr, roleNamesArray) => {
      const obj = {};
      roleNamesArray.forEach((roleName, i) => (obj[roleName] = arr[i]));
      return obj;
    };

    const objToArray = (obj, roleNamesArray) =>
      roleNamesArray.map(roleName => obj[roleName]);

    const getPoolAmounts = () =>
      arrayToObj(zoe.getOffer(poolHandle).amounts, roleNames);
    const amountMaths = arrayToObj(amountMathArray, roleNames);

    return makeEmptyOffer().then(handle => {
      poolHandle = handle;

      const makeInvite = () => {
        const seat = harden({
          swap: () => {
            const { userOfferRules } = zoe.getOffer(inviteHandle);
            const [offerRoleName] = Object.getOwnPropertyNames(
              userOfferRules.offer,
            );
            let wantRoleName;
            if (offerRoleName === 'TokenA') {
              const expected = harden({ offer: ['TokenA'], want: ['TokenB'] });
              rejectIfNotOfferRules(inviteHandle, expected);
              wantRoleName = 'TokenB';
            } else {
              const expected = harden({ offer: ['TokenB'], want: ['TokenA'] });
              rejectIfNotOfferRules(inviteHandle, expected);
              wantRoleName = 'TokenA';
            }
            const poolAmounts = getPoolAmounts();
            const {
              outputExtent,
              newInputReserve,
              newOutputReserve,
            } = getPrice(
              harden({
                inputExtent: userOfferRules.offer[offerRoleName].extent,
                inputReserve: poolAmounts[offerRoleName].extent,
                outputReserve: poolAmounts[wantRoleName].extent,
              }),
            );
            const amountOut = amountMaths[wantRoleName].make(outputExtent);
            const wantedAmounts = userOfferRules.wanted[wantRoleName];
            const satisfiesWantedAmounts = () =>
              amountMaths[wantRoleName].isGTE(amountOut, wantedAmounts);
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
            const newUserAmountsArray = objToArray(newUserAmounts, roleNames);

            const newPoolAmounts = { Liquidity: poolAmounts.Liquidity };
            newPoolAmounts[offerRoleName] = amountMaths[offerRoleName].make(
              newInputReserve,
            );
            newPoolAmounts[wantRoleName] = amountMaths[wantRoleName].make(
              newOutputReserve,
            );
            const newPoolAmountsArray = objToArray(newPoolAmounts, roleNames);

            zoe.reallocate(
              harden([inviteHandle, poolHandle]),
              harden([newUserAmountsArray, newPoolAmountsArray]),
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
              liqTokenSupply,
              poolAmounts,
              userAmounts,
            );

            const LIQ_INDEX = 0;

            const liquidityAmountsOut = amountMathArray[LIQ_INDEX].make(
              liquidityExtentOut,
            );

            const liquidityPaymentP = liquidityMint.mintPayment(
              liquidityAmountsOut,
            );
            const offerRules = harden({
              payoutRules: [
                { kind: 'offerAtMost', amount: liquidityAmountsOut },
              ],
              exitRule: {
                kind: 'waived',
              },
            });
            const { inviteHandle: tempLiqHandle, invite } = zoe.makeInvite();
            const zoeService = zoe.getZoeService();
            return zoeService
              .redeem(
                invite,
                offerRules,
                harden([undefined, undefined, liquidityPaymentP]),
              )
              .then(() => {
                liqTokenSupply += liquidityExtentOut;
                const newPoolAmounts = vectorWith(poolAmounts, userAmounts);
                const newUserAmounts = amountMathArray.map(amountMath =>
                  amountMath.getEmpty(),
                );
                const newTempLiqAmounts = amountMathArray.map(amountMath =>
                  amountMath.getEmpty(),
                );
                newUserAmounts[LIQ_INDEX] = liquidityAmountsOut;

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

            const LIQ_INDEX = 0;

            const userAmounts = zoe.getOffer(inviteHandle).amounts;
            const liquidityAmountsIn = userAmounts[LIQ_INDEX];

            const poolAmounts = getPoolAmounts();

            const newUserAmounts = calcAmountsToRemove(
              liqTokenSupply,
              poolAmounts,
              liquidityAmountsIn,
            );

            const newPoolAmounts = vectorWith(
              vectorWithout(poolAmounts, newUserAmounts),
              [
                amountMathArray[0].getEmpty(),
                amountMathArray[1].getEmpty(),
                liquidityAmountsIn,
              ],
            );
            liqTokenSupply -= liquidityAmountsIn.extent;

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
           * @param {amount} amountIn - the amount of digital assets to be sent in
           */
          getPrice: amountIn => getPrice(getPoolAmounts(), amountIn).amountOut,
          getLiquidityIssuer: () => liquidityIssuer,
          getPoolAmounts,
          makeInvite,
        },
      });
    });
  });
});
