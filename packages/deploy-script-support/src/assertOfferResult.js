// @ts-check
import { assert, details as X } from '@agoric/assert';
import { E } from '@endo/far';

/** @type {AssertOfferResult} */
export const assertOfferResult = async (seat, expectedOfferResult) => {
  const actualOfferResult = await E(seat).getOfferResult();
  assert(
    actualOfferResult === expectedOfferResult,
    X`offerResult (${actualOfferResult}) did not equal expected: ${expectedOfferResult}`,
  );
};
