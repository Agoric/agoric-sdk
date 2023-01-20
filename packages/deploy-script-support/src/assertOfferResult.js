import { Fail } from '@agoric/assert';
import { E } from '@endo/far';

/**
 * @param {ERef<UserSeat>} seat
 * @param {string} expectedOfferResult
 * @returns {Promise<void>}
 */
export const assertOfferResult = async (seat, expectedOfferResult) => {
  const actualOfferResult = await E(seat).getOfferResult();
  actualOfferResult === expectedOfferResult ||
    Fail`offerResult (${actualOfferResult}) did not equal expected: ${expectedOfferResult}`;
};
