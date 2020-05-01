/**
 * `isOfferSafeForOffer` checks offer safety for a single offer.
 *
 * Note: This implementation checks whether we refund for all rules or
 * return winnings for all rules. It does not allow some refunds and
 * some winnings, which is what would happen if you checked the rules
 * independently. It *does* allow for returning a full refund plus
 * full winnings.
 *
 * @param  {object} amountMathKeywordRecord - a record with keywords as
 * keys and amountMath as values
 * @param  {object} proposal - the rules that accompanied the
 * escrow of payments that dictate what the user expected to get back
 * from Zoe. A proposal is a record with keys `give`,
 * `want`, and `exit`. `give` and `want` are records with keywords
 * as keys and amounts as values. The proposal is a player's
 * understanding of the contract that they are entering when they make
 * an offer.
 * @param  {object} newAmountKeywordRecord - a record with keywords as keys and
 * amounts as values. These amounts are the reallocation to be given to a user.
 */
function isOfferSafeForOffer(
  amountMathKeywordRecord,
  proposal,
  newAmountKeywordRecord,
) {
  const isGTEByKeyword = ([keyword, amount]) => {
    if (!Object.keys(amountMathKeywordRecord).includes(keyword)) {
      return false;
    }
    return amountMathKeywordRecord[keyword].isGTE(
      newAmountKeywordRecord[keyword],
      amount,
    );
  };

  // For this allocation to count as a full refund, the allocated
  // amount must be greater than or equal to what was originally
  // offered.
  const refundOk = Object.entries(proposal.give).every(isGTEByKeyword);

  // For this allocation to count as a full payout of what the user
  // wanted, their allocated amount must be greater than or equal to
  // what the payoutRules said they wanted.
  const winningsOk = Object.entries(proposal.want).every(isGTEByKeyword);
  return refundOk || winningsOk;
}

/**
 * @param  {object} amountMathKeywordRecord - a record with keywords
 * as keys and amountMath as values
 * @param  {proposal[]} proposals - an array of records which are the
 * proposal for a single player. Each proposal has keys `give`,
 * `want`, and `exit`.
 * @param  {newAmountKeywordRecord[]} newAmountKeywordRecords- an array of
 * records. Each of the records (amountKeywordRecord) has keywords for
 * keys and the values are the amount that a single user will get.
 */
const isOfferSafeForAll = (
  amountMathKeywordRecord,
  proposals,
  newAmountKeywordRecords,
) =>
  proposals.every((proposal, i) =>
    isOfferSafeForOffer(
      amountMathKeywordRecord,
      proposal,
      newAmountKeywordRecords[i],
    ),
  );

// `isOfferSafeForOffer` is only exported for testing
export { isOfferSafeForOffer, isOfferSafeForAll };
