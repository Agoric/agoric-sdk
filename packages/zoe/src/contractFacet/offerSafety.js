import { AmountMath } from '@agoric/ertp';
import { natSafeMath } from '../contractSupport/safeMath.js';

const { Fail } = assert;
const { entries } = Object;

/**
 * Helper to perform numWantsSatisfied and numGivesSatisfied. How many times
 * does the `allocation` satisfy the `giveOrWant`?
 *
 * @param {AmountKeywordRecord} giveOrWant
 * @param {AmountKeywordRecord} allocation
 * @returns {number} If the giveOrWant is empty, then any allocation satisfies
 * it an `Infinity` number of times.
 */
const numSatisfied = (giveOrWant = {}, allocation) => {
  let multiples = Infinity;
  for (const [keyword, requiredAmount] of entries(giveOrWant)) {
    if (allocation[keyword] === undefined) {
      return 0;
    }
    const allocationAmount = allocation[keyword];
    if (!AmountMath.isGTE(allocationAmount, requiredAmount)) {
      return 0;
    }
    if (typeof requiredAmount.value !== 'bigint') {
      multiples = 1;
    } else if (requiredAmount.value > 0n) {
      assert.typeof(allocationAmount.value, 'bigint');
      const howMany = natSafeMath.floorDivide(
        allocationAmount.value,
        requiredAmount.value,
      );
      if (multiples > howMany) {
        howMany <= Number.MAX_SAFE_INTEGER ||
          Fail`numSatisfied ${howMany} out of safe integer range`;
        multiples = Number(howMany);
      }
    }
  }
  return multiples;
};

/**
 * For this allocation to satisfy what the user wanted, their
 * allocated amounts must be greater than or equal to proposal.want.
 * Even if multiples > 1n, this succeeds if it satisfies just one
 * unit of want.
 *
 * @param {ProposalRecord} proposal - the rules that accompanied the
 * escrow of payments that dictate what the user expected to get back
 * from Zoe. A proposal is a record with keys `give`, `want`, and
 * `exit`. `give` and `want` are records with keywords as keys and
 * amounts as values. The proposal is a user's understanding of the
 * contract that they are entering when they make an offer.
 * @param {AmountKeywordRecord} allocation - a record with keywords
 * as keys and amounts as values. These amounts are the reallocation
 * to be given to a user.
 * @returns {number} If the want is empty, then any allocation satisfies
 * it an `Infinity` number of times.
 */
export const numWantsSatisfied = (proposal, allocation) =>
  numSatisfied(proposal.want, allocation);
harden(numWantsSatisfied);

/**
 * For this allocation to count as a full refund, the allocated
 * amounts must be greater than or equal to what was originally
 * offered (proposal.give * proposal.multiples).
 *
 * @param  {ProposalRecord} proposal - the rules that accompanied the
 * escrow of payments that dictate what the user expected to get back
 * from Zoe. A proposal is a record with keys `give`, `want`, and
 * `exit`. `give` and `want` are records with keywords as keys and
 * amounts as values. The proposal is a user's understanding of the
 * contract that they are entering when they make an offer.
 * @param  {AmountKeywordRecord} allocation - a record with keywords
 * as keys and amounts as values. These amounts are the reallocation
 * to be given to a user.
 * @returns {number} If the give is empty, then any allocation satisfies
 * it an `Infinity` number of times.
 */
// Commented out because not currently used
// const numGivesSatisfied = (proposal, allocation) =>
//   numSatisfied(proposal.give, allocation);
// harden(numGivesSatisfied);

/**
 * `isOfferSafe` checks offer safety for a single offer.
 *
 * Note: This implementation checks whether we fully satisfy
 * `proposal.give` (giving a refund) or whether we fully satisfy
 * `proposal.want`. Both can be fully satisfied.
 *
 * @param  {ProposalRecord} proposal - the rules that accompanied the
 * escrow of payments that dictate what the user expected to get back
 * from Zoe. A proposal is a record with keys `give`, `want`, and
 * `exit`. `give` and `want` are records with keywords as keys and
 * amounts as values. The proposal is a user's understanding of the
 * contract that they are entering when they make an offer.
 * @param  {AmountKeywordRecord} allocation - a record with keywords
 * as keys and amounts as values. These amounts are the reallocation
 * to be given to a user.
 */
export const isOfferSafe = (proposal, allocation) => {
  const { give, want, multiples } = proposal;
  const howMany =
    numSatisfied(give, allocation) + numSatisfied(want, allocation);
  return howMany >= multiples;
};
harden(isOfferSafe);
