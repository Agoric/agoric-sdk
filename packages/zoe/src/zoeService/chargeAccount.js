// @ts-check

import { Far } from '@agoric/marshal';

/**
 *
 * @param {Issuer} runIssuer
 * @returns {{
 *   makeChargeAccount: MakeChargeAccount
 *   hasChargeAccount: (ca: ChargeAccount) => boolean
 * }}
 */
const makeMakeChargeAccount = runIssuer => {
  const chargeAccounts = new WeakSet();

  /** @type {MakeChargeAccount} */
  const makeChargeAccount = () => {
    const purse = runIssuer.makeEmptyPurse();
    /** @type {ChargeAccount} */
    const chargeAccount = Far('chargeAccount', {
      ...purse,
    });
    chargeAccounts.add(chargeAccount);

    // After keeping the purse methods, we throw away the purse
    return chargeAccount;
  };

  /**
   * @param {ChargeAccount} ca
   */
  const hasChargeAccount = ca => chargeAccounts.has(ca);

  return {
    makeChargeAccount,
    hasChargeAccount,
  };
};

harden(makeMakeChargeAccount);
export { makeMakeChargeAccount };
