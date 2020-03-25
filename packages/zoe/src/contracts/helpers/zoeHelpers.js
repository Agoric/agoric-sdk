import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';

export const defaultRejectMsg = `The offer was invalid. Please check your refund.`;
export const defaultAcceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your payout`;

export const getKeys = obj => harden(Object.getOwnPropertyNames(obj || {}));

export const makeZoeHelpers = zoe => {
  const { issuerKeywordRecord } = zoe.getInstanceRecord();
  const amountMaths = zoe.getAmountMaths(issuerKeywordRecord);
  const zoeService = zoe.getZoeService();

  const rejectOffer = (inviteHandle, msg = defaultRejectMsg) => {
    zoe.complete(harden([inviteHandle]));
    throw new Error(msg);
  };

  // Compare the keys of actual with expected keys and reject offer if
  // not sameStructure. If expectedKeys is undefined, no comparison occurs.
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
  // Compare actual to expected keys. If expectedKeys is
  // undefined, return true trivially.
  const check = (actual, expectedKeys) => {
    if (expectedKeys === undefined) {
      return true;
    }
    return sameStructure(getKeys(actual), expectedKeys);
  };
  const helpers = harden({
    assertKeywords: expected => {
      // 'actual' is sorted in alphabetical order by Zoe
      const { keywords: actual } = zoe.getInstanceRecord();
      expected = [...expected]; // in case hardened
      expected.sort();
      assert(
        sameStructure(actual, harden(expected)),
        details`keywords: ${actual} were not as expected: ${expected}`,
      );
    },
    rejectIfNotProposal: (inviteHandle, expected) => {
      const { proposal: actual } = zoe.getOffer(inviteHandle);
      rejectIf(inviteHandle, actual.give, expected.give);
      rejectIf(inviteHandle, actual.want, expected.want);
      rejectIf(inviteHandle, actual.exit, expected.exit);
    },
    checkIfProposal: (inviteHandle, expected) => {
      const { proposal: actual } = zoe.getOffer(inviteHandle);
      return (
        // Check that the "give" keys match expected keys.
        check(actual.give, expected.give) &&
        // Check that the "want" keys match expected keys.
        check(actual.want, expected.want) &&
        // Check that the "exit" key (i.e. "onDemand") matches the expected key.
        check(actual.exit, expected.exit)
      );
    },
    getActiveOffers: handles =>
      zoe.getOffers(zoe.getOfferStatuses(handles).active),
    rejectOffer,
    canTradeWith: (leftInviteHandle, rightInviteHandle) => {
      const { proposal: left } = zoe.getOffer(leftInviteHandle);
      const { proposal: right } = zoe.getOffer(rightInviteHandle);
      const { keywords } = zoe.getInstanceRecord();
      const satisfied = (want, give) =>
        keywords.every(keyword => {
          if (want[keyword]) {
            return amountMaths[keyword].isGTE(give[keyword], want[keyword]);
          }
          return true;
        });
      return (
        satisfied(left.want, right.give) && satisfied(right.want, left.give)
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
    makeEmptyOffer: () => {
      const { inviteHandle, invite } = zoe.makeInvite();
      return zoeService
        .redeem(invite, harden({}), harden({}))
        .then(() => inviteHandle);
    },
  });
  return helpers;
};
