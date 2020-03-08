/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import produceIssuer from '@agoric/ertp';
import { assert, details } from '@agoric/assert';

import { natSafeMath } from './helpers/safeMath';
import { makeZoeHelpers } from './helpers/zoeHelpers';
import { makeConstProductBC } from './helpers/bondingCurves';

export const makeContract = harden(zoe => {
  const { issuers: startingIssuers } = zoe.getInstanceRecord();

  // There is also a third issuer, the issuer for the liquidity token,
  // which is created in this contract.
  const { mint: liquidityMint, issuer: liquidityIssuer } = produceIssuer(
    'liquidity',
  );
  const issuers = [...startingIssuers, liquidityIssuer];

  let poolHandle;
  let liqTokenSupply = 0;

  const { subtract } = natSafeMath;

  return zoe.addNewIssuer(liquidityIssuer).then(() => {
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
    } = makeZoeHelpers(zoe);
    const {
      getPrice,
      calcLiqExtentToMint,
      calcAmountsToRemove,
    } = makeConstProductBC(zoe, issuers);
    const getPoolAmounts = () => zoe.getOffer(poolHandle).amounts;

    return makeEmptyOffer().then(handle => {
      poolHandle = handle;

      const makeInvite = () => {
        const seat = harden({
          swap: () => {
            let UNITS_IN_INDEX;
            const amountInFirst = ['offerAtMost', 'wantAtLeast', 'wantAtLeast'];
            const amountInSecond = [
              'wantAtLeast',
              'offerAtMost',
              'wantAtLeast',
            ];
            if (hasValidPayoutRules(amountInFirst, inviteHandle)) {
              UNITS_IN_INDEX = 0;
            } else if (hasValidPayoutRules(amountInSecond, inviteHandle)) {
              UNITS_IN_INDEX = 1;
            } else {
              throw rejectOffer(inviteHandle);
            }
            const UNITS_OUT_INDEX = Nat(1 - UNITS_IN_INDEX);
            const { newPoolAmountsArray, amountOut } = getPrice(
              getPoolAmounts(),
              zoe.getOffer(inviteHandle).amounts[UNITS_IN_INDEX],
            );

            const wantedAmounts = zoe.getOffer(inviteHandle).amounts[
              UNITS_OUT_INDEX
            ];
            const satisfiesWantedAmounts = () =>
              amountMathArray[UNITS_OUT_INDEX].isGTE(amountOut, wantedAmounts);
            if (!satisfiesWantedAmounts()) {
              throw rejectOffer(inviteHandle);
            }

            const newUserAmounts = amountMathArray.map(amountMath =>
              amountMath.getEmpty(),
            );
            newUserAmounts[UNITS_OUT_INDEX] = amountOut;

            zoe.reallocate(
              harden([inviteHandle, poolHandle]),
              harden([newUserAmounts, newPoolAmountsArray]),
            );
            zoe.complete(harden([inviteHandle]));
            return `Swap successfully completed.`;
          },
          addLiquidity: () => {
            const kinds = ['offerAtMost', 'offerAtMost', 'wantAtLeast'];
            if (!hasValidPayoutRules(kinds, inviteHandle)) {
              throw rejectOffer(inviteHandle);
            }

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
            const kinds = ['wantAtLeast', 'wantAtLeast', 'offerAtMost'];
            if (!hasValidPayoutRules(kinds, inviteHandle)) {
              throw rejectOffer(`The offer to remove liquidity was invalid`);
            }
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
            liqTokenSupply = subtract(
              liqTokenSupply,
              liquidityAmountsIn.extent,
            );

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
