import harden from '@agoric/harden';

export const defaultRejectMsg = `The offer was invalid. Please check your refund.`;
export const defaultAcceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your payout`;

const hasKinds = (kinds, newPayoutRules) =>
  kinds.every((kind, i) => kind === newPayoutRules[i].kind);

const hasAssays = (assays, newPayoutRules) =>
  assays.every((assay, i) => assay === newPayoutRules[i].units.label.assay);

export const makeHelpers = (zoe, assays) => {
  const helpers = harden({
    getActiveOffers: handles =>
      zoe.getOffers(zoe.getOfferStatuses(handles).active),
    completeOffers: handles => zoe.complete(harden([...handles])),
    rejectOffer: (inviteHandle, msg = defaultRejectMsg) => {
      zoe.complete(harden([inviteHandle]));
      throw new Error(msg);
    },
    canTradeWith: inviteHandles => {
      const unitOpsArray = zoe.getUnitOpsForAssays(assays);
      const { payoutRules: leftPayoutRules } = zoe.getOffer(inviteHandles[0]);
      const { payoutRules: rightPayoutRules } = zoe.getOffer(inviteHandles[1]);
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
      const handles = [keepHandle, tryHandle];
      if (!helpers.canTradeWith(handles)) {
        throw helpers.rejectOffer(tryHandle);
      }
      const keepUnits = zoe.getOffer(keepHandle).units;
      const tryUnits = zoe.getOffer(tryHandle).units;
      // reallocate by switching the units
      zoe.reallocate(handles, harden([tryUnits, keepUnits]));
      zoe.complete(handles);
      return defaultAcceptanceMsg;
    },
    // Vector addition of two units arrays
    vectorWith: (leftUnitsArray, rightUnitsArray) => {
      const unitOpsArray = zoe.getUnitOpsForAssays(assays);
      const withUnits = leftUnitsArray.map((leftUnits, i) =>
        unitOpsArray[i].with(leftUnits, rightUnitsArray[i]),
      );
      return withUnits;
    },
    // Vector subtraction of two units arrays
    vectorWithout: (leftUnitsArray, rightUnitsArray) => {
      const unitOpsArray = zoe.getUnitOpsForAssays(assays);
      const withoutUnits = leftUnitsArray.map((leftUnits, i) =>
        unitOpsArray[i].without(leftUnits, rightUnitsArray[i]),
      );
      return withoutUnits;
    },
    makeEmptyUnits: () => {
      const unitOpsArray = zoe.getUnitOpsForAssays(assays);
      return unitOpsArray.map(unitOps => unitOps.empty());
    },
  });
  return helpers;
};

// REMOVE THIS: only used to temporarily fool ESLINT
export const rejectOffer = () => {};
