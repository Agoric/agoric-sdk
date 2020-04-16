import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { HandledPromise } from '@agoric/eventual-send';

/**
 * @typedef {import('../zoe').OfferHandle} OfferHandle
 * @typedef {import('../zoe').Invite} Invite
 * @typedef {import('../zoe').OfferHook} OfferHook
 * @typedef {import('../zoe').CustomProperties} CustomProperties
 * @typedef {any} TODO Needs to be typed
 */

export const defaultRejectMsg = `The offer was invalid. Please check your refund.`;
export const defaultAcceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your payout`;

const getKeys = obj => harden(Object.getOwnPropertyNames(obj || {}));
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
    getKeys,
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
    /**
     * Compare two proposals for compatibility. This returns true
     * if the left offer would accept whatever the right offer is offering,
     * and vice versa.
     *
     * @param {OfferHandle} leftOfferHandle
     * @param {OfferHandle} rightOfferHandle
     * @returns boolean
     *
     */
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
    /**
     * If the two handles can trade, then swap their compatible assets,
     * marking both offers as complete.
     *
     * TODO: The surplus is dispatched according to some policy TBD.
     *
     * If the keep offer is no longer active (it was already completed), the try
     * offer will be rejected with a message (provided by 'keepHandleInactiveMsg').
     *
     * TODO: If the try offer is no longer active, swap() should terminate with
     * a useful error message, like defaultRejectMsg.
     *
     * If the swap fails, no assets are transferred, and the 'try' offer is rejected.
     *
     * @param {OfferHandle} keepHandle
     * @param {OfferHandle} tryHandle
     * @param {String} [keepHandleInactiveMsg]
     */
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
    /**
     * Make an invitation to submit an Offer to this contract. This
     * invitation can be given to a client, granting them the ability to
     * participate in the contract.
     *
     * If the "expected" option is provided, it should be an ExpectedRecord.
     * This is like a Proposal, but the amounts in 'want' and 'give' should be null,
     * and the 'exit' should have a choice but the contents should be null.
     * If the client submits an Offer which does not match these expectations,
     * that offer will be rejected (and refunded).
     *
     * If "offerHook" is provided, it will be called when the invitation is exercised
     * and an offer is submitted. The callback will get a reference to the offer.
     *
     * @param {InviteAnOfferOptions} [options={}]
     * @returns {Invite}
     *
     * @typedef InviteAnOfferOptions
     * @param {OfferHook} [offerHook]
     * @param {CustomProperties} [customProperties]
     * @param {ExpectedRecord} [expected]
     *
     * @typedef ExpectedRecord
     * @property {TODO} [want]
     * @property {TODO} [give]
     * @property {TODO} [exit]
     *
     */
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
    /**
     * Return a Promise for an OfferHandle.
     *
     * This offer will have an empty 'give' and 'want', making it useful
     * for contracts to use for unrestricted internal asset reallocation.
     * One example is the Autoswap contract, which uses an empty offer
     * to manage internal escrowed assets.
     *
     * @returns {Promise<OfferHandle>}
     *
     */
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
