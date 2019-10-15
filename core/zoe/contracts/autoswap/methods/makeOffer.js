import harden from '@agoric/harden';

import { makeHasOkRules, makeAPIMethod } from '../../../contractUtils';
import {
  calculateSwapMath,
  calculateSwap,
  getTokenIndices,
} from '../calculateSwap';

/**
 * To create the method `makeOffer`, we will use the `makeAPIMethod`
 * helper from `contractUtils.js`. That means we need to define a
 * function to decide whether the offer is valid, a function to handle
 * the offer, and success and failure messages.
 */

const hasOkRules = makeHasOkRules([
  ['offerExactly', 'wantAtLeast', 'wantAtLeast'],
  ['wantAtLeast', 'offerExactly', 'wantAtLeast'],
]);

// Make sure that the assetDesc that would be returned if we performed
// the swap is greater than or equal to the 'wantAtLeast' assetDesc
const fulfillsWantAtLeast = (poolExtents, newOffer) => {
  const tokenInIndex = newOffer[0].rule === 'offerExactly' ? 0 : 1;
  const tokenOutIndex = 1 - tokenInIndex;

  const tokenInQ = newOffer[tokenInIndex].assetDesc.extent;
  const wantAtLeastQ = newOffer[tokenOutIndex].assetDesc.extent;

  const { tokenOutQ } = calculateSwapMath(
    poolExtents[tokenInIndex],
    poolExtents[tokenOutIndex],
    tokenInQ,
  );
  return tokenOutQ >= wantAtLeastQ;
};

/**
 * reallocate(extents) takes a matrix representing the current pool
 * and player extents and returns a matrix representing the
 * respective resulting extents.
 */
const reallocate = extents => {
  const poolExtents = extents[0];
  const playerExtents = extents[1];

  const { tokenInIndex, tokenOutIndex } = getTokenIndices(playerExtents);

  const { tokenOutQ, newTokenInPoolQ, newTokenOutPoolQ } = calculateSwap(
    poolExtents,
    playerExtents,
  );

  const newPoolExtents = [];
  newPoolExtents[tokenInIndex] = newTokenInPoolQ;
  newPoolExtents[tokenOutIndex] = newTokenOutPoolQ;
  newPoolExtents[2] = 0;

  const newPlayerExtents = [];
  newPlayerExtents[tokenInIndex] = 0;
  newPlayerExtents[tokenOutIndex] = tokenOutQ;
  newPlayerExtents[2] = 0;

  return harden([newPoolExtents, newPlayerExtents]);
};

const makeHandleOfferF = (zoeInstance, poolOfferId) => id => {
  const offerIds = harden([poolOfferId, id]);
  // reallocate and eject immediately
  const oldExtents = zoeInstance.getExtentsFor(offerIds);
  const newExtents = reallocate(oldExtents);
  return harden({
    offerIds,
    newExtents,
  });
};

const makeIsValidOffer = (zoeInstance, poolOfferId) => newOffer => {
  const poolExtents = zoeInstance.getExtentsFor(harden([poolOfferId]))[0];
  return hasOkRules(newOffer) && fulfillsWantAtLeast(poolExtents, newOffer);
};

const makeMakeOfferMethod = (zoeInstance, poolOfferId) =>
  makeAPIMethod({
    zoeInstance,
    isValidOfferFn: makeIsValidOffer(zoeInstance, poolOfferId),
    successMessage: 'Swap successfully completed.',
    rejectMessage: 'The offer to swap was invalid.',
    handleOfferFn: makeHandleOfferF(zoeInstance, poolOfferId),
  });

harden(makeMakeOfferMethod);

export { makeMakeOfferMethod };
