import { assert, details } from '@agoric/assert';

/**
 * `isOfferSafeForOffer` checks offer safety for a single offer.
 *
 * Note: This implementation checks whether we refund for all rules or
 * return winnings for all rules. It does not allow some refunds and
 * some winnings, which is what would happen if you checked the rules
 * independently. It *does* allow for returning a full refund plus
 * full winnings.
 *
 * @param  {amountMath[]} amountMaths - an array of amountMath ordered in
 * the same order as the issuers for the payoutRules
 * @param  {payoutRule[]} payoutRules - the rules that accompanied the
 * escrow of payments that dictate what the user expected to get back
 * from Zoe. The payoutRules are an array of objects that have a kind
 * and amount, in the same order as the corresponding issuers. The
 * offerRules, including the payoutRules, are a player's understanding
 * of the contract that they are entering when they make an offer. A
 * payoutRule is structured in the form `{ kind: descriptionString,
 * amount}`
 * @param  {amount[]} amounts - an array of amounts ordered in the same
 * order as the issuers for the payoutRules. This array of amount is the
 * reallocation to be given to a player.
 */
function isOfferSafeForOffer(amountMaths, payoutRules, amounts) {
  assert(
    amountMaths.length === payoutRules.length &&
      amountMaths.length === amounts.length,
    details`amountMaths, payoutRules, and amounts must be arrays of the same length`,
  );

  const allowedRules = ['offerAtMost', 'wantAtLeast'];

  for (const payoutRule of payoutRules) {
    if (payoutRule === null || payoutRule === undefined) {
      throw new Error(`payoutRule must be specified`);
    }
    assert(
      allowedRules.includes(payoutRule.kind),
      details`The kind ${payoutRule.kind} was not recognized`,
    );
  }

  // For this allocation to count as a full refund, the allocated
  // amount must be greater than or equal to what was originally
  // offered.
  const refundOk = payoutRules.every((payoutRule, i) => {
    if (payoutRule.kind === 'offerAtMost') {
      return amountMaths[i].isGTE(amounts[i], payoutRule.amount);
    }
    // If the kind is 'want', anything we give back is fine for a refund.
    return true;
  });

  // For this allocation to count as a full payout of what the user
  // wanted, their allocated amount must be greater than or equal to
  // what the payoutRules said they wanted.
  const winningsOk = payoutRules.every((payoutRule, i) => {
    if (payoutRule.kind === 'wantAtLeast') {
      return amountMaths[i].isGTE(amounts[i], payoutRule.amount);
    }
    // If the kind is 'offer anything we give back is fine for a payout.
    return true;
  });
  return refundOk || winningsOk;
}

/**
 * @param  {amountMath[]} amountMaths - an array of amountMath ordered in
 * the same order as the issuers for the payoutRules
 * @param  {payoutRules[][]} payoutRulesMatrix - an array of arrays. Each of the
 * element arrays is the payout rules that a single player
 * made.
 * @param  {amount[][]} amountMatrix - an array of arrays. Each of the
 * element arrays is the array of amount that a single player will
 * get, in the same order as the issuers for the payoutRules
 */
const isOfferSafeForAll = (amountMaths, payoutRuleMatrix, amountMatrix) =>
  payoutRuleMatrix.every((payoutRules, i) =>
    isOfferSafeForOffer(amountMaths, payoutRules, amountMatrix[i]),
  );

// `isOfferSafeForOffer` is only exported for testing
export { isOfferSafeForOffer, isOfferSafeForAll };
