import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { HandledPromise } from '@agoric/eventual-send';

export const defaultRejectMsg = `The offer was invalid. Please check your refund.`;
export const defaultAcceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your payout`;

export const getKeys = obj => harden(Object.getOwnPropertyNames(obj || {}));
const getKeysSorted = obj =>
  harden(Object.getOwnPropertyNames(obj || {}).sort());

export const makeZoeHelpers = zoe => {
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
      const expected = [...expectedKeys]; // in case hardened
      expected.sort();
      if (!sameStructure(getKeysSorted(actual), harden(expected))) {
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
      const { issuerKeywordRecord } = zoe.getInstanceRecord();
      const actual = getKeysSorted(issuerKeywordRecord);
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
        // Check that the "exit" key (i.e. "onDemand") matches the
        // expected key.
        check(actual.exit, expected.exit)
      );
    },
    getActiveOffers: handles =>
      zoe.getOffers(zoe.getOfferStatuses(handles).active),
    rejectOffer,
    canTradeWith: (leftInviteHandle, rightInviteHandle) => {
      const { issuerKeywordRecord } = zoe.getInstanceRecord();
      const keywords = getKeys(issuerKeywordRecord);
      const amountMaths = zoe.getAmountMaths(keywords);
      const { proposal: left } = zoe.getOffer(leftInviteHandle);
      const { proposal: right } = zoe.getOffer(rightInviteHandle);
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
      const keepAmounts = zoe.getCurrentAllocation(keepHandle);
      const tryAmounts = zoe.getCurrentAllocation(tryHandle);
      // reallocate by switching the amount
      const handles = harden([keepHandle, tryHandle]);
      zoe.reallocate(handles, harden([tryAmounts, keepAmounts]));
      zoe.complete(handles);
      return defaultAcceptanceMsg;
    },
    makeInvite: (
      seatFn,
      customProperties = undefined,
      expected = undefined,
    ) => {
      const realSeatFn = inviteHandle => {
        if (expected) {
          helpers.rejectIfNotProposal(inviteHandle, expected);
        }
        return seatFn(inviteHandle);
      };
      return zoe.makeInvite(realSeatFn, customProperties);
    },
    makeEmptyOffer: () =>
      new HandledPromise(resolve => {
        const invite = helpers.makeInvite(inviteHandle =>
          resolve(inviteHandle),
        );
        zoeService.offer(invite);
      }),
  });
  return helpers;
};
