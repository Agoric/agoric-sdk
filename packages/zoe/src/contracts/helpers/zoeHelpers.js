import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';

export const defaultRejectMsg = `The offer was invalid. Please check your refund.`;
export const defaultAcceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your payout`;

const getKeys = obj => harden(Object.getOwnPropertyNames(obj || {}));

export const makeZoeHelpers = zoe => {
  const { issuers } = zoe.getInstanceRecord();
  const amountMathArray = zoe.getAmountMathForIssuers(issuers);
  const zoeService = zoe.getZoeService();

  const rejectOffer = (inviteHandle, msg = defaultRejectMsg) => {
    zoe.complete(harden([inviteHandle]));
    throw new Error(msg);
  };

  // Compare the keys of actual with expected keys and reject offer if
  // not sameStructure.
  const rejectIf = (
    inviteHandle,
    actual,
    expectedKeys,
    msg = defaultRejectMsg,
    // eslint-disable-next-line consistent-return
  ) => {
    if (expectedKeys !== undefined) {
      if (!sameStructure(getKeys(actual), expectedKeys)) {
        return rejectOffer(inviteHandle, msg);
      }
    }
  };
  const helpers = harden({
    assertRoleNames: expected => {
      // 'actual' is sorted in alphabetical order by Zoe
      const { roleNames: actual } = zoe.getInstanceRecord();
      expected = [...expected]; // in case hardened
      expected.sort();
      assert(
        sameStructure(actual, harden(expected)),
        details`roleNames: ${actual} were not as expected: ${expected}`,
      );
    },
    rejectIfNotOfferRules: (inviteHandle, expected) => {
      const { userOfferRules: actual } = zoe.getOffer(inviteHandle);
      rejectIf(inviteHandle, actual.offer, expected.offer);
      rejectIf(inviteHandle, actual.want, expected.want);
      rejectIf(inviteHandle, actual.exit, expected.exit);
    },
    getActiveOffers: handles =>
      zoe.getOffers(zoe.getOfferStatuses(handles).active),
    rejectOffer,
    areAssetsEqualAtIndex: (index, leftHandle, rightHandle) =>
      amountMathArray[index].isEqual(
        zoe.getOffer(leftHandle).payoutRules[index].amount,
        zoe.getOffer(rightHandle).payoutRules[index].amount,
      ),
    canTradeWith: (leftInviteHandle, rightInviteHandle) => {
      const {
        offerRules: { payoutRules: leftPayoutRules },
      } = zoe.getOffer(leftInviteHandle);
      const {
        offerRules: { payoutRules: rightPayoutRules },
      } = zoe.getOffer(rightInviteHandle);
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
      return zoeService
        .redeem(invite, harden({}), harden({}))
        .then(() => inviteHandle);
    },
  });
  return helpers;
};
