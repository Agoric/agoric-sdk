import { assert, details as X } from '@agoric/assert';
import { E } from '@endo/far';

/** @type {AssertOfferResult} */
export const assertOfferResult = async (seat, expectedOfferResult) => {
  const actualOfferResult = await E(seat).getOfferResult();
  actualOfferResult === expectedOfferResult ||
    assert.fail(
      X`offerResult (${actualOfferResult}) did not equal expected: ${expectedOfferResult}`,
    );
};
