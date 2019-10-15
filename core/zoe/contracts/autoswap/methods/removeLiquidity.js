import harden from '@agoric/harden';

import {
  makeHasOkRules,
  makeAPIMethod,
  basicFungibleTokenOperations as operations,
  vectorWithout,
} from '../../../contractUtils';

const { multiply, divide } = operations;

const makeHandleOffer = (
  zoeInstance,
  liquidityMint,
  poolOfferId,
) => offerId => {
  const offerIds = harden([poolOfferId, offerId]);
  const [poolExtents, playerExtents] = zoeInstance.getExtentsFor(offerIds);
  const liquidityTokenIn = playerExtents[2];
  const liqTokenSupply = liquidityMint.getTotalSupply().extent;

  const newPlayerExtents = poolExtents.map(poolQ =>
    divide(multiply(liquidityTokenIn, poolQ), liqTokenSupply),
  );

  const newPoolExtents = vectorWithout(
    zoeInstance.getExtentOps(),
    poolExtents,
    newPlayerExtents,
  );

  const burnExtents = zoeInstance.makeEmptyExtents();
  burnExtents[2] = liquidityTokenIn;

  return harden({
    offerIds,
    newExtents: [newPoolExtents, newPlayerExtents],
    burnExtents,
  });
};

const isValidOfferRemoveLiquidity = makeHasOkRules([
  ['wantAtLeast', 'wantAtLeast', 'offerExactly'],
]);

const makeRemoveLiquidityMethod = (zoeInstance, liquidityMint, poolOfferId) =>
  makeAPIMethod({
    zoeInstance,
    isValidOfferFn: isValidOfferRemoveLiquidity,
    successMessage: 'Liquidity successfully removed.',
    rejectMessage: 'The offer to remove liquidity was invalid',
    handleOfferFn: makeHandleOffer(zoeInstance, liquidityMint, poolOfferId),
  });

harden(makeRemoveLiquidityMethod);

export { makeRemoveLiquidityMethod };
