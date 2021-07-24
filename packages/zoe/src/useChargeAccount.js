// @ts-check

import { E } from '@agoric/eventual-send';

/**
 * Partially apply an already existing chargeAccount to Zoe methods.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<ChargeAccount>} chargeAccount
 * @returns {{ chargeAccount: ChargeAccount, zoe: ZoeServiceWChargeAccount}}
 */
const applyChargeAccount = (zoe, chargeAccount) => {
  const wrappedZoe = harden({
    makeChargeAccount: (...args) => E(zoe).makeChargeAccount(...args),

    // A chargeAccount is required
    install: (...args) => E(zoe).install(chargeAccount, ...args),
    startInstance: (...args) => E(zoe).startInstance(chargeAccount, ...args),
    offer: (...args) => E(zoe).offer(chargeAccount, ...args),
    getPublicFacet: (...args) => E(zoe).getPublicFacet(chargeAccount, ...args),

    // The functions below are getters only and have no impact on
    // state within Zoe
    getInvitationIssuer: () => E(zoe).getInvitationIssuer(),
    getFeeIssuer: () => E(zoe).getFeeIssuer(),
    getBrands: (...args) => E(zoe).getBrands(...args),
    getIssuers: (...args) => E(zoe).getIssuers(...args),
    getTerms: (...args) => E(zoe).getTerms(...args),
    getInstance: (...args) => E(zoe).getInstance(...args),
    getInstallation: (...args) => E(zoe).getInstallation(...args),
    getInvitationDetails: (...args) => E(zoe).getInvitationDetails(...args),
  });
  return harden({
    chargeAccount,
    zoe: wrappedZoe,
  });
};

/**
 * Make a new charge account and then partially apply it to Zoe methods.
 *
 * @param {ZoeService} zoe
 * @returns {{ chargeAccount: ChargeAccount, zoe: ZoeServiceWChargeAccount}}
 */
const useChargeAccount = zoe => {
  const chargeAccount = E(zoe).makeChargeAccount();
  return applyChargeAccount(zoe, chargeAccount);
};

/**
 * Create a new copy of an object that charges a fee according to a
 * menu before calling the original object's matching method. The menu
 * acts as an allow-list for which of the object's methods are copied
 * to the new object.
 *
 * @param {Object} obj
 * @param {ERef<ChargeAccount>} chargeAccount
 * @param {Menu} menu
 * @returns {Object}
 */
const applyCAToObj = (obj, chargeAccount, menu) => {
  const chargeFee = (_chargeAccount, _price) => {};
  const allowedMethodsAndPrices = Object.entries(menu);

  // objectMap hardens, but we want to harden afterward, so we cannot
  // use it.
  const wrappedObj = Object.fromEntries(
    allowedMethodsAndPrices.map(([methodName, price]) => {
      const fn = (...args) => {
        chargeFee(chargeAccount, price);
        // Call the original method with the arguments, after charging
        // the fee.
        return E(obj)[methodName](...args);
      };
      return [methodName, fn];
    }),
  );

  // Add a method to get the menu
  wrappedObj.getMenu = async () => menu;

  return harden(wrappedObj);
};

harden(applyChargeAccount);
harden(useChargeAccount);
harden(applyCAToObj);
export { applyChargeAccount, useChargeAccount, applyCAToObj };
