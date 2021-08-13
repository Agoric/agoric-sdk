// @ts-check

import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';

const { details: X } = assert;

/**
 *
 * @param {Issuer} feeIssuer
 * @returns {{
 *   makeFeePurse: MakeFeePurse,
 *   assertFeePurse: AssertFeePurse,
 * }}
 */
const setupMakeFeePurse = feeIssuer => {
  const feePurses = new WeakSet();

  /** @type {MakeFeePurse} */
  const makeFeePurse = async () => {
    const purse = feeIssuer.makeEmptyPurse();
    /** @type {FeePurse} */
    const feePurse = Far('feePurse', {
      ...purse,
    });
    feePurses.add(feePurse);

    // After keeping the purse methods, we throw away the purse
    return feePurse;
  };

  /** @type {IsFeePurse} */
  const isFeePurse = feePurse => E.when(feePurse, fp => feePurses.has(fp));

  /** @type {AssertFeePurse} */
  const assertFeePurse = async feePurse => {
    const feePurseProvided = await isFeePurse(feePurse);
    assert(feePurseProvided, X`A feePurse must be provided, not ${feePurse}`);
  };

  return {
    makeFeePurse,
    assertFeePurse,
  };
};

harden(setupMakeFeePurse);
export { setupMakeFeePurse };
