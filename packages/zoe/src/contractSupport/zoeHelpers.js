import { assert, details } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { E, HandledPromise } from '@agoric/eventual-send';
import { satisfiesWant, isOfferSafe } from '../offerSafety';

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

  /**
   * Given toGains (an AmountKeywordRecord), and allocations (a pair,
   * 'to' and 'from', of AmountKeywordRecords), all the entries in
   * toGains will be added to 'to'. If fromLosses is defined, all the
   * entries in fromLosses are subtracted from 'from'. (If fromLosses
   * is not defined, toGains is subtracted from 'from'.)
   *
   * @param {FromToAllocations} allocations - the 'to' and 'from'
   * allocations
   * @param {AmountKeywordRecord} toGains - what should be gained in
   * the 'to' allocation
   * @param {AmountKeywordRecord} fromLosses - what should be lost in
   * the 'from' allocation. If not defined, fromLosses is equal to
   * toGains. Note that the total amounts should always be equal; it
   * is the keywords that might be different.
   * @returns {FromToAllocations} allocations - new allocations
   *
   * @typedef FromToAllocations
   * @property {AmountKeywordRecord} from
   * @property {AmountKeywordRecord} to
   */
  const calcNewAllocations = (allocations, toGains, fromLosses = undefined) => {
    if (fromLosses === undefined) {
      fromLosses = toGains;
    }

    const subtract = (amount, amountToSubtract) => {
      const { brand } = amount;
      const amountMath = zcf.getAmountMath(brand);
      if (amountToSubtract !== undefined) {
        return amountMath.subtract(amount, amountToSubtract);
      }
      return amount;
    };

    const add = (amount, amountToAdd) => {
      if (amount && amountToAdd) {
        const { brand } = amount;
        const amountMath = zcf.getAmountMath(brand);
        return amountMath.add(amount, amountToAdd);
      }
      return amount || amountToAdd;
    };

    const newFromAllocation = Object.fromEntries(
      Object.entries(allocations.from).map(([keyword, allocAmount]) => {
        return [keyword, subtract(allocAmount, fromLosses[keyword])];
      }),
    );

    const allToKeywords = [
      ...Object.keys(toGains),
      ...Object.keys(allocations.to),
    ];

    const newToAllocation = Object.fromEntries(
      allToKeywords.map(keyword => [
        keyword,
        add(allocations.to[keyword], toGains[keyword]),
      ]),
    );

    return harden({
      from: newFromAllocation,
      to: newToAllocation,
    });
  };

  const mergeAllocations = (currentAllocation, allocation) => {
    const newAllocation = {
      ...currentAllocation,
      ...allocation,
    };
    return newAllocation;
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
     * Check whether an update to currentAllocation satisfies
     * proposal.want. Note that this is half of the offer safety
     * check; whether the allocation constitutes a refund is not
     * checked. Allocation is merged with currentAllocation
     * (allocations' values prevailing if the keywords are the same)
     * to produce the newAllocation.
     * @param {OfferHandle} offerHandle
     * @param {allocation} amountKeywordRecord
     * @returns {boolean}
     */
    satisfies: (offerHandle, allocation) => {
      const currentAllocation = zcf.getCurrentAllocation(offerHandle);
      const newAllocation = mergeAllocations(currentAllocation, allocation);
      const { proposal } = zcf.getOffer(offerHandle);
      return satisfiesWant(zcf.getAmountMath, proposal, newAllocation);
    },

    /**
     * Check whether an update to currentAllocation satisfies offer
     * safety. Note that this is the equivalent of `satisfiesWant` ||
     * `satisfiesGive`. Allocation is merged with currentAllocation
     * (allocations' values prevailing if the keywords are the same)
     * to produce the newAllocation.

     * @param {OfferHandle} offerHandle
     * @param {AmountKeywordRecord} allocation
     * @returns {boolean}
     */
    isOfferSafe: (offerHandle, allocation) => {
      const currentAllocation = zcf.getCurrentAllocation(offerHandle);
      const newAllocation = mergeAllocations(currentAllocation, allocation);
      const { proposal } = zcf.getOffer(offerHandle);
      return isOfferSafe(zcf.getAmountMath, proposal, newAllocation);
    },

    /**
     * Trade between left and right so that left and right end up with
     * the declared gains.
     * @param {offerHandleGainsLossesRecord} keepLeft
     * @param {offerHandleGainsLossesRecord} tryRight
     * @returns {undefined | Error}
     *
     * @typedef {object} offerHandleGainsLossesRecord
     * @property {OfferHandle} offerHandle
     * @property {AmountKeywordRecord} gains - what the offer will
     * gain as a result of this trade
     * @property {AmountKeywordRecord=} losses - what the offer will
     * give up as a result of this trade. Losses is optional, but can
     * only be omitted if the keywords for both offers are the same.
     * If losses is not defined, the gains of the other offer is
     * subtracted.
     */
    trade: (keepLeft, tryRight) => {
      assert(
        keepLeft.offerHandle !== tryRight.offerHandle,
        details`an offer cannot trade with itself`,
      );
      let leftAllocation = zcf.getCurrentAllocation(keepLeft.offerHandle);
      let rightAllocation = zcf.getCurrentAllocation(tryRight.offerHandle);

      try {
        // for all the keywords and amounts in leftGains, transfer from
        // right to left
        ({ from: rightAllocation, to: leftAllocation } = calcNewAllocations(
          { from: rightAllocation, to: leftAllocation },
          keepLeft.gains,
          tryRight.losses,
        ));
        // For all the keywords and amounts in rightGains, transfer from
        // left to right
        ({ from: leftAllocation, to: rightAllocation } = calcNewAllocations(
          { from: leftAllocation, to: rightAllocation },
          tryRight.gains,
          keepLeft.losses,
        ));
      } catch (err) {
        return rejectOffer(tryRight.offerHandle);
      }

      // Check whether reallocate would error before calling. If
      // it would error, reject the right offer and return.
      const offerSafeForLeft = helpers.isOfferSafe(
        keepLeft.offerHandle,
        leftAllocation,
      );
      const offerSafeForRight = helpers.isOfferSafe(
        tryRight.offerHandle,
        rightAllocation,
      );
      if (!(offerSafeForLeft && offerSafeForRight)) {
        console.log(
          `currentLeftAllocation`,
          zcf.getCurrentAllocation(keepLeft.offerHandle),
        );
        console.log(
          `currentRightAllocation`,
          zcf.getCurrentAllocation(tryRight.offerHandle),
        );
        console.log(`proposed left reallocation`, leftAllocation);
        console.log(`proposed right reallocation`, rightAllocation);
        // show the contraints
        console.log(
          `left want`,
          zcf.getOffer(keepLeft.offerHandle).proposal.want,
        );
        console.log(
          `right want`,
          zcf.getOffer(tryRight.offerHandle).proposal.want,
        );

        if (!offerSafeForLeft) {
          console.log(`offer not safe for left`);
        }
        if (!offerSafeForRight) {
          console.log(`offer not safe for right`);
        }
        return rejectOffer(tryRight.offerHandle);
      }
      zcf.reallocate(
        [keepLeft.offerHandle, tryRight.offerHandle],
        [leftAllocation, rightAllocation],
      );
      return undefined;
    },

    /**
     * If the two handles can trade, then swap their compatible assets,
     * marking both offers as complete.
     *
     * The surplus remains with the original offer. For example if
     * offer A gives 5 moola and offer B only wants 3 moola, offer A
     * retains 2 moola.
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

      helpers.trade(
        {
          offerHandle: keepHandle,
          gains: zcf.getOffer(keepHandle).proposal.want,
        },
        {
          offerHandle: tryHandle,
          gains: zcf.getOffer(tryHandle).proposal.want,
        },
      );

      zcf.complete([keepHandle, tryHandle]);
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
        E(zoeService).offer(invite);
      }),

    /**
     * Escrow a payment with Zoe and reallocate the amount of the
     * payment to a recipient.
     *
     * @param {Object} obj
     * @param {Amount} obj.amount
     * @param {Payment} obj.payment
     * @param {String} obj.keyword
     * @param {OfferHandle} obj.recipientHandle
     * @returns {Promise<undefined>}
     */
    escrowAndAllocateTo: ({ amount, payment, keyword, recipientHandle }) => {
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
      const proposal = harden({ give: { Temp: amount } });
      const payments = harden({ Temp: payment });

      return E(zcf.getZoeService())
        .offer(contractSelfInvite, proposal, payments)
        .then(() => {
          // At this point, the temporary offer has the amount from the
          // payment but nothing else. The recipient offer may have any
          // allocation, so we can't assume the allocation is currently empty for this
          // keyword.

          helpers.trade(
            {
              offerHandle: tempHandle,
              gains: {},
              losses: { Temp: amount },
            },
            {
              offerHandle: recipientHandle,
              gains: { [keyword]: amount },
            },
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
  });
  return helpers;
};
