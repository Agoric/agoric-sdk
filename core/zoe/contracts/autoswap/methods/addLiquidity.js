import harden from '@agoric/harden';

import {
  makeHasOkRules,
  makeAPIMethod,
  basicFungibleTokenOperations as operations,
  vectorWith,
} from '../../../contractUtils';

const { divide, multiply } = operations;

const isValidOfferAddingLiquidity = makeHasOkRules([
  ['offerExactly', 'offerExactly', 'wantAtLeast'],
]);

const makeHandleOfferF = (
  zoeInstance,
  liquidityMint,
  poolOfferId,
) => async offerId => {
  const [oldPoolExtents, playerExtents] = zoeInstance.getExtentsFor(
    harden([poolOfferId, offerId]),
  );
  const extentOpsArray = zoeInstance.getExtentOpsArray();
  const liqTokenSupply = liquidityMint.getTotalSupply().extent;

  // Calculate how many liquidity tokens we should be minting.
  // Calculations are based on the extents represented by index 0.
  // If the current supply is zero, start off by just taking the
  // extent at index 0 and using it as the extent for the
  // liquidity token.
  const liquidityQOut =
    liqTokenSupply > 0
      ? divide(multiply(playerExtents[0], liqTokenSupply), oldPoolExtents[0])
      : playerExtents[0];

  // Calculate the new pool extents by adding together the old
  // extents plus the liquidity that was just added
  const newPoolExtents = vectorWith(
    extentOpsArray,
    oldPoolExtents,
    playerExtents,
  );

  // Set the liquidity token extent in the array of extents that
  // will be turned into payments sent back to the user.
  const newPlayerExtents = zoeInstance.makeEmptyExtents();
  newPlayerExtents[2] = liquidityQOut;

  // Now we need to mint the liquidity tokens and make sure that the
  // `zoeInstance` knows about them. We will need to create an offer
  // that escrows the liquidity tokens, and then drop the result.
  const newPurse = liquidityMint.mint(liquidityQOut);
  const newPayment = newPurse.withdrawAll();

  const rules = ['wantAtLeast', 'wantAtLeast', 'offerExactly'];
  const extents = [
    extentOpsArray[0].empty(),
    extentOpsArray[1].empty(),
    liquidityQOut,
  ];
  const liquidityOfferDesc = zoeInstance.makeOfferDesc(rules, extents);

  const liquidityOfferId = await zoeInstance.escrowOffer(
    liquidityOfferDesc,
    harden([undefined, undefined, newPayment]),
  );
  // Reallocate, giving the liquidity tokens to the user, adding the
  // user's liquidity to the pool, and setting the liquidity offer
  // extents to empty.

  zoeInstance.reallocate(
    harden([offerId, poolOfferId, liquidityOfferId]),
    harden([newPlayerExtents, newPoolExtents, zoeInstance.makeEmptyExtents()]),
  );
  // The newly created liquidityOffer is temporary and is dropped
  zoeInstance.complete(harden([liquidityOfferId]));

  return harden({
    offerIds: harden([offerId, poolOfferId]),
    newExtents: harden([newPlayerExtents, newPoolExtents]),
  });
};

const makeAddLiquidityMethod = (zoeInstance, liquidityMint, poolOfferId) =>
  makeAPIMethod({
    zoeInstance,
    isValidOfferFn: isValidOfferAddingLiquidity,
    successMessage: 'Added liquidity.',
    rejectMessage: 'The offer to add liquidity was invalid.',
    handleOfferFn: makeHandleOfferF(zoeInstance, liquidityMint, poolOfferId),
  });

harden(makeAddLiquidityMethod);

export { makeAddLiquidityMethod };
