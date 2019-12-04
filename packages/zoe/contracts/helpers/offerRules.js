import harden from '@agoric/harden';
import { sameStructure } from '@agoric/ertp/util/sameStructure';

export const isExactlyMatchingPayoutRules = (
  zoe,
  leftPayoutRules,
  rightPayoutRules,
) => {
  // "exactly matching" means that units are the same, but that the
  // kinds have switched places in the array
  const extentOpsArray = zoe.getExtentOpsArray();
  const exactlyKinds = ['wantExactly', 'offerExactly'];
  return (
    // Are the extents equal according to the extentOps?
    extentOpsArray[0].equals(
      leftPayoutRules[0].units.extent,
      rightPayoutRules[0].units.extent,
    ) &&
    extentOpsArray[1].equals(
      leftPayoutRules[1].units.extent,
      rightPayoutRules[1].units.extent,
    ) &&
    // Are the labels (allegedName + assay) the same?
    sameStructure(
      leftPayoutRules[0].units.label,
      rightPayoutRules[0].units.label,
    ) &&
    sameStructure(
      leftPayoutRules[1].units.label,
      rightPayoutRules[1].units.label,
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
      units: firstPayoutRules[0].units,
    },
    {
      kind: firstPayoutRules[0].kind,
      units: firstPayoutRules[1].units,
    },
  ]);

const hasKinds = (kinds, newPayoutRules) =>
  kinds.every((kind, i) => kind === newPayoutRules[i].kind);

const hasAssays = (assays, newPayoutRules) =>
  assays.every((assay, i) => assay === newPayoutRules[i].units.label.assay);

export const hasValidPayoutRules = (kinds, assays, newPayoutRules) =>
  hasKinds(kinds, newPayoutRules) && hasAssays(assays, newPayoutRules);

export const getActivePayoutRules = (zoe, offerHandles) => {
  const { active } = zoe.getStatusFor(offerHandles);
  return harden({
    offerHandles: active,
    payoutRulesArray: zoe.getPayoutRulesFor(active),
  });
};

/**
 * Make a units without access to the assay, which we don't want
 * to use because it may be remote.
 * @param {object} extentOps - the extent ops for the assay
 * @param {object} label - the label for the assay to use in the units
 * @param {*} allegedExtent - the extent to use in the units
 */
export const makeUnits = (extentOps, label, allegedExtent) => {
  extentOps.insistKind(allegedExtent);
  return harden({
    label,
    extent: allegedExtent,
  });
};

/**
 * A helper to make offerRules without having to write out the rules
 * manually, and without using an assay (which we don't want to use
 * because it may be remote).
 * @param {object} zoe - the contract facet of Zoe
 * @param  {array} kinds - an array of payoutRule kinds, in the order
 * of the intended payoutRules
 * @param  {array} extents - an array of extents, in the order of the
 * intended payoutRules
 * @param  {object} exitRule - an exitRule
 */
export const makeOfferRules = (zoe, kinds, extents, exitRule) => {
  const extentOpsArray = zoe.getExtentOpsArray();
  const labels = zoe.getLabels();
  const payoutRules = extentOpsArray.map((extentOps, i) =>
    harden({
      kind: kinds[i],
      units: makeUnits(extentOps, labels[i], extents[i]),
    }),
  );
  return harden({
    payoutRules,
    exitRule,
  });
};
