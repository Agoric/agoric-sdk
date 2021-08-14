// @ts-check

import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';

const { details: X } = assert;

/**
 *
 * @param {Issuer} feeIssuer
 * @returns {{
 *   makeFeePurse: MakeFeePurse
 *   chargeZoeFee: ChargeZoeFee,
 *   getFeeCollectionPurse: GetFeeCollectionPurse,
 * }}
 */
const setupMakeFeePurse = feeIssuer => {
  const feePurses = new WeakSet();

  const collectionPurse = feeIssuer.makeEmptyPurse();

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

  /** @type {ChargeZoeFee} */
  const chargeZoeFee = (feePurse, feeAmount) => {
    return E.when(feePurse, fp => {
      assert(feePurses.has(fp), X`A feePurse must be provided, not ${fp}`);
      collectionPurse.deposit(fp.withdraw(feeAmount));
    });
  };

  /** @type {GetFeeCollectionPurse} */
  const getFeeCollectionPurse = () => collectionPurse;

  return {
    makeFeePurse,
    chargeZoeFee,
    getFeeCollectionPurse,
  };
};

const bindDefaultFeePurse = (zoeService, defaultFeePurse) =>
  Far('bound zoeService', {
    // The functions from zoe not overridden below have no impact on
    // state within Zoe
    ...zoeService,

    install: (bundle, feePurse = defaultFeePurse) =>
      zoeService.install(bundle, feePurse),
    startInstance: (
      installation,
      issuerKeywordRecord,
      terms,
      privateArgs,
      feePurse = defaultFeePurse,
    ) =>
      zoeService.startInstance(
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
      zoeService.offer(
        invitation,
        proposal,
        paymentKeywordRecord,
        offerArgs,
        feePurse,
      ),
    getPublicFacet: (instance, feePurse = defaultFeePurse) =>
      zoeService.getPublicFacet(instance, feePurse),
  });

harden(setupMakeFeePurse);
harden(bindDefaultFeePurse);
export { setupMakeFeePurse, bindDefaultFeePurse };
