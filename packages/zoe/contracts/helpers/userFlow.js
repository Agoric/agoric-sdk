import harden from '@agoric/harden';

export const defaultRejectMsg = `The offer was invalid. Please check your refund.`;
export const defaultAcceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your payout`;

const hasKinds = (kinds, newPayoutRules) =>
  kinds.every((kind, i) => kind === newPayoutRules[i].kind);

const hasAssays = (assays, newPayoutRules) =>
  assays.every((assay, i) => assay === newPayoutRules[i].units.label.assay);

export const makeHelpers = (zoe, assays) => {
  const unitOpsArray = zoe.getUnitOpsForAssays(assays);
  const helpers = harden({
    getActiveOffers: handles =>
      zoe.getOffers(zoe.getOfferStatuses(handles).active),
    rejectOffer: (inviteHandle, msg = defaultRejectMsg) => {
      zoe.complete(harden([inviteHandle]));
      throw new Error(msg);
    },
    areAssetsEqualAtIndex: (index, leftHandle, rightHandle) =>
      unitOpsArray[index].equals(
        zoe.getOffer(leftHandle).payoutRules[index].units,
        zoe.getOffer(rightHandle).payoutRules[index].units,
      ),
    canTradeWith: (leftInviteHandle, rightInviteHandle) => {
      const { payoutRules: leftPayoutRules } = zoe.getOffer(leftInviteHandle);
      const { payoutRules: rightPayoutRules } = zoe.getOffer(rightInviteHandle);
      const satisfied = (wants, offers) =>
        wants.every((want, i) => {
          if (want.kind === 'wantAtLeast') {
            return (
              offers[i].kind === 'offerAtMost' &&
              unitOpsArray[i].includes(offers[i].units, want.units)
            );
          }
          return true;
        });
      return (
        satisfied(leftPayoutRules, rightPayoutRules) &&
        satisfied(rightPayoutRules, leftPayoutRules)
      );
    },
    hasValidPayoutRules: (kinds, inviteHandle) => {
      const { payoutRules } = zoe.getOffer(inviteHandle);
      return hasKinds(kinds, payoutRules) && hasAssays(assays, payoutRules);
    },
    swap: (
      keepHandle,
      tryHandle,
      keepHandleInactiveMsg = 'prior offer is unavailable',
    ) => {
      if (!zoe.isOfferActive(keepHandle)) {
        throw helpers.rejectOffer(tryHandle, keepHandleInactiveMsg);
      }
      if (!helpers.canTradeWith(keepHandle, tryHandle)) {
        throw helpers.rejectOffer(tryHandle);
      }
      const keepUnits = zoe.getOffer(keepHandle).units;
      const tryUnits = zoe.getOffer(tryHandle).units;
      // reallocate by switching the units
      const handles = harden([keepHandle, tryHandle]);
      zoe.reallocate(handles, harden([tryUnits, keepUnits]));
      zoe.complete(handles);
      return defaultAcceptanceMsg;
    },
    // Vector addition of two units arrays
    vectorWith: (leftUnitsArray, rightUnitsArray) => {
      const withUnits = leftUnitsArray.map((leftUnits, i) =>
        unitOpsArray[i].with(leftUnits, rightUnitsArray[i]),
      );
      return withUnits;
    },
    // Vector subtraction of two units arrays
    vectorWithout: (leftUnitsArray, rightUnitsArray) => {
      const withoutUnits = leftUnitsArray.map((leftUnits, i) =>
        unitOpsArray[i].without(leftUnits, rightUnitsArray[i]),
      );
      return withoutUnits;
    },
    makeEmptyUnits: () => unitOpsArray.map(unitOps => unitOps.empty()),
  });
  return helpers;
};
