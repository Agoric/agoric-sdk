// @ts-check

import { E } from '@agoric/eventual-send';

/**
 * Partially apply an already existing chargeAccount to Zoe methods.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<ChargeAccount>} chargeAccount
 * @returns {ZoeServiceWChargeAccount}
 */
const applyChargeAccount = (zoe, chargeAccount) => {
  return {
    makeChargeAccount: (...args) => E(zoe).makeChargeAccount(...args),

    // A chargeAccount is required
    install: (...args) => E(zoe).install(chargeAccount, ...args),
    startInstance: (...args) => E(zoe).startInstance(chargeAccount, ...args),
    offer: (...args) => E(zoe).offer(chargeAccount, ...args),
    getPublicFacet: (...args) => E(zoe).getPublicFacet(chargeAccount, ...args),

    // The functions below are getters only and have no impact on
    // state within Zoe
    getInvitationIssuer: () => E(zoe).getInvitationIssuer(),
    getRunIssuer: () => E(zoe).getRunIssuer(),
    getBrands: (...args) => E(zoe).getBrands(...args),
    getIssuers: (...args) => E(zoe).getIssuers(...args),
    getTerms: (...args) => E(zoe).getTerms(...args),
    getInstance: (...args) => E(zoe).getInstance(...args),
    getInstallation: (...args) => E(zoe).getInstallation(...args),
    getInvitationDetails: (...args) => E(zoe).getInvitationDetails(...args),
  };
};

/**
 * Make a new charge account and then partially apply it to Zoe methods.
 *
 * @param {ZoeService} zoe
 * @returns {ZoeServiceWChargeAccount}
 */
const useChargeAccount = zoe => {
  const chargeAccount = E(zoe).makeChargeAccount();
  return applyChargeAccount(zoe, chargeAccount);
};

harden(applyChargeAccount);
harden(useChargeAccount);
export { applyChargeAccount, useChargeAccount };
