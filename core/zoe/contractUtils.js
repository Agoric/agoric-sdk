import harden from '@agoric/harden';

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

const assetDescsToExtentsArray = (extentOps, assetDescs) =>
  assetDescs.map((assetDesc, i) =>
    assetDesc === undefined ? extentOps[i].empty() : assetDesc.extent,
  );

export {
  transpose,
  mapArrayOnMatrix,
  offerEqual,
  makeEmptyExtents,
  makeAssetDesc,
  makePayoutRules,
  toAssetDescMatrix,
  assetDescsToExtentsArray,
};
