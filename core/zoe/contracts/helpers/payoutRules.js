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
  const exactlyKinds = ['wantExactly', 'offerExactly'];
  return (
    // Are the extents equal according to the extentOps?
    extentOpsArray[0].equals(
      leftPayoutRules[0].assetDesc.extent,
      rightPayoutRules[0].assetDesc.extent,
    ) &&
    extentOpsArray[1].equals(
      leftPayoutRules[1].assetDesc.extent,
      rightPayoutRules[1].assetDesc.extent,
    ) &&
    // Are the labels (allegedName + assay) the same?
    sameStructure(
      leftPayoutRules[0].assetDesc.label,
      rightPayoutRules[0].assetDesc.label,
    ) &&
    sameStructure(
      leftPayoutRules[1].assetDesc.label,
      rightPayoutRules[1].assetDesc.label,
    ) &&
    // Are the kinds "exactly" kinds?
    exactlyKinds.includes(leftPayoutRules[0].kind) &&
    exactlyKinds.includes(leftPayoutRules[1].kind) &&
    exactlyKinds.includes(rightPayoutRules[0].kind) &&
    exactlyKinds.includes(rightPayoutRules[1].kind) &&
    // Have the rule kinds switched as we expect?
    leftPayoutRules[0].kind === rightPayoutRules[1].kind &&
    leftPayoutRules[1].kind === rightPayoutRules[0].kind
  );
};

// We can make exactly matching payout rules by switching the kind
export const makeExactlyMatchingPayoutRules = firstPayoutRules =>
  harden([
    {
      kind: firstPayoutRules[1].kind,
      assetDesc: firstPayoutRules[0].assetDesc,
    },
    {
      kind: firstPayoutRules[0].kind,
      assetDesc: firstPayoutRules[1].assetDesc,
    },
  ]);

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
    payoutRulesArray: zoe.getPayoutRulesFor(active),
  });
};
