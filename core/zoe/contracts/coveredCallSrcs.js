import harden from '@agoric/harden';

const areAssaysValid = array => array.length === 2;

const isValidInitialOfferDesc = newOfferDesc => {
  const makeHasOkRules = validRules => offer =>
    validRules.every((rule, i) => rule === offer[i].rule, true);

  const hasOkLength = array => array.length === 2;
  const hasOkRules = offer =>
    makeHasOkRules(['offerExactly', 'wantExactly'])(offer) ||
    makeHasOkRules(['wantExactly', 'offerExactly'])(offer);
  return hasOkLength(newOfferDesc) && hasOkRules(newOfferDesc);
};

const makeWantedOfferDescs = firstOfferDesc => {
  const makeSecondOffer = firstOffer =>
    harden([
      {
        rule: firstOffer[1].rule,
        assetDesc: firstOffer[0].assetDesc,
      },
      {
        rule: firstOffer[0].rule,
        assetDesc: firstOffer[1].assetDesc,
      },
    ]);
  return harden([makeSecondOffer(firstOfferDesc)]);
};

const isValidOfferDesc = (extentOps, offerDescToBeMade, offerDescMade) => {
  const ruleEqual = (leftRule, rightRule) => leftRule.rule === rightRule.rule;

  const extentEqual = (extentOp, leftRule, rightRule) =>
    extentOp.equals(leftRule.assetDesc.extent, rightRule.assetDesc.extent);

  const assayEqual = (leftRule, rightRule) =>
    leftRule.assetDesc.label.assay === rightRule.assetDesc.label.assay;

  // Check that two offers are equal in both their rules and their assetDescs
  const offerEqual = (leftOffer, rightOffer) => {
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

  return offerEqual(offerDescToBeMade, offerDescMade);
};

const canReallocate = offerIds => offerIds.length === 2;

const reallocate = allocations => harden([allocations[1], allocations[0]]);

const coveredCallSrcs = harden({
  areAssaysValid: `${areAssaysValid}`,
  isValidInitialOfferDesc: `${isValidInitialOfferDesc}`,
  makeWantedOfferDescs: `${makeWantedOfferDescs}`,
  isValidOfferDesc: `${isValidOfferDesc}`,
  canReallocate: `${canReallocate}`,
  reallocate: `${reallocate}`,
});

export { coveredCallSrcs };
