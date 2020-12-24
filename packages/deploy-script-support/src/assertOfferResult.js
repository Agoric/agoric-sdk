// @ts-check
import { assert, details } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

/** @type {AssertOfferResult} */
export const assertOfferResult = async (seat, expectedOfferResult) => {
  const actualOfferResult = await E(seat).getOfferResult();
  assert(
    actualOfferResult === expectedOfferResult,
    details`offerResult (${actualOfferResult}) did not equal expected: ${expectedOfferResult}`,
  );
};
