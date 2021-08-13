// @ts-check

import { Far } from '@agoric/marshal';

/**
 *
 * @param {Issuer} feeIssuer
 * @returns {{
 *   makeFeePurse: MakeFeePurse
 *   isFeePurse: (feePurse: Purse) => boolean
 * }}
 */
const setupMakeFeePurse = feeIssuer => {
  const feePurses = new WeakSet();

  /** @type {MakeFeePurse} */
  const makeFeePurse = () => {
    const purse = feeIssuer.makeEmptyPurse();
    /** @type {FeePurse} */
    const feePurse = Far('feePurse', {
      ...purse,
    });
    feePurses.add(feePurse);

    // After keeping the purse methods, we throw away the purse
    return feePurse;
  };

  /**
   * @param {Purse} feePurse
   */
  const isFeePurse = feePurse => feePurses.has(feePurse);

  return {
    makeFeePurse,
    isFeePurse,
  };
};

harden(setupMakeFeePurse);
export { setupMakeFeePurse };
