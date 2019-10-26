import harden from '@agoric/harden';
import Nat from '@agoric/nat';

// These utilities are likely to be helpful to developers writing
// smart contracts on Zoe.

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

const ruleEqual = (leftRule, rightRule) => leftRule.kind === rightRule.kind;

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
  validRules.every((rule, i) => rule === offer[i].kind, true);

// Vector addition of two extent arrays
const vectorWith = (extentOpsArray, leftExtents, rightExtents) =>
  leftExtents.map((leftQ, i) => extentOpsArray[i].with(leftQ, rightExtents[i]));

// Vector subtraction of two extent arrays
const vectorWithout = (extentOpsArray, leftExtents, rightExtents) =>
  leftExtents.map((leftQ, i) =>
    extentOpsArray[i].without(leftQ, rightExtents[i]),
  );

const makeAssetDesc = (extentOps, label, allegedExtent) => {
  extentOps.insistKind(allegedExtent);
  return harden({
    label,
    extent: allegedExtent,
  });
};

// Transform a extentsMatrix to a matrix of assetDescs given an array
// of the associated assetDescOps.
const toAssetDescMatrix = (extentOps, labels, extentsMatrix) =>
  extentsMatrix.map(extents =>
    extents.map((extent, i) => makeAssetDesc(extentOps[i], labels[i], extent)),
  );

const makePayoutRules = (extentOpsArray, labels, kinds, extents) =>
  extentOpsArray.map((extentOps, i) =>
    harden({
      kind: kinds[i],
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
  basicFungibleTokenOperations,
  makeAssetDesc,
  makePayoutRules,
  toAssetDescMatrix,
  assetDescsToExtentsArray,
};
