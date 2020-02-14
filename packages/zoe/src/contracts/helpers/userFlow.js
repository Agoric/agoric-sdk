import harden from '@agoric/harden';

export const defaultRejectMsg = `The offer was invalid. Please check your refund.`;
export const defaultAcceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your payout`;

const hasKinds = (kinds, newPayoutRules) =>
  kinds.every((kind, i) => kind === newPayoutRules[i].kind);

const hasBrands = (brands, newPayoutRules) =>
  brands.every((brand, i) => brand === newPayoutRules[i].amount.brand);

export const makeHelpers = (zoe, issuers) => {
  const amountMathArray = zoe.getAmountMathForIssuers(issuers);
  const brands = zoe.getBrandsForIssuers(issuers);
  const zoeService = zoe.getZoeService();
  const helpers = harden({
    getActiveOffers: handles =>
      zoe.getOffers(zoe.getOfferStatuses(handles).active),
    rejectOffer: (inviteHandle, msg = defaultRejectMsg) => {
      zoe.complete(harden([inviteHandle]));
      throw new Error(msg);
    },
    areAssetsEqualAtIndex: (index, leftHandle, rightHandle) =>
      amountMathArray[index].isEqual(
        zoe.getOffer(leftHandle).payoutRules[index].amount,
        zoe.getOffer(rightHandle).payoutRules[index].amount,
      ),
    canTradeWith: (leftInviteHandle, rightInviteHandle) => {
      const { payoutRules: leftPayoutRules } = zoe.getOffer(leftInviteHandle);
      const { payoutRules: rightPayoutRules } = zoe.getOffer(rightInviteHandle);
      const satisfied = (wants, offers) =>
        wants.every((want, i) => {
          if (want.kind === 'wantAtLeast') {
            return (
              offers[i].kind === 'offerAtMost' &&
              amountMathArray[i].isGTE(offers[i].amount, want.amount)
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
      return hasKinds(kinds, payoutRules) && hasBrands(brands, payoutRules);
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
      const keepAmounts = zoe.getOffer(keepHandle).amounts;
      const tryAmounts = zoe.getOffer(tryHandle).amounts;
      // reallocate by switching the amount
      const handles = harden([keepHandle, tryHandle]);
      zoe.reallocate(handles, harden([tryAmounts, keepAmounts]));
      zoe.complete(handles);
      return defaultAcceptanceMsg;
    },
    // Vector addition of two amount arrays
    vectorWith: (leftAmountsArray, rightAmountsArray) => {
      const withAmounts = leftAmountsArray.map((leftAmounts, i) =>
        amountMathArray[i].add(leftAmounts, rightAmountsArray[i]),
      );
      return withAmounts;
    },
    // Vector subtraction of two amount arrays
    vectorWithout: (leftAmountsArray, rightAmountsArray) => {
      const withoutAmounts = leftAmountsArray.map((leftAmounts, i) =>
        amountMathArray[i].subtract(leftAmounts, rightAmountsArray[i]),
      );
      return withoutAmounts;
    },
    makeEmptyAmounts: () =>
      amountMathArray.map(amountMath => amountMath.getEmpty()),
    makeEmptyOffer: () => {
      const { inviteHandle, invite } = zoe.makeInvite();
      const offerRules = harden({
        payoutRules: amountMathArray.map(amountMath => {
          return {
            kind: 'wantAtLeast',
            amount: amountMath.getEmpty(),
          };
        }),
        exitRule: {
          kind: 'waived',
        },
      });
      const offerPayments = amountMathArray.map(() => undefined);
      return zoeService
        .redeem(invite, offerRules, offerPayments)
        .then(() => inviteHandle);
    },
  });
  return helpers;
};
