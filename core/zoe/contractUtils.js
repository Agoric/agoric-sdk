import harden from '@agoric/harden';
import Nat from '@agoric/nat';

import makePromise from '../../util/makePromise';

// These utilities are likely to be helpful to developers writing
// governing contracts.

// https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript/41772644#41772644
const transpose = matrix =>
  matrix.reduce(
    (acc, row) => row.map((_, i) => [...(acc[i] || []), row[i]]),
    [],
  );

/**
 * @param  {[][]} matrix - array of arrays
 * @param  {function[]} arrayFn - the array of functions to apply
 */
const mapArrayOnMatrix = (matrix, arrayFn) => {
  return matrix.map(row => row.map((x, i) => arrayFn[i](x, i)));
};

const ruleEqual = (leftRule, rightRule) => leftRule.rule === rightRule.rule;

const extentEqual = (extentOps, leftRule, rightRule) =>
  extentOps.equals(leftRule.assetDesc.extent, rightRule.assetDesc.extent);

const assayEqual = (leftRule, rightRule) =>
  leftRule.assetDesc.label.assay === rightRule.assetDesc.label.assay;

// Check that two offers are equal in both their rules and their assetDescs
const offerEqual = (extentOps, leftOffer, rightOffer) => {
  const isLengthEqual = leftOffer.length === rightOffer.length;
  if (!isLengthEqual) {
    return false;
  }
  return leftOffer.every(
    (leftRule, i) =>
      ruleEqual(leftRule, rightOffer[i]) &&
      assayEqual(leftRule, rightOffer[i]) &&
      extentEqual(extentOps[i], leftRule, rightOffer[i]),
    true,
  );
};

// an array of empty extents per extentOps
const makeEmptyExtents = extentOpsArray =>
  extentOpsArray.map(extentOps => extentOps.empty());

// validRules is the rule portion of a offer description in array
// form, such as ['offerExactly', 'wantExactly']
const makeHasOkRules = validRules => offer =>
  validRules.every((rule, i) => rule === offer[i].rule, true);

// Vector addition of two extent arrays
const vectorWith = (extentOps, leftExtents, rightExtents) =>
  leftExtents.map((leftQ, i) => extentOps[i].with(leftQ, rightExtents[i]));

// Vector subtraction of two extent arrays
const vectorWithout = (extentOps, leftExtents, rightExtents) =>
  leftExtents.map((leftQ, i) => extentOps[i].without(leftQ, rightExtents[i]));

/**
 * Make a function that implements a common invocation pattern for
 * contract developers:
 * 1) Take an `escrowReceipt` as input.
 * 2) Validate it
 * 3) Check that the offer gotten from the `escrowReceipt` is valid
 *    for this particular contract
 * 4) Fail-fast if the offer isn't valid
 * 5) Handle the valid offer
 * 6) Reallocate and eject the player.
 * @param  {object} zoe - the governing contract facet of zoe
 * @param  {function} isValidOfferFn - a predicate that takes in an offerDesc
 * and returns whether it is a valid offer or not
 * @param  {string} successMessage - the message that the promise should
 * resolve to if the offer is successful
 * @param  {string} rejectMessage - the message that the promise should
 * reject with if the offer is not valid
 * @param  {function} handleOfferFn - the function to do custom logic before
 * reallocating and ejecting the user. The function takes in the
 * `offerId` and should return an object with `offerIds` and
 * `newExtents` as properties
 * @param {object} instanceId - the id for the governing contract instance
 * @param  {} }
 */
const makeAPIMethod = ({
  zoe,
  isValidOfferFn,
  successMessage,
  rejectMessage,
  handleOfferFn,
  instanceId,
}) => async escrowReceipt => {
  const result = makePromise();
  const { id, offerMade: offerMadeDesc } = await zoe.burnEscrowReceipt(
    instanceId,
    escrowReceipt,
  );
  // fail-fast if the offerDesc isn't valid
  if (!isValidOfferFn(offerMadeDesc)) {
    zoe.complete(instanceId, harden([id]));
    result.rej(`${rejectMessage}`);
    return result.p;
  }
  const { offerIds, newExtents, burnExtents } = await handleOfferFn(id);
  if (burnExtents !== undefined) {
    await zoe.reallocateAndBurn(instanceId, offerIds, newExtents, burnExtents);
  } else {
    zoe.reallocate(instanceId, offerIds, newExtents);
  }
  zoe.complete(instanceId, harden([id]));
  result.res(`${successMessage}`);
  return result.p;
};

const makeAssetDesc = (extentOps, label, allegedExtent) => {
  extentOps.insistKind(allegedExtent);
  return harden({
    label,
    extent: allegedExtent,
  });
};

// Transform a extentsMatrix to a matrix of assetDescs given an array
// of the associated descOps.
const toAssetDescMatrix = (extentOps, labels, extentsMatrix) =>
  extentsMatrix.map(extents =>
    extents.map((extent, i) => makeAssetDesc(extentOps[i], labels[i], extent)),
  );

const makeOfferDesc = (extentOpsArray, labels, rules, extents) =>
  extentOpsArray.map((extentOps, i) =>
    harden({
      rule: rules[i],
      assetDesc: makeAssetDesc(extentOps, labels[i], extents[i]),
    }),
  );

/**
 * These operations should be used for calculations with the
 * extents of basic fungible tokens.
 */
const basicFungibleTokenOperations = harden({
  add: (x, y) => Nat(x + y),
  subtract: (x, y) => Nat(x - y),
  multiply: (x, y) => Nat(x * y),
  divide: (x, y) => Nat(Math.floor(x / y)),
});

// reproduced, got lost in merge, not sure if correct
const assetDescsToExtentsArray = (extentOps, assetDescs) =>
  assetDescs.map((assetDesc, i) =>
    assetDesc === undefined ? extentOps[i].empty() : assetDesc.extent,
  );

export {
  transpose,
  mapArrayOnMatrix,
  offerEqual,
  makeEmptyExtents,
  makeHasOkRules,
  vectorWith,
  vectorWithout,
  makeAPIMethod,
  basicFungibleTokenOperations,
  makeAssetDesc,
  makeOfferDesc,
  toAssetDescMatrix,
  assetDescsToExtentsArray,
};
