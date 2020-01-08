/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { makeMint } from '@agoric/ertp/core/mint';
import { natSafeMath } from './helpers/safeMath';
import { makeHelpers } from './helpers/userFlow';

import { makeGetPrice } from './helpers/bondingCurves';

export const makeContract = harden((zoe, terms) => {
  // The user passes in an array of two assays for the two kinds of
  // assets to be swapped.
  const startingAssays = terms.assays;

  // There is also a third assay, the assay for the liquidity token,
  // which is created in this contract. We will return all three as
  // the canonical array of assays for this contract
  const liquidityMint = makeMint('liquidity');
  const liquidityAssay = liquidityMint.getAssay();
  const assays = [...startingAssays, liquidityAssay];

  const LIQ_INDEX = 2;
  let poolHandle;
  let liqTokenSupply = 0;

  const { subtract, multiply, floorDivide } = natSafeMath;

  return zoe.addAssays(assays).then(() => {
    const unitOpsArray = zoe.getUnitOpsForAssays(assays);
    const {
      rejectOffer,
      hasValidPayoutRules,
      vectorWith,
      vectorWithout,
      makeEmptyOffer,
    } = makeHelpers(zoe, assays);
    const getPrice = makeGetPrice(zoe, assays);
    const getPoolUnits = () => zoe.getOffer(poolHandle).units;

    return makeEmptyOffer().then(handle => {
      poolHandle = handle;

      const makeInvite = () => {
        const seat = harden({
          swap: () => {
            let UNITS_IN_INDEX;
            const unitsInFirst = ['offerAtMost', 'wantAtLeast', 'wantAtLeast'];
            const unitsInSecond = ['wantAtLeast', 'offerAtMost', 'wantAtLeast'];
            if (hasValidPayoutRules(unitsInFirst, inviteHandle)) {
              UNITS_IN_INDEX = 0;
            } else if (hasValidPayoutRules(unitsInSecond, inviteHandle)) {
              UNITS_IN_INDEX = 1;
            } else {
              throw rejectOffer(inviteHandle);
            }
            const UNITS_OUT_INDEX = Nat(1 - UNITS_IN_INDEX);
            const { newPoolUnitsArray, unitsOut } = getPrice(
              getPoolUnits(),
              zoe.getOffer(inviteHandle).units[UNITS_IN_INDEX],
            );

            const wantedUnits = zoe.getOffer(inviteHandle).units[
              UNITS_OUT_INDEX
            ];
            const satisfiesWantedUnits = () =>
              unitOpsArray[UNITS_OUT_INDEX].includes(unitsOut, wantedUnits);
            if (!satisfiesWantedUnits()) {
              throw rejectOffer(inviteHandle);
            }

            const newUserUnits = unitOpsArray.map(unitOps => unitOps.empty());
            newUserUnits[UNITS_OUT_INDEX] = unitsOut;

            zoe.reallocate(
              harden([inviteHandle, poolHandle]),
              harden([newUserUnits, newPoolUnitsArray]),
            );
            zoe.complete(harden([inviteHandle]));
            return `Swap successfully completed.`;
          },
          addLiquidity: () => {
            const kinds = ['offerAtMost', 'offerAtMost', 'wantAtLeast'];
            if (!hasValidPayoutRules(kinds, inviteHandle)) {
              throw rejectOffer(inviteHandle);
            }

            const userUnits = zoe.getOffer(inviteHandle).units;
            const poolUnits = getPoolUnits();

            // Calculate how many liquidity tokens we should be minting.
            // Calculations are based on the extents represented by index 0.
            // If the current supply is zero, start off by just taking the
            // extent at index 0 and using it as the extent for the
            // liquidity token.
            const liquidityExtentOut =
              liqTokenSupply > 0
                ? floorDivide(
                    multiply(userUnits[0].extent, liqTokenSupply),
                    poolUnits[0].extent,
                  )
                : userUnits[0].extent;

            const liquidityUnitsOut = unitOpsArray[LIQ_INDEX].make(
              liquidityExtentOut,
            );

            const liquidityPaymentP = liquidityMint
              .mint(liquidityUnitsOut)
              .withdrawAll();
            const offerRules = harden({
              payoutRules: [
                { kind: 'wantAtLeast', units: unitOpsArray[0].empty() },
                { kind: 'wantAtLeast', units: unitOpsArray[1].empty() },
                { kind: 'offerAtMost', units: liquidityUnitsOut },
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
                const newPoolUnits = vectorWith(poolUnits, userUnits);
                const newUserUnits = unitOpsArray.map(unitOps =>
                  unitOps.empty(),
                );
                const newTempLiqUnits = unitOpsArray.map(unitOps =>
                  unitOps.empty(),
                );
                newUserUnits[LIQ_INDEX] = liquidityUnitsOut;

                zoe.reallocate(
                  harden([inviteHandle, poolHandle, tempLiqHandle]),
                  harden([newUserUnits, newPoolUnits, newTempLiqUnits]),
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
            const userUnits = zoe.getOffer(inviteHandle).units;
            const liquidityUnitsIn = userUnits[LIQ_INDEX];

            const poolUnits = getPoolUnits();

            const newUserUnits = poolUnits.map((units, i) =>
              unitOpsArray[i].make(
                floorDivide(
                  multiply(liquidityUnitsIn.extent, units.extent),
                  liqTokenSupply,
                ),
              ),
            );

            const newPoolUnits = vectorWith(
              vectorWithout(poolUnits, newUserUnits),
              [
                unitOpsArray[0].empty(),
                unitOpsArray[1].empty(),
                liquidityUnitsIn,
              ],
            );
            liqTokenSupply = subtract(liqTokenSupply, liquidityUnitsIn.extent);

            zoe.reallocate(
              harden([inviteHandle, poolHandle]),
              harden([newUserUnits, newPoolUnits]),
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
           * `getPrice` calculates the result of a trade, given a certain units
           * of digital assets in.
           * @param {units} unitsIn - the units of digital assets to be sent in
           */
          getPrice: unitsIn => getPrice(getPoolUnits(), unitsIn).unitsOut,
          getLiquidityAssay: () => liquidityAssay,
          getPoolUnits,
          makeInvite,
        },
        terms: { assays },
      });
    });
  });
});
