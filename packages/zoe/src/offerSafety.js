/**
 * Helper to perform satisfiesWant and satisfiesGive. Is
 * allocationAmount greater than or equal to requiredAmount for every
 * keyword of giveOrWant?
 * @param {(Brand) => AmountMath} getAmountMath
 * @param {Proposal["give"] | Proposal["want"]} giveOrWant
 * @param {AmountKeywordRecord} allocation
 */
const satisfiesInternal = (getAmountMath, giveOrWant, allocation) => {
  const isGTEByKeyword = ([keyword, requiredAmount]) => {
    // If there is no allocation for a keyword, we know the giveOrWant
    // is not satisfied without checking further.
    if (allocation[keyword] === undefined) {
      return false;
    }
    const amountMath = getAmountMath(requiredAmount.brand);
    const allocationAmount = allocation[keyword];
    return amountMath.isGTE(allocationAmount, requiredAmount);
  };
  return Object.entries(giveOrWant).every(isGTEByKeyword);
};

/**
 * For this allocation to satisfy what the user wanted, their
 * allocated amounts must be greater than or equal to proposal.want.
 * @param  {(Brand) => AmountMath} getAmountMath - a function that
 * takes a brand and returns the appropriate amountMath. The function
 * must have an amountMath for every brand in proposal.want.
 * @param  {Proposal} proposal - the rules that accompanied the escrow
 * of payments that dictate what the user expected to get back from
 * Zoe. A proposal is a record with keys `give`, `want`, and `exit`.
 * `give` and `want` are records with keywords as keys and amounts as
 * values. The proposal is a user's understanding of the contract that
 * they are entering when they make an offer.
 * @param  {AmountKeywordRecord} allocation - a record with keywords
 * as keys and amounts as values. These amounts are the reallocation
 * to be given to a user.
 */
const satisfiesWant = (getAmountMath, proposal, allocation) =>
  satisfiesInternal(getAmountMath, proposal.want, allocation);

/**
 * For this allocation to count as a full refund, the allocated
 * amounts must be greater than or equal to what was originally
 * offered (proposal.give).
 * @param  {(Brand) => AmountMath} getAmountMath - a function that
 * takes a brand and returns the appropriate amountMath. The function
 * must have an amountMath for every brand in proposal.give.
 * @param  {Proposal} proposal - the rules that accompanied the escrow
 * of payments that dictate what the user expected to get back from
 * Zoe. A proposal is a record with keys `give`, `want`, and `exit`.
 * `give` and `want` are records with keywords as keys and amounts as
 * values. The proposal is a user's understanding of the contract that
 * they are entering when they make an offer.
 * @param  {AmountKeywordRecord} allocation - a record with keywords
 * as keys and amounts as values. These amounts are the reallocation
 * to be given to a user.
 */
const satisfiesGive = (getAmountMath, proposal, allocation) =>
  satisfiesInternal(getAmountMath, proposal.give, allocation);

/**
 * `isOfferSafe` checks offer safety for a single offer.
 *
 * Note: This implementation checks whether we fully satisfy
 * `proposal.give` (giving a refund) or whether we fully satisfy
 * `proposal.want`. Both can be fully satisfied.
 *
 * @param  {(Brand) => AmountMath} getAmountMath - a function that
 * takes a brand and returns the appropriate amountMath. The function
 * must have an amountMath for every brand in proposal.want and
 * proposal.give.
 * @param  {Proposal} proposal - the rules that accompanied the escrow
 * of payments that dictate what the user expected to get back from
 * Zoe. A proposal is a record with keys `give`, `want`, and `exit`.
 * `give` and `want` are records with keywords as keys and amounts as
 * values. The proposal is a user's understanding of the contract that
 * they are entering when they make an offer.
 * @param  {AmountKeywordRecord} allocation - a record with keywords
 * as keys and amounts as values. These amounts are the reallocation
 * to be given to a user.
 */
function isOfferSafe(getAmountMath, proposal, allocation) {
  return (
    satisfiesGive(getAmountMath, proposal, allocation) ||
    satisfiesWant(getAmountMath, proposal, allocation)
  );
}

export { isOfferSafe, satisfiesWant };
