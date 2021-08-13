// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

/**
 * Partially apply an already existing feePurse to Zoe methods.
 *
 * @param {ERef<ZoeServiceFeePurseRequired>} zoe
 * @param {ERef<FeePurse>} defaultFeePurse
 * @returns {ZoeService}
 */
const applyFeePurse = (zoe, defaultFeePurse) => {
  return Far('zoeService', {
    makeFeePurse: (...args) => E(zoe).makeFeePurse(...args),

    // A feePurse is required
    install: (bundle, feePurse = defaultFeePurse) =>
      E(zoe).install(bundle, feePurse),
    startInstance: (
      installation,
      issuerKeywordRecord,
      terms,
      privateArgs,
      feePurse = defaultFeePurse,
    ) =>
      E(zoe).startInstance(
        installation,
        issuerKeywordRecord,
        terms,
        privateArgs,
        feePurse,
      ),
    offer: (
      invitation,
      proposal,
      paymentKeywordRecord,
      offerArgs,
      feePurse = defaultFeePurse,
    ) =>
      E(zoe).offer(
        invitation,
        proposal,
        paymentKeywordRecord,
        offerArgs,
        feePurse,
      ),
    getPublicFacet: (instance, feePurse = defaultFeePurse) =>
      E(zoe).getPublicFacet(instance, feePurse),

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
    getInstallationForInstance: (...args) =>
      E(zoe).getInstallationForInstance(...args),
  });
};

/**
 * Make a new feePurse and then partially apply it to Zoe methods.
 *
 * @param {ZoeServiceFeePurseRequired} zoe
 * @returns {{ zoeService: ZoeService, feePurse: Promise<FeePurse> }}
 */
const makeAndApplyFeePurse = zoe => {
  const feePurse = E(zoe).makeFeePurse();
  return harden({ zoeService: applyFeePurse(zoe, feePurse), feePurse });
};

harden(applyFeePurse);
harden(makeAndApplyFeePurse);
export { applyFeePurse, makeAndApplyFeePurse };
