/**
 * `isOfferSafeForOffer` checks offer safety for a single offer.
 *
 * Note: This implementation checks whether we refund for all rules or
 * return winnings for all rules. It does not allow some refunds and
 * some winnings, which is what would happen if you checked the rules
 * independently. It *does* allow for returning a full refund plus
 * full winnings.
 *
 * @param  {object} brandToAmountMath - a map from brand to amountMath
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
  brandToAmountMath,
  proposal,
  newAmountKeywordRecord,
) {
  const isGTEByKeyword = ([keyword, amount]) => {
    const amountMath = brandToAmountMath.get(amount.brand);
    const newAmount = newAmountKeywordRecord[keyword];
    if (!newAmount && !amountMath.isEmpty(amount)) {
      return false;
    }
    return amountMath.isGTE(newAmount, amount);
  };

  const isUnchanged = ([keyword]) => {
    return !newAmountKeywordRecord[keyword];
  };

  // For this allocation to count as a full refund, the allocated
  // amount must be greater than or equal to what was originally
  // offered.
  const refundOk = Object.entries(proposal.give).every(isGTEByKeyword);

  // For this allocation to count as a full payout of what the user
  // wanted, their allocated amount must be greater than or equal to
  // what the payoutRules said they wanted.
  const winningsOk = Object.entries(proposal.want).every(isGTEByKeyword);

  // This reallocation is also offer safe if it only changes amounts that aren't
  // mentioned in this offer's give and want.
  const unchangedGive = Object.entries(proposal.give).every(isUnchanged);
  const unchangedWant = Object.entries(proposal.want).every(isUnchanged);
  return refundOk || winningsOk || (unchangedGive && unchangedWant);
}

/**
 * @param  {object} brandToAmountMath - a map from brand to amountMath
 * @param  {proposal[]} proposals - an array of records, each of which is the
 * proposal for a single player. Each proposal has keys `give`,
 * `want`, and `exit`.
 * @param  {newAmountKeywordRecord[]} newAllocations - an array of
 * records. Each of the records (amountKeywordRecord) has an offer's keywords
 * for keys and the values are the amounts that that offer will get.
 */
const isOfferSafeForAll = (brandToAmountMath, proposals, newAllocations) =>
  proposals.every((proposal, i) =>
    isOfferSafeForOffer(brandToAmountMath, proposal, newAllocations[i]),
  );

// `isOfferSafeForOffer` is only exported for testing
export { isOfferSafeForOffer, isOfferSafeForAll };
