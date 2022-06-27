// @ts-check
const { details: X } = assert;
import { E } from '@endo/far';

/** @type {AssertOfferResult} */
export const assertOfferResult = async (seat, expectedOfferResult) => {
  const actualOfferResult = await E(seat).getOfferResult();
  assert(
    actualOfferResult === expectedOfferResult,
    X`offerResult (${actualOfferResult}) did not equal expected: ${expectedOfferResult}`,
  );
};
