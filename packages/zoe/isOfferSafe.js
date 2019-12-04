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
 * @param  {extentOps[]} extentOpsArray - an array of extentOps
 * ordered in the same order as the corresponding assays
 * @param  {payoutRule[]} payoutRules - the rules that accompanied the
 * escrow of payments that dictate what the user expected to get back
 * from Zoe. The payoutRules are an array of objects that have a kind
 * and units, in the same order as the corresponding assays. The
 * offerRules, including the payoutRules, are a player's understanding
 * of the contract that they are entering when they make an offer.
 * A payoutRule is structured in the form `{ kind:
 * descriptionString, units}`
 * @param  {extent[]} extents - an array of extents ordered in the
 * same order as the corresponding assays. This array of extents is
 * the reallocation to be given to a player.
 */
function isOfferSafeForOffer(extentOpsArray, payoutRules, extents) {
  insist(
    extentOpsArray.length === payoutRules.length &&
      extentOpsArray.length === extents.length,
  )`extentOpsArray, the offer description, and extents must be arrays of the same length`;

  const allowedRules = [
    'offerExactly',
    'offerAtMost',
    'wantExactly',
    'wantAtLeast',
  ];

  // For this allocation to count as a full refund, the allocated
  // extents must be greater than or equal to what was originally
  // offered.
  const refundOk = payoutRules.every((payoutRule, i) => {
    if (payoutRule === null || payoutRule === undefined) {
      throw new Error(`payoutRule must be specified`);
    }
    insist(
      allowedRules.includes(payoutRule.kind),
    )`The kind ${payoutRule.kind} was not recognized`;
    // If the kind was 'offerExactly', we should make sure that the
    // user gets it back exactly in a refund. If the kind is
    // 'offerAtMost' we need to ensure that the user gets back the
    // extent or greater.
    if (payoutRule.kind === 'offerExactly') {
      return extentOpsArray[i].equals(extents[i], payoutRule.units.extent);
    }
    if (payoutRules.kind === 'offerAtMost') {
      return extentOpsArray[i].includes(extents[i], payoutRule.units.extent);
    }
    // If the kind is something else, anything we give back is fine.
    return true;
  });

  // For this allocation to count as a full payout of what the user
  // wanted, their allocated extents must be greater than or equal to
  // what the payoutRules said they wanted.
  const winningsOk = payoutRules.every((payoutRule, i) => {
    if (payoutRule === null || payoutRule === undefined) {
      throw new Error(`payoutRule must be specified`);
    }
    insist(
      allowedRules.includes(payoutRule.kind),
    )`The kind ${payoutRule.kind} was not recognized`;
    // If the kind was 'wantExactly', we should make sure that the
    // user gets exactly the extent specified in their winnings. If
    // the kind is 'wantAtLeast', we need to ensure that the user
    // gets back winnings that are equal or greater to the extent.
    if (payoutRule.kind === 'wantExactly') {
      return extentOpsArray[i].equals(extents[i], payoutRule.units.extent);
    }
    if (payoutRule.kind === 'wantAtLeast') {
      return extentOpsArray[i].includes(extents[i], payoutRule.units.extent);
    }
    // If the kind is something else, anything we give back is fine.
    return true;
  });
  return refundOk || winningsOk;
}
/**
 * @param  {extentOps[]} extentOpsArray - an array of extentOps ordered in
 * the same order as the corresponding assays
 * @param  {payoutRules[][]} payoutRulesMatrix - an array of arrays. Each of the
 * element arrays is the offer description that a single player
 * made, in the same order as the corresponding assays.
 * @param  {extent[][]} extentMatrix - an array of arrays. Each of the
 * element arrays is the array of extents that a single player will
 * get, in the same order as the corresponding assays.
 */
const isOfferSafeForAll = (extentOpsArray, payoutRulesMatrix, extentsMatrix) =>
  payoutRulesMatrix.every((payoutRules, i) =>
    isOfferSafeForOffer(extentOpsArray, payoutRules, extentsMatrix[i]),
  );

// `isOfferSafeForOffer` is only exported for testing
export { isOfferSafeForOffer, isOfferSafeForAll };
