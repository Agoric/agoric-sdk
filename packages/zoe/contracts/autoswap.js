import harden from '@agoric/harden';
import { makeMint } from '@agoric/ertp/core/mint';
import { natSafeMath } from './helpers/safeMath';
import { vectorWith, vectorWithout } from './helpers/extents';
import { makeHelpers } from './helpers/userFlow';

import { calculateConstProduct } from './helpers/bondingCurves';

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

  const { rejectOffer, hasValidPayoutRules } = makeHelpers(zoe, assays);

  let poolOfferHandle;
  let liqTokenSupply = 0;

  const { add, subtract, multiply, divide } = natSafeMath;

  // autoswap needs to get the user-facing API of Zoe as well
  const zoeService = zoe.getZoeService();

  zoeService.redeem(invite, offerRules, offerPayment);

  const escrowLiquidity = liquidityUnitsOut => {
    const unitOpsArray = zoe.getUnitOpsForAssays(assays);
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

  const addLiquidity = () => {

    if (
      !hasValidPayoutRules(['offerAtMost', 'offerAtMost', 'wantAtLeast'], inviteHandle)
    ) {
      throw rejectOffer(inviteHandle, 'The offer to add liquidity was invalid.');
    }

    // Calculate how many liquidity tokens we should be minting.
    // Calculations are based on the extents represented by index 0.
    // If the current supply is zero, start off by just taking the
    // extent at index 0 and using it as the extent for the
    // liquidity token.
    const liquidityEOut =
      liqTokenSupply > 0
        ? divide(multiply(playerExtents[0], liqTokenSupply), oldPoolExtents[0])
        : playerExtents[0];

    escrowLiquidity();
    
    liqTokenSupply += liquidityEOut;

    // Calculate the new pool extents by adding together the old
    // extents plus the liquidity that was just added
    const newPoolExtents = vectorWith(
      extentOpsArray,
      oldPoolExtents,
      playerExtents,
    );

    // Set the liquidity token extent in the array of extents that
    // will be turned into payments sent back to the user.
    const newPlayerExtents = zoe.makeEmptyExtents();
    newPlayerExtents[2] = liquidityEOut;

    // Now we need to mint the liquidity tokens and make sure that the
    // `zoe` knows about them. We will need to create an offer
    // that escrows the liquidity tokens, and then drop the result.
   
    // Reallocate, giving the liquidity tokens to the user, adding the
    // user's liquidity to the pool, and setting the liquidity offer
    // extents to empty.
    zoe.reallocate(
      harden([offerHandle, poolOfferHandle, liquidityOfferHandle]),
      harden([newPlayerExtents, newPoolExtents, zoe.makeEmptyExtents()]),
    );
    // The newly created liquidityOffer is temporary and is dropped
    zoe.complete(harden([liquidityOfferHandle, offerHandle]));
    return 'Added liquidity.';
  };

  const removeLiquidity = () => {
    if (!hasValidPayoutRules(['wantAtLeast', 'wantAtLeast', 'offerAtMost'], inviteHandle)) {
      throw rejectOffer(`The offer to remove liquidity was invalid`);
    }

    const poolUnits = zoe.getOffer(poolHandle).units;
    const userUnits = zoe.getOffer(inviteHandle).units;
    const liquidityUnitsIn = userUnits[2];

    const newUserUnits = poolUnits.map(units =>
      divide(multiply(liquidityUnitsIn, units), liqTokenSupply),
    );
    const newPoolUnits = vectorWith(
      unitOpsArray,
      vectorWithout(unitOpsArray, poolUnits, newPlayerUnits),
      [unitOpsArray[0].empty(), unitOpsArray[1].empty(), liquidityUnitsIn],
    );
    liqTokenSupply = minus(liqTokenSupply,liquidityTokenIn);

    zoe.reallocate(
      harden([inviteHandle, poolHandle]),
      harden([newUserUnits, newPoolUnits]),
    );
    zoe.complete(harden([inviteHandle]));
    return 'Liquidity successfully removed.';
  };

  const unitsToExtentsArray = (extentOps, unitsArray) =>
    unitsArray.map((units, i) =>
      units === undefined ? extentOps[i].empty() : units.extent,
    );

  const swap = () => {
    const successMessage = 'Swap successfully completed.';
    const rejectMessage = 'The offer to swap was invalid.';
    let unitsIn;
    let wantAtLeastUnitsOut;

    if (hasValidPayoutRules(['offerAtMost', 'wantAtLeast', 'wantAtLeast'], inviteHandle)) {
      [unitsIn, wantAtLeastUnitsOut] = zoe.getOffer(inviteHandle).units;
    } else if (hasValidPayoutRules(['wantAtLeast', 'offerAtMost', 'wantAtLeast'], inviteHandle)) {
      [wantAtLeastUnitsOut, unitsIn] = zoe.getOffer(inviteHandle).units;
    } else {
      return rejectOffer(zoe, offerHandle, rejectMessage);
    }

    const { newPoolUnits, unitsOut } = calculateConstProduct(
      assays,
      unitOpsArray,
      poolUnits,
      unitsIn,
    );
    if (!unitOpsArray.includes(wantAtLeastUnitsOut, unitsOut)) {
      throw rejectOffer(inviteHandle, rejectMessage);
    }
    zoe.reallocate(
      harden([inviteHandle, poolHandle]),
      harden([newUserUnits, newPoolUnits]),
    );
    zoe.complete(harden([inviteHandle]));
    return `${successMessage}`;
  };

  // The API exposed to the user
  const autoswap = harden({
    addLiquidity,
    removeLiquidity,
    swap,
  });
  return harden({
    invite: makeInvite(),
    publicAPI: {
      /**
       * `getPrice` calculates the result of a trade, given a certain units
       * of digital assets in.
       * @param {units} unitsIn - the units of digital assets to be sent in
       */
      getPrice: unitsIn => {
        const poolUnits = zoe.getOffer(poolOfferHandle).units;
        return calculateConstProduct(assays, unitOpsArray, poolUnits, unitsIn).unitsOut;
      },
      getLiquidityAssay: () => liquidityAssay,
      getPoolUnits: zoe.getOffer(poolOfferHandle).units,
    },
    terms,
  });
});
