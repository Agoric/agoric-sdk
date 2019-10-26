import harden from '@agoric/harden';
import { sameStructure } from '../../../../util/sameStructure';

export const isExactlyMatchingPayoutRules = (
  zoe,
  leftPayoutRules,
  rightPayoutRules,
) => {
  // "exactly matching" means that assetDescs are the same, but that the
  // kinds have switched places in the array
  const extentOpsArray = zoe.getExtentOpsArray();
  const exactlyRules = ['wantExactly', 'offerExactly'];
  return (
    extentOpsArray[0].equals(
      leftPayoutRules[0].assetDesc.extent,
      rightPayoutRules[0].assetDesc.extent,
    ) &&
    extentOpsArray[1].equals(
      leftPayoutRules[1].assetDesc.extent,
      rightPayoutRules[1].assetDesc.extent,
    ) &&
    sameStructure(
      leftPayoutRules[0].assetDesc.label,
      rightPayoutRules[0].assetDesc.label,
    ) &&
    sameStructure(
      leftPayoutRules[1].assetDesc.label,
      rightPayoutRules[1].assetDesc.label,
    ) &&
    leftPayoutRules[0].kind === rightPayoutRules[1].kind &&
    leftPayoutRules[1].kind === rightPayoutRules[0].kind &&
    exactlyRules.includes(leftPayoutRules[0].kind) &&
    exactlyRules.includes(leftPayoutRules[1].kind) &&
    exactlyRules.includes(rightPayoutRules[0].kind) &&
    exactlyRules.includes(rightPayoutRules[1].kind)
  );
};

const hasKinds = (kinds, newPayoutRules) =>
  kinds.every((kind, i) => kind === newPayoutRules[i].kind);

const hasAssays = (assays, newPayoutRules) =>
  assays.every((assay, i) => assay === newPayoutRules[i].assetDesc.label.assay);

export const hasValidPayoutRules = (kinds, assays, newPayoutRules) =>
  hasKinds(kinds, newPayoutRules) && hasAssays(assays, newPayoutRules);

export const getActivePayoutRules = (zoe, offerHandles) => {
  const { active } = zoe.getStatusFor(offerHandles);
  return harden({
    offerHandles: active,
    payoutRulesArray: zoe.getPayoutRulessFor(active),
  });
};
