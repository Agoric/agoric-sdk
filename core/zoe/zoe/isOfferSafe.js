import { insist } from '../../../util/insist';

/**
 * `isOfferSafeForPlayer` checks offer-safety for a single player.
 *
 * Note: This implementation checks whether we refund for all rules or
 * return winnings for all rules. It does not allow some refunds and
 * some winnings, which is what would happen if you checked the rules
 * independently. It *does* allow for returning a full refund plus
 * full winnings.
 *
 * @param  {extentOps[]} extentOps - an array of extentOps ordered in
 * the same order as the corresponding assays
 * @param  {payoutRule[]} payoutRules - the offer description, an
 * array of objects that have a kind and assetDesc, in the same order as
 * the corresponding assays. The offer description is a player's
 * understanding of the contract that they are entering when they make
 * an offer. PayoutRulesElements are structured in the form `{ kind:
 * descriptionString, assetDesc}`
 * @param  {extent[]} extents - an array of extents ordered in
 * the same order as the corresponding assays. This array of extents
 * is the reallocation to be given to a player.
 */
function isOfferSafeForPlayer(extentOps, payoutRules, extents) {
  insist(
    extentOps.length === payoutRules.length &&
      extentOps.length === extents.length,
  )`extentOps, the offer description, and extents must be arrays of the same length`;

  const allowedRules = [
    'offerExactly',
    'offerAtMost',
    'wantExactly',
    'wantAtLeast',
  ];

  // If we are refunding the player, are their allocated assetDescs
  // greater than or equal to what they said they had at the beginning?
  const refundOk = payoutRules.every((payoutRule, i) => {
    if (payoutRule === null || payoutRule === undefined) {
      return true;
    }
    insist(
      allowedRules.includes(payoutRule.kind),
    )`The kind ${payoutRule.kind} was not recognized`;
    // If the kind was 'offerExactly', we should make sure that the
    // user gets it back exactly in a refund. If the kind is
    // 'offerAtMost' we need to ensure that the user gets back the
    // assetDesc or greater. If the kind is something else, anything
    // we give back is fine.
    if (payoutRule.kind === 'offerExactly') {
      return extentOps[i].equals(extents[i], payoutRule.assetDesc.extent);
    }
    if (payoutRules.kind === 'offerAtMost') {
      return extentOps[i].includes(extents[i], payoutRule.assetDesc.extent);
    }
    return true;
  }, true);

  // If we are not refunding the player, are their allocated assetDescs
  // greater than or equal to what they said they wanted at the beginning?
  const winningsOk = payoutRules.every((payoutRule, i) => {
    if (payoutRule === null || payoutRule === undefined) {
      return true;
    }
    insist(
      allowedRules.includes(payoutRule.kind),
    )`The kind ${payoutRule.kind} was not recognized`;
    // If the kind was 'wantExactly', we should make sure that the
    // user gets exactly the assetDesc specified in their winnings. If
    // the kind is 'wantAtLeast', we need to ensure that the user
    // gets back winnings that are equal or greater to the assetDesc.
    // If the kind is something else, anything we give back is fine.
    if (payoutRule.kind === 'wantExactly') {
      return extentOps[i].equals(extents[i], payoutRule.assetDesc.extent);
    }
    if (payoutRule.kind === 'wantAtLeast') {
      return extentOps[i].includes(extents[i], payoutRule.assetDesc.extent);
    }
    return true;
  }, true);

  return refundOk || winningsOk;
}
/**
 * @param  {extentOps[]} extentOps - an array of extentOps ordered in
 * the same order as the corresponding assays
 * @param  {payoutRules[][]} payoutRulesMatrix - an array of arrays. Each of the
 * element arrays is the offer description that a single player
 * made, in the same order as the corresponding assays.
 * @param  {extent[][]} extentMatrix - an array of arrays. Each of the
 * element arrays is the array of extents that a single player will
 * get, in the same order as the corresponding assays.
 */
const isOfferSafeForAll = (extentOps, payoutRulesMatrix, extentsMatrix) =>
  payoutRulesMatrix.every(
    (payoutRules, i) =>
      isOfferSafeForPlayer(extentOps, payoutRules, extentsMatrix[i]),
    true,
  );

export { isOfferSafeForPlayer, isOfferSafeForAll };
