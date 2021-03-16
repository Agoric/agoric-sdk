// @ts-check
import '../../exported';

import { assert, details as X } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import { MathKind, amountMath } from '@agoric/ertp';
import { satisfiesWant } from '../contractFacet/offerSafety';
import { objectMap } from '../objArrayConversion';

export const defaultAcceptanceMsg = `The offer has been accepted. Once the contract has been completed, please check your payout`;

const getKeysSorted = obj =>
  harden(Object.getOwnPropertyNames(obj || {}).sort());

/**
 * Given toGains (an AmountKeywordRecord), and allocations (a pair,
 * 'to' and 'from', of Allocations), all the entries in
 * toGains will be added to 'to'. If fromLosses is defined, all the
 * entries in fromLosses are subtracted from 'from'. (If fromLosses
 * is not defined, toGains is subtracted from 'from'.)
 *
 * @param {FromToAllocations} allocations - the 'to' and 'from'
 * allocations
 * @param {AmountKeywordRecord} toGains - what should be gained in
 * the 'to' allocation
 * @param {AmountKeywordRecord} [fromLosses=toGains] - what should be lost in
 * the 'from' allocation. If not defined, fromLosses is equal to
 * toGains. Note that the total amounts should always be equal; it
 * is the keywords that might be different.
 * @returns {FromToAllocations} allocations - new allocations
 *
 * @typedef FromToAllocations
 * @property {Allocation} from
 * @property {Allocation} to
 */
const calcNewAllocations = (allocations, toGains, fromLosses = toGains) => {
  const subtract = (amount, amountToSubtract) => {
    if (amountToSubtract !== undefined) {
      return amountMath.subtract(amount, amountToSubtract);
    }
    return amount;
  };

  const add = (amount, amountToAdd) => {
    if (amount && amountToAdd) {
      return amountMath.add(amount, amountToAdd);
    }
    return amount || amountToAdd;
  };

  const newFromAllocation = objectMap(
    allocations.from,
    ([keyword, allocAmount]) => [
      keyword,
      subtract(allocAmount, fromLosses[keyword]),
    ],
  );

  const allToKeywords = Object.keys({ ...allocations.to, ...toGains });

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

export const assertIssuerKeywords = (zcf, expected) => {
  const { issuers } = zcf.getTerms();
  const actual = getKeysSorted(issuers);
  expected = [...expected]; // in case hardened
  expected.sort();
  assert(
    sameStructure(actual, harden(expected)),
    X`keywords: ${actual} were not as expected: ${expected}`,
  );
};

/**
 * @typedef {Object} ZcfSeatPartial
 * @property {() => ProposalRecord} getProposal
 * @property {() => Allocation} getCurrentAllocation
 */

/**
 * Check whether an update to currentAllocation satisfies
 * proposal.want. Note that this is half of the offer safety
 * check; whether the allocation constitutes a refund is not
 * checked. The update is merged with currentAllocation
 * (update's values prevailing if the keywords are the same)
 * to produce the newAllocation.
 *
 * @param {ContractFacet} zcf
 * @param {ZcfSeatPartial} seat
 * @param {AmountKeywordRecord} update
 * @returns {boolean}
 */
export const satisfies = (zcf, seat, update) => {
  const currentAllocation = seat.getCurrentAllocation();
  const newAllocation = { ...currentAllocation, ...update };
  const proposal = seat.getProposal();
  return satisfiesWant(proposal, newAllocation);
};

/** @type {Trade} */
export const trade = (
  zcf,
  left,
  right,
  leftHasExitedMsg = 'the left seat has exited',
  rightHasExitedMsg = 'the right seat has exited',
) => {
  assert(left.seat !== right.seat, X`a seat cannot trade with itself`);
  assert(!left.seat.hasExited(), leftHasExitedMsg);
  assert(!right.seat.hasExited(), rightHasExitedMsg);
  let leftAllocation = left.seat.getCurrentAllocation();
  let rightAllocation = right.seat.getCurrentAllocation();
  try {
    // for all the keywords and amounts in left.gains, transfer from
    // right to left
    ({ from: rightAllocation, to: leftAllocation } = calcNewAllocations(
      { from: rightAllocation, to: leftAllocation },
      left.gains,
      right.losses,
    ));
    // For all the keywords and amounts in right.gains, transfer from
    // left to right
    ({ from: leftAllocation, to: rightAllocation } = calcNewAllocations(
      { from: leftAllocation, to: rightAllocation },
      right.gains,
      left.losses,
    ));
  } catch (err) {
    const newErr = new Error(
      `The trade between left ${left} and right ${right} failed.`,
    );
    assert.note(newErr, X`due to ${err}`);
    throw newErr;
  }

  // Check whether reallocate would error before calling. If
  // it would error, log information and throw.
  const offerSafeForLeft = left.seat.isOfferSafe(leftAllocation);
  const offerSafeForRight = right.seat.isOfferSafe(rightAllocation);
  if (!(offerSafeForLeft && offerSafeForRight)) {
    console.log(`currentLeftAllocation`, left.seat.getCurrentAllocation());
    console.log(`currentRightAllocation`, right.seat.getCurrentAllocation());
    console.log(`proposed left reallocation`, leftAllocation);
    console.log(`proposed right reallocation`, rightAllocation);
    // show the constraints
    console.log(`left want`, left.seat.getProposal().want);
    console.log(`right want`, right.seat.getProposal().want);

    if (!offerSafeForLeft) {
      console.log(`offer not safe for left`);
    }
    if (!offerSafeForRight) {
      console.log(`offer not safe for right`);
    }
    throw new Error(
      `The trade between left ${left} and right ${right} failed offer safety. Please check the log for more information`,
    );
  }

  try {
    zcf.reallocate(
      left.seat.stage(leftAllocation),
      right.seat.stage(rightAllocation),
    );
  } catch (err) {
    const newErr = Error(`The reallocation failed to conserve rights.`);
    assert.note(newErr, X`due to ${err}`);
    throw newErr;
  }
};

/** @type {Swap} */
export const swap = (
  zcf,
  leftSeat,
  rightSeat,
  leftHasExitedMsg = 'the left seat in swap() has exited',
  rightHasExitedMsg = 'the right seat in swap() has exited',
) => {
  try {
    trade(
      zcf,
      {
        seat: leftSeat,
        gains: leftSeat.getProposal().want,
      },
      {
        seat: rightSeat,
        gains: rightSeat.getProposal().want,
      },
      leftHasExitedMsg,
      rightHasExitedMsg,
    );
  } catch (err) {
    leftSeat.fail(err);
    rightSeat.fail(err);
    throw err;
  }

  leftSeat.exit();
  rightSeat.exit();
  return defaultAcceptanceMsg;
};

/**
 * @type {Swap}
 * Swap such that both seats gain what they want and lose everything
 * that they gave. Only good for exact and entire swaps where each
 * seat wants everything that the other seat has. The benefit of using
 * this method is that the keywords of each seat do not matter.
 */
export const swapExact = (
  zcf,
  leftSeat,
  rightSeat,
  leftHasExitedMsg = 'the left seat in swapExact() has exited',
  rightHasExitedMsg = 'the right seat in swapExact() has exited',
) => {
  try {
    trade(
      zcf,
      {
        seat: leftSeat,
        gains: leftSeat.getProposal().want,
        losses: leftSeat.getProposal().give,
      },
      {
        seat: rightSeat,
        gains: rightSeat.getProposal().want,
        losses: rightSeat.getProposal().give,
      },
      leftHasExitedMsg,
      rightHasExitedMsg,
    );
  } catch (err) {
    leftSeat.fail(err);
    rightSeat.fail(err);
    throw err;
  }

  leftSeat.exit();
  rightSeat.exit();
  return defaultAcceptanceMsg;
};

/**
 * @typedef ExpectedRecord
 * @property {Record<Keyword, null>} [want]
 * @property {Record<Keyword, null>} [give]
 * @property {Partial<Record<keyof ProposalRecord['exit'], null>>} [exit]
 */

/**
 * Check the seat's proposal against an `expected` record that says
 * what shape of proposal is acceptable.
 *
 * This ExpectedRecord is like a Proposal, but the amounts in 'want'
 * and 'give' should be null; the exit clause should specify a rule with
 * null contents. If the client submits an offer which does not match
 * these expectations, the seat will be exited (and payments refunded).
 *
 * @param {ZCFSeat} seat
 * @param {ExpectedRecord} expected
 */
export const assertProposalShape = (seat, expected) => {
  assert.typeof(expected, 'object');
  assert(!Array.isArray(expected), X`Expected must be an non-array object`);
  const assertValuesNull = e => {
    if (e !== undefined) {
      Object.values(e).forEach(value =>
        assert(
          value === null,
          X`The value of the expected record must be null but was ${value}`,
        ),
      );
    }
  };

  // Assert values of the expected record are all null. We do not
  // check the values of the actual proposal.
  assertValuesNull(expected.give);
  assertValuesNull(expected.want);
  assertValuesNull(expected.exit);

  const actual = seat.getProposal();
  const assertKeys = (a, e) => {
    if (e !== undefined) {
      assert(
        sameStructure(getKeysSorted(a), getKeysSorted(e)),
        X`actual ${a} did not match expected ${e}`,
      );
    }
  };
  assertKeys(actual.give, expected.give);
  assertKeys(actual.want, expected.want);
  assertKeys(actual.exit, expected.exit);
};

/* Given a brand, assert that the issuer uses NAT amountMath. */
export const assertUsesNatMath = (zcf, brand) => {
  assert(
    zcf.getMathKind(brand) === MathKind.NAT,
    X`issuer must use NAT amountMath`,
  );
};

export const depositToSeatSuccessMsg = `Deposit and reallocation successful.`;

/**
 * Deposit payments such that their amounts are reallocated to a seat.
 * The `amounts` and `payments` records must have corresponding
 * keywords.
 *
 * @param {ContractFacet} zcf
 * @param {ZCFSeat} recipientSeat
 * @param {AmountKeywordRecord} amounts
 * @param {PaymentPKeywordRecord} payments
 * @returns {Promise<string>} `Deposit and reallocation successful.`
 */

export async function depositToSeat(zcf, recipientSeat, amounts, payments) {
  assert(!recipientSeat.hasExited(), 'The recipientSeat cannot have exited.');

  // We will create a temporary offer to be able to escrow our payments
  // with Zoe.
  function reallocateAfterDeposit(tempSeat) {
    // After the assets are deposited, reallocate them onto the recipient seat and
    // exit the temporary seat. Note that the offerResult is the return value of this
    // function, so this synchronous trade must happen before the
    // offerResult resolves.
    trade(
      zcf,
      { seat: tempSeat, gains: {} },
      { seat: recipientSeat, gains: amounts },
    );
    tempSeat.exit();
    return depositToSeatSuccessMsg;
  }
  const invitation = zcf.makeInvitation(
    reallocateAfterDeposit,
    'temporary seat for deposit',
  );
  const proposal = harden({ give: amounts });
  harden(payments);
  // To escrow the payment, we must get the Zoe Service facet and
  // make an offer
  const zoe = zcf.getZoeService();
  const tempUserSeat = E(zoe).offer(invitation, proposal, payments);
  // This will be a promise for the string: `Deposit and reallocation
  // successful.` It will only fulfill after the assets have been
  // successfully reallocated to the recipient seat.
  return E(tempUserSeat).getOfferResult();
}

/**
 * Withdraw payments from a seat. Note that withdrawing the amounts of
 * the payments must not and cannot violate offer safety for the seat. The
 * `amounts` and `payments` records must have corresponding keywords.
 *
 * @param {ContractFacet} zcf
 * @param {ZCFSeat} seat
 * @param {AmountKeywordRecord} amounts
 * @returns {Promise<PaymentPKeywordRecord>}
 */
export async function withdrawFromSeat(zcf, seat, amounts) {
  assert(!seat.hasExited(), 'The seat cannot have exited.');
  const { zcfSeat: tempSeat, userSeat: tempUserSeatP } = zcf.makeEmptySeatKit();
  trade(zcf, { seat: tempSeat, gains: amounts }, { seat, gains: {} });
  tempSeat.exit();
  return E(tempUserSeatP).getPayouts();
}

/**
 * Save all of the issuers in an issuersKeywordRecord to ZCF, using
 * the method `zcf.saveIssuer`. This does not error if any of the keywords
 * already exist. If the keyword is already present, it is ignored.
 *
 * @param {ContractFacet} zcf
 * @param {IssuerKeywordRecord} issuerKeywordRecord Issuers to save to
 * ZCF
 */
export async function saveAllIssuers(zcf, issuerKeywordRecord = harden({})) {
  const { issuers } = zcf.getTerms();
  const issuersPSaved = Object.entries(issuerKeywordRecord).map(
    ([keyword, issuer]) => {
      // If the keyword does not yet exist, add it and the
      // associated issuer.
      if (issuers[keyword] === undefined) {
        return zcf.saveIssuer(issuer, keyword);
      }
      return undefined;
    },
  );
  return Promise.all(issuersPSaved);
}

/** @type {MapKeywords} */
export const mapKeywords = (keywordRecord = {}, keywordMapping) => {
  return Object.fromEntries(
    Object.entries(keywordRecord).map(([keyword, value]) => {
      if (keywordMapping[keyword] === undefined) {
        return [keyword, value];
      }
      return [keywordMapping[keyword], value];
    }),
  );
};
/** @type {Reverse} */
const reverse = (keywordRecord = {}) => {
  return Object.fromEntries(
    Object.entries(keywordRecord).map(([key, value]) => [value, key]),
  );
};

/** @type {OfferTo} */
export const offerTo = async (
  zcf,
  invitation,
  keywordMapping = {},
  proposal,
  fromSeat,
  toSeat,
) => {
  const definedToSeat = toSeat !== undefined ? toSeat : fromSeat;

  const zoe = zcf.getZoeService();
  const mappingReversed = reverse(keywordMapping);

  // the proposal is in the other contract's keywords, but we want to
  // use `proposal.give` to withdraw
  const payments = await withdrawFromSeat(
    zcf,
    fromSeat,
    // `proposal.give` may be undefined
    mapKeywords(proposal.give, mappingReversed),
  );

  // Map to the other contract's keywords
  const paymentsForOtherContract = mapKeywords(payments, keywordMapping);

  const userSeatPromise = E(zoe).offer(
    invitation,
    proposal,
    paymentsForOtherContract,
  );

  const depositedPromiseKit = makePromiseKit();

  const doDeposit = async payoutPayments => {
    const amounts = await E(userSeatPromise).getCurrentAllocation();

    // Map back to the original contract's keywords
    const mappedAmounts = mapKeywords(amounts, mappingReversed);
    const mappedPayments = mapKeywords(payoutPayments, mappingReversed);
    await depositToSeat(zcf, definedToSeat, mappedAmounts, mappedPayments);
    depositedPromiseKit.resolve(mappedAmounts);
  };

  E(userSeatPromise)
    .getPayouts()
    .then(doDeposit);

  return harden({ userSeatPromise, deposited: depositedPromiseKit.promise });
};
