import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { HandledPromise } from '@agoric/eventual-send';
import { getKeywords } from '../cleanProposal';

/**
 * @typedef {import('../zoe').OfferHandle} OfferHandle
 * @typedef {import('../zoe').Invite} Invite
 * @typedef {import('../zoe').OfferHook} OfferHook
 * @typedef {import('../zoe').CustomProperties} CustomProperties
 * @typedef {import('../zoe').ContractFacet} ContractFacet
 * @typedef {import('../zoe').Keyword} Keyword
 */

export const defaultRejectMsg = `The offer was invalid. Please check your refund.`;
export const defaultAcceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your payout`;

const getKeys = obj => harden(Object.getOwnPropertyNames(obj || {}));
const getKeysSorted = obj =>
  harden(Object.getOwnPropertyNames(obj || {}).sort());
/**
 * @function makeZoeHelpers - makes an object with helper functions useful to zoe contracts.
 *
 * @param {ContractFacet} zcf
 */
// zcf only picks up the type if the param is in parens, which eslint dislikes
// eslint-disable-next-line
export const makeZoeHelpers = (zcf) => {
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

  const getKeywordAndBrand = (offerHandle, amountKeywordRecord) => {
    const keywords = getKeys(amountKeywordRecord);
    if (keywords.length !== 1) {
      rejectOffer(
        offerHandle,
        `A swap requires giving one type of token for another, ${keywords.length} tokens were provided.`,
      );
    }
    return harden({
      keyword: keywords[0],
      brand: amountKeywordRecord[keywords[0]].brand,
    });
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
      const { proposal: left } = zcf.getOffer(leftOfferHandle);
      const { proposal: right } = zcf.getOffer(rightOfferHandle);
      const leftAllocation = zcf.getCurrentAllocation(leftOfferHandle);
      const rightAllocation = zcf.getCurrentAllocation(rightOfferHandle);
      const satisfied = (want, availableForTrade) =>
        getKeywords(want).every(keyword => {
          const amountMath = zcf.getAmountMath(want[keyword].brand);
          return amountMath.isGTE(availableForTrade[keyword], want[keyword]);
        });
      return (
        satisfied(left.want, rightAllocation) &&
        satisfied(right.want, leftAllocation)
      );
    },
    canTradeWithMapKeywords: (leftOfferHandle, rightOfferHandle, keywords) => {
      const { proposal: left } = zcf.getOffer(leftOfferHandle);
      const { proposal: right } = zcf.getOffer(rightOfferHandle);
      const [[leftKeywords], [rightKeywords]] = keywords;
      const leftAllocation = zcf.getCurrentAllocation(leftOfferHandle);
      const rightAllocation = zcf.getCurrentAllocation(rightOfferHandle);
      assert(
        leftKeywords.length === rightKeywords.length,
        details`Must provide the same number of keywords for both offers`,
      );
      const satisfied = (want, availableForTrade) => {
        for (let i = leftKeywords.label; i < leftKeywords.length; i += 1) {
          const amountMath = zcf.getAmountMath(want[leftKeywords[i]].brand);
          if (
            !amountMath.isGTE(
              availableForTrade[rightKeywords[i]],
              want[leftKeywords[i]],
            )
          ) {
            return false;
          }
        }
        return true;
      };

      return (
        satisfied(left.want, rightAllocation) &&
        satisfied(right.want, leftAllocation)
      );
    },

    // TODO: this will go away after simplifying barterExchange.
    /**
     * Compare two proposals for compatibility. This returns true
     * if the left offer would accept whatever the right offer is offering,
     * and vice versa. In contrast with canTradeWith(), this function ignores
     * keywords.
     *
     * @param {OfferHandle} leftOfferHandle
     * @param {OfferHandle} rightOfferHandle
     * @returns boolean
     */
    canTradeWithIgnoreKeywords: (leftOfferHandle, rightOfferHandle) => {
      const sumProposalByBrand = term => {
        const sumByBrand = new Map();
        Object.getOwnPropertyNames(term).forEach(keyword => {
          const amount = term[keyword];

          if (!sumByBrand.has(amount.brand)) {
            const empty = zcf.getAmountMath(amount.brand).getEmpty();
            sumByBrand.set(amount.brand, empty);
          }
          const prevSum = sumByBrand.get(amount.brand);
          const amountMath = zcf.getAmountMath(amount.brand);

          sumByBrand.set(amount.brand, amountMath.add(prevSum, amount));
        });
        return sumByBrand;
      };

      const isWantSatisfied = (want, offer) => {
        for (const brand of want.keys()) {
          const amountMath = zcf.getAmountMath(brand);
          if (!amountMath.isGTE(offer.get(brand), want.get(brand))) {
            return false;
          }
        }
        return true;
      };

      const { proposal: left } = zcf.getOffer(leftOfferHandle);
      const { proposal: right } = zcf.getOffer(rightOfferHandle);
      const leftWant = sumProposalByBrand(left.want);
      const rightWant = sumProposalByBrand(right.want);

      const leftAllocation = zcf.getCurrentAllocation(leftOfferHandle);
      const rightAllocation = zcf.getCurrentAllocation(rightOfferHandle);
      const leftOffer = sumProposalByBrand(leftAllocation);
      const rightOffer = sumProposalByBrand(rightAllocation);
      return (
        isWantSatisfied(leftWant, rightOffer) &&
        isWantSatisfied(rightWant, leftOffer)
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
     * Make an offerHook that wraps the provided `offerHook`, to first
     * check the submitted offer against an `expected` record that says
     * what shape of proposal is acceptable.
     *
     * This ExpectedRecord is like a Proposal, but the amounts in 'want'
     * and 'give' should be null; the exit clause should specify a rule with
     * null contents. If the client submits an Offer which does not match
     * these expectations, that offer will be rejected (and refunded).
     *
     * @param {OfferHook} offerHook
     * @param {ExpectedRecord} expected
     *
     * @typedef ExpectedRecord
     * @property {TODO} [want]
     * @property {TODO} [give]
     * @property {TODO} [exit]
     */
    checkHook: (offerHook, expected) => offerHandle => {
      helpers.rejectIfNotProposal(offerHandle, expected);
      return offerHook(offerHandle);
    },

    // TODO DEPRECATED `inviteAnOffer` is deprecated legacy. Remove when we can.
    inviteAnOffer: ({
      offerHook = () => {},
      inviteDesc,
      customProperties = undefined,
      expected = undefined,
    }) => {
      return zcf.makeInvitation(
        expected ? helpers.checkHook(offerHook, expected) : offerHook,
        inviteDesc || customProperties.inviteDesc,
        customProperties && harden({ customProperties }),
      );
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
     */
    makeEmptyOffer: () =>
      new HandledPromise(resolve => {
        const invite = zcf.makeInvitation(
          offerHandle => resolve(offerHandle),
          'empty offer',
        );
        zoeService.offer(invite);
      }),

    /**
     * Escrow a payment with Zoe and reallocate the amount of the
     * payment to a recipient.
     *
     * @param {Object} obj
     * @param {Amount} obj.amount
     * @param {Payment} obj.payment
     * @param {[String]} obj.keywords - [keywordIn and keywordOut]
     * @param {Handle} obj.recipientHandle
     * @returns {Promise<undefined>}
     */
    escrowAndAllocateTo: ({ amount, payment, keywords, recipientHandle }) => {
      // We will create a temporary offer to be able to escrow our payment
      // with Zoe.
      let tempHandle;

      // We need to make an invite and store the offerHandle of that
      // invite for future use.
      const contractSelfInvite = zcf.makeInvitation(
        offerHandle => (tempHandle = offerHandle),
        'self invite',
      );
      // To escrow the payment, we must get the Zoe Service facet and
      // make an offer
      const proposal = harden({ give: { [keywords[0]]: amount } });
      const payments = harden({ [keywords[0]]: payment });
      const amountMath = zcf.getAmountMath(amount.brand);

      return zcf
        .getZoeService()
        .offer(contractSelfInvite, proposal, payments)
        .then(() => {
          // At this point, the temporary offer has the amount from the
          // payment but nothing else. The recipient offer may have any
          // allocation, so we can't assume the allocation is currently empty for this
          // keyword.

          const recipientAlloc = zcf.getCurrentAllocation(
            recipientHandle,
            harden({ [keywords[1]]: amountMath }),
          );
          const tempAlloc = zcf.getCurrentAllocation(
            tempHandle,
            harden({ [keywords[0]]: amountMath }),
          );

          // Add the tempAlloc for the keyword to the recipientAlloc.
          recipientAlloc[keywords[1]] = amountMath.add(
            recipientAlloc[keywords[1]],
            tempAlloc[keywords[0]],
          );

          // Set the temporary offer allocation to empty.
          tempAlloc[keywords[0]] = amountMath.getEmpty();

          // Actually reallocate the amounts. Note that only the amounts
          // for `keyword` are reallocated.
          zcf.reallocate(
            harden([tempHandle, recipientHandle]),
            harden([tempAlloc, recipientAlloc]),
          );

          // Complete the temporary offerHandle
          zcf.complete([tempHandle]);

          // Now, the temporary offer no longer exists, but the recipient
          // offer is allocated the value of the payment.
        });
    },
    /*
     * Given a brand, assert that the mathHelpers for that issuer
     * are 'nat' mathHelpers
     */
    assertNatMathHelpers: brand => {
      const amountMath = zcf.getAmountMath(brand);
      assert(
        amountMath.getMathHelpersName() === 'nat',
        details`issuer must have natMathHelpers`,
      );
    },

    extractOfferDetails: offerHandle => {
      const { proposal } = zcf.getOffer(offerHandle);

      const keywordAndBrandIn = getKeywordAndBrand(offerHandle, proposal.give);
      const { brand: brandIn, keyword: keywordIn } = keywordAndBrandIn;
      const keywordAndBrandOut = getKeywordAndBrand(offerHandle, proposal.want);
      const { brand: brandOut, keyword: keywordOut } = keywordAndBrandOut;
      const {
        proposal: {
          give: { [keywordIn]: amountIn },
          want: { [keywordOut]: amountOut },
        },
      } = zcf.getOffer(offerHandle);
      return {
        offerHandle,
        keywordOut,
        brandOut,
        amountOut,
        keywordIn,
        brandIn,
        amountIn,
      };
    },

    crossMatchAmounts: (leftDetails, rightDetails) => {
      const amountMathLeftIn = zcf.getAmountMath(leftDetails.brandIn);
      const amountMathLeftOut = zcf.getAmountMath(leftDetails.brandOut);
      const newLeftAmountsRecord = {
        [leftDetails.keywordOut]: leftDetails.amountOut,
        [leftDetails.keywordIn]: amountMathLeftIn.subtract(
          leftDetails.amountIn,
          rightDetails.amountOut,
        ),
      };
      const newRightAmountsRecord = {
        [rightDetails.keywordOut]: rightDetails.amountOut,
        [rightDetails.keywordIn]: amountMathLeftOut.subtract(
          rightDetails.amountIn,
          leftDetails.amountOut,
        ),
      };
      return [newLeftAmountsRecord, newRightAmountsRecord];
    },
  });
  return helpers;
};
