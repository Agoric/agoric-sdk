import harden from '@agoric/harden';
import { sameStructure } from '../../../../util/sameStructure';

export const isExactlyMatchingOfferDesc = (
  zoe,
  leftOfferDesc,
  rightOfferDesc,
) => {
  // "exactly matching" means that assetDescs are the same, but that the
  // rules have switched places in the array
  const extentOpsArray = zoe.getExtentOpsArray();
  const exactlyRules = ['wantExactly', 'offerExactly'];
  return (
    extentOpsArray[0].equals(
      leftOfferDesc[0].assetDesc.extent,
      rightOfferDesc[0].assetDesc.extent,
    ) &&
    extentOpsArray[1].equals(
      leftOfferDesc[1].assetDesc.extent,
      rightOfferDesc[1].assetDesc.extent,
    ) &&
    sameStructure(
      leftOfferDesc[0].assetDesc.label,
      rightOfferDesc[0].assetDesc.label,
    ) &&
    sameStructure(
      leftOfferDesc[1].assetDesc.label,
      rightOfferDesc[1].assetDesc.label,
    ) &&
    leftOfferDesc[0].rule === rightOfferDesc[1].rule &&
    leftOfferDesc[1].rule === rightOfferDesc[0].rule &&
    exactlyRules.includes(leftOfferDesc[0].rule) &&
    exactlyRules.includes(leftOfferDesc[1].rule) &&
    exactlyRules.includes(rightOfferDesc[0].rule) &&
    exactlyRules.includes(rightOfferDesc[1].rule)
  );
};

const hasRules = (rules, newOfferDesc) =>
  rules.every((rule, i) => rule === newOfferDesc[i].rule);

const hasAssays = (assays, newOfferDesc) =>
  assays.every((assay, i) => assay === newOfferDesc[i].assetDesc.label.assay);

export const hasRulesAndAssays = (rules, assays, newOfferDesc) =>
  hasRules(rules, newOfferDesc) && hasAssays(assays, newOfferDesc);

export const getActiveOfferDescs = (zoe, offerHandles) => {
  const { active } = zoe.getStatusFor(offerHandles);
  return harden({
    offerHandles: active,
    offerDescs: zoe.getOfferDescsFor(active),
  });
};
