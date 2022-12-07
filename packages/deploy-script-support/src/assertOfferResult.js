import { Fail } from '@agoric/assert';
import { E } from '@endo/far';

/** @type {AssertOfferResult} */
export const assertOfferResult = async (seat, expectedOfferResult) => {
  const actualOfferResult = await E(seat).getOfferResult();
  actualOfferResult === expectedOfferResult ||
    Fail`offerResult (${actualOfferResult}) did not equal expected: ${expectedOfferResult}`;
};
