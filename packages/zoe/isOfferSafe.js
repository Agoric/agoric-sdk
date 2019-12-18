import { insist } from '@agoric/ertp/util/insist';

/**
 * `isOfferSafeForOffer` checks offer safety for a single offer.
 *
 * Note: This implementation checks whether we refund for all rules or
 * return winnings for all rules. It does not allow some refunds and
 * some winnings, which is what would happen if you checked the rules
 * independently. It *does* allow for returning a full refund plus
 * full winnings.
 *
 * @param  {unitOps[]} unitOpsArray - an array of unitOps ordered in
 * the same order as the assays for the payoutRules
 * @param  {payoutRule[]} payoutRules - the rules that accompanied the
 * escrow of payments that dictate what the user expected to get back
 * from Zoe. The payoutRules are an array of objects that have a kind
 * and units, in the same order as the corresponding assays. The
 * offerRules, including the payoutRules, are a player's understanding
 * of the contract that they are entering when they make an offer. A
 * payoutRule is structured in the form `{ kind: descriptionString,
 * units}`
 * @param  {unit[]} units - an array of units ordered in the same
 * order as the assays for the payoutRules. This array of units is the
 * reallocation to be given to a player.
 */
function isOfferSafeForOffer(unitOpsArray, payoutRules, units) {
  insist(
    unitOpsArray.length === payoutRules.length &&
      unitOpsArray.length === units.length,
  )`unitOpsArray, payoutRules, and units must be arrays of the same length`;

  const allowedRules = [
    'offerExactly',
    'offerAtMost',
    'wantExactly',
    'wantAtLeast',
  ];

  for (const payoutRule of payoutRules) {
    if (payoutRule === null || payoutRule === undefined) {
      throw new Error(`payoutRule must be specified`);
    }
    insist(
      allowedRules.includes(payoutRule.kind),
    )`The kind ${payoutRule.kind} was not recognized`;
  }

  // For this allocation to count as a full refund, the allocated
  // units must be greater than or equal to what was originally
  // offered.
  const refundOk = payoutRules.every((payoutRule, i) => {
    if (payoutRule.kind === 'offerExactly') {
      return unitOpsArray[i].equals(units[i], payoutRule.units);
    }
    if (payoutRules.kind === 'offerAtMost') {
      return unitOpsArray[i].includes(units[i], payoutRule.units);
    }
    // If the kind is 'want', anything we give back is fine for a refund.
    return true;
  });

  // For this allocation to count as a full payout of what the user
  // wanted, their allocated units must be greater than or equal to
  // what the payoutRules said they wanted.
  const winningsOk = payoutRules.every((payoutRule, i) => {
    if (payoutRule.kind === 'wantExactly') {
      return unitOpsArray[i].equals(units[i], payoutRule.units);
    }
    if (payoutRule.kind === 'wantAtLeast') {
      return unitOpsArray[i].includes(units[i], payoutRule.units);
    }
    // If the kind is 'offer anything we give back is fine for a payout.
    return true;
  });
  return refundOk || winningsOk;
}

/**
 * @param  {unitOps[]} unitOpsArray - an array of unitOps ordered in
 * the same order as the assays for the payoutRules
 * @param  {payoutRules[][]} payoutRulesMatrix - an array of arrays. Each of the
 * element arrays is the payout rules that a single player
 * made.
 * @param  {unit[][]} unitMatrix - an array of arrays. Each of the
 * element arrays is the array of units that a single player will
 * get, in the same order as the assays for the payoutRules
 */
const isOfferSafeForAll = (unitOpsArray, payoutRuleMatrix, unitMatrix) =>
  payoutRuleMatrix.every((payoutRules, i) =>
    isOfferSafeForOffer(unitOpsArray, payoutRules, unitMatrix[i]),
  );

// `isOfferSafeForOffer` is only exported for testing
export { isOfferSafeForOffer, isOfferSafeForAll };
