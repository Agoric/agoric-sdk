/* eslint-disable no-use-before-define */
import harden from '@agoric/harden';
import { makeMint } from '@agoric/ertp/core/mint';
import { natSafeMath } from './helpers/safeMath';
import { makeHelpers } from './helpers/userFlow';

import { makeCalculateConstProduct } from './helpers/bondingCurves';

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
  const unitOpsArray = zoe.getUnitOpsForAssays(assays);
  const LIQ_INDEX = 2;

  const {
    rejectOffer,
    hasValidPayoutRules,
    vectorWith,
    vectorWithout,
  } = makeHelpers(zoe, assays);
  const calculateConstProduct = makeCalculateConstProduct(zoe, assays);

  let liqTokenSupply = 0;

  const { minus, multiply, divide } = natSafeMath;

  // autoswap needs to get the user-facing API of Zoe as well
  const zoeService = zoe.getZoeService();

  const { inviteHandle: poolHandle, invite } = zoe.makeInvite();

  const escrowLiquidity = liquidityUnitsOut => {
    const liquidityPaymentP = liquidityMint
      .mint(liquidityUnitsOut)
      .withdrawAll();
    const offerRules = {
      payoutRules: [
        { kind: 'wantAtLeast', units: unitOpsArray[0].empty() },
        { kind: 'wantAtLeast', units: unitOpsArray[1].empty() },
        { kind: 'offerAtMost', units: liquidityUnitsOut },
      ],
      exitRule: {
        kind: 'waived',
      },
    };
    const { inviteHandle, invite } = zoe.makeInvite();

    // redeem is asynchronous
    zoeService.redeem(
      invite,
      offerRules,
      harden([undefined, undefined, liquidityPaymentP]),
    );
    return inviteHandle;
  };

  const getPoolUnits = () => zoe.getOffer(poolHandle).units;

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
        const UNITS_OUT_INDEX = UNITS_IN_INDEX - 1;

        const { newPoolUnitsArray, unitsOut } = calculateConstProduct(
          getPoolUnits(),
          zoe.getOffer(inviteHandle).unit[UNITS_IN_INDEX],
        );

        const wantedUnits = zoe.getOffer(inviteHandle).unit[UNITS_OUT_INDEX];
        const satisfiesWantedUnits = () =>
          unitOpsArray[UNITS_IN_INDEX].includes(wantedUnits, unitsOut);
        if (!satisfiesWantedUnits) {
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
        const liquidityEOut =
          liqTokenSupply > 0
            ? divide(multiply(userUnits[0].units, liqTokenSupply), poolUnits[0])
            : userUnits[0].units;
        escrowLiquidity();
        liqTokenSupply += liquidityEOut;

        const newPoolUnits = vectorWith(poolUnits, userUnits);

        // Set the liquidity token extent in the array of extents that
        // will be turned into payments sent back to the user.
        const newUserUnits = unitOpsArray.map(unitOps => unitOps.empty());
        newUserUnits[LIQ_INDEX] = liquidityEOut;

        zoe.reallocate(
          harden([inviteHandle, poolHandle]),
          harden([newUserUnits, newPoolUnits]),
        );
        zoe.complete(harden([inviteHandle]));
        return 'Added liquidity.';
      },
      removeLiquidity: () => {
        const kinds = ['wantAtLeast', 'wantAtLeast', 'offerAtMost'];
        if (!hasValidPayoutRules(kinds, inviteHandle)) {
          throw rejectOffer(`The offer to remove liquidity was invalid`);
        }
        const userUnits = zoe.getOffer(inviteHandle).units;
        const liquidityUnitsIn = userUnits[LIQ_INDEX];

        const poolUnits = getPoolUnits();

        const newUserUnits = poolUnits.map(units =>
          divide(multiply(liquidityUnitsIn, units), liqTokenSupply),
        );

        const newPoolUnits = vectorWith(
          unitOpsArray,
          vectorWithout(unitOpsArray, poolUnits, newUserUnits),
          [unitOpsArray[0].empty(), unitOpsArray[1].empty(), liquidityUnitsIn],
        );
        liqTokenSupply = minus(liqTokenSupply, liquidityUnitsIn.extent);

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
      getPrice: unitsIn =>
        calculateConstProduct(getPoolUnits(), unitsIn).unitsOut,
      getLiquidityAssay: () => liquidityAssay,
      getPoolUnits,
    },
    terms,
  });
});
