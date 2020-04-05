import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { HandledPromise } from '@agoric/eventual-send';

export const defaultRejectMsg = `The offer was invalid. Please check your refund.`;
export const defaultAcceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your payout`;

export const getKeys = obj => harden(Object.getOwnPropertyNames(obj || {}));
const getKeysSorted = obj =>
  harden(Object.getOwnPropertyNames(obj || {}).sort());

export const makeZoeHelpers = zcf => {
  const zoeService = zcf.getZoeService();

  const rejectOffer = (offerHandle, msg = defaultRejectMsg) => {
    zcf.complete(harden([offerHandle]));
    assert.fail(msg);
  };

  // Compare the keys of actual with expected keys and reject offer if
  // not sameStructure. If expectedKeys is undefined, no comparison occurs.
  const rejectKeysIf = (
    offerHandle,
    actual,
    expected,
    msg = defaultRejectMsg,
    // eslint-disable-next-line consistent-return
  ) => {
    if (expected !== undefined) {
      if (!sameStructure(getKeysSorted(actual), getKeysSorted(expected))) {
        return rejectOffer(offerHandle, msg);
      }
    }
  };
  // Compare actual keys to expected keys. If expectedKeys is
  // undefined, return true trivially.
  const checkKeys = (actual, expected) => {
    if (expected === undefined) {
      return true;
    }
    return sameStructure(getKeysSorted(actual), getKeysSorted(expected));
  };

  const helpers = harden({
    assertKeywords: expected => {
      const { issuerKeywordRecord } = zcf.getInstanceRecord();
      const actual = getKeysSorted(issuerKeywordRecord);
      expected = [...expected]; // in case hardened
      expected.sort();
      assert(
        sameStructure(actual, harden(expected)),
        details`keywords: ${actual} were not as expected: ${expected}`,
      );
    },
    rejectIfNotProposal: (offerHandle, expected) => {
      const { proposal: actual } = zcf.getOffer(offerHandle);
      rejectKeysIf(offerHandle, actual.give, expected.give);
      rejectKeysIf(offerHandle, actual.want, expected.want);
      rejectKeysIf(offerHandle, actual.exit, expected.exit);
    },
    checkIfProposal: (offerHandle, expected) => {
      const { proposal: actual } = zcf.getOffer(offerHandle);
      return (
        // Check that the "give" keys match expected keys.
        checkKeys(actual.give, expected.give) &&
        // Check that the "want" keys match expected keys.
        checkKeys(actual.want, expected.want) &&
        // Check that the "exit" key (i.e. "onDemand") matches the expected key.
        checkKeys(actual.exit, expected.exit)
      );
    },
    getActiveOffers: handles =>
      zcf.getOffers(zcf.getOfferStatuses(handles).active),
    rejectOffer,
    canTradeWith: (leftOfferHandle, rightOfferHandle) => {
      const { issuerKeywordRecord } = zcf.getInstanceRecord();
      const keywords = getKeys(issuerKeywordRecord);
      const amountMaths = zcf.getAmountMaths(keywords);
      const { proposal: left } = zcf.getOffer(leftOfferHandle);
      const { proposal: right } = zcf.getOffer(rightOfferHandle);
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
      if (!zcf.isOfferActive(keepHandle)) {
        throw helpers.rejectOffer(tryHandle, keepHandleInactiveMsg);
      }
      if (!helpers.canTradeWith(keepHandle, tryHandle)) {
        throw helpers.rejectOffer(tryHandle);
      }
      const keepAmounts = zcf.getCurrentAllocation(keepHandle);
      const tryAmounts = zcf.getCurrentAllocation(tryHandle);
      // reallocate by switching the amount
      const handles = harden([keepHandle, tryHandle]);
      zcf.reallocate(handles, harden([tryAmounts, keepAmounts]));
      zcf.complete(handles);
      return defaultAcceptanceMsg;
    },
    // TODO update documentation to new API
    inviteAnOffer: (options = {}) => {
      const {
        offerHook = () => {},
        customProperties = undefined,
        expected = undefined,
      } = options;
      const wrappedOfferHook = offerHandle => {
        if (expected) {
          helpers.rejectIfNotProposal(offerHandle, expected);
        }
        return offerHook(offerHandle);
      };
      return zcf.makeInvitation(wrappedOfferHook, customProperties);
    },
    makeEmptyOffer: () =>
      new HandledPromise(resolve => {
        const invite = helpers.inviteAnOffer({
          offerHook: offerHandle => resolve(offerHandle),
        });
        zoeService.offer(invite);
      }),
  });
  return helpers;
};
