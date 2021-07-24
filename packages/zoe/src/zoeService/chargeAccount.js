// @ts-check

import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';

/**
 *
 * @param {Issuer} runIssuer
 * @returns {{
 *   makeChargeAccount: MakeChargeAccount
 *   hasChargeAccount: HasChargeAccount
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
   * @param {ChargeAccount} chargeAccount
   */
  const hasChargeAccount = chargeAccount =>
    E.when(chargeAccount, ca => chargeAccounts.has(ca));

  return {
    makeChargeAccount,
    hasChargeAccount,
  };
};

harden(makeMakeChargeAccount);
export { makeMakeChargeAccount };
