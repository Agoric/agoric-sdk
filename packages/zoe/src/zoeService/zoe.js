// @ts-check

/**
 * Zoe uses ERTP, the Electronic Rights Transfer Protocol
 *
 * A note about ERTP AssetKinds: Within Zoe, the assetKind of
 * validated amounts must be consistent with the brand's assetKind.
 * This is stricter than the validation provided by AmountMath
 * currently. When the brand has an assetKind itself, AmountMath will
 * validate that.
 */
import '@agoric/ertp/exported';
import '@agoric/store/exported';

import '../../exported';
import '../internal-types';

import { Far } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';
import { AssetKind, makeIssuerKit } from '@agoric/ertp';

import { makeZoeStorageManager } from './zoeStorageManager';
import { makeStartInstance } from './startInstance';
import { makeOffer } from './offer/offer';
import { makeInvitationQueryFns } from './invitationQueries';
import { setupCreateZCFVat } from './createZCFVat';
import { makeMakeChargeAccount } from './chargeAccount';

/**
 * Create an instance of Zoe.
 *
 * @param {VatAdminSvc} vatAdminSvc - The vatAdmin Service, which carries the power
 * to create a new vat.
 * @param {string} [zcfBundleName] - The name of the contract facet bundle.
 * @returns {{ zoeService: ZoeService, runIssuerKit: IssuerKit}}
 */
const makeZoe = (vatAdminSvc, zcfBundleName = undefined) => {
  // We must pass the ZoeService to `makeStartInstance` before it is
  // defined. See below where the promise is resolved.
  /** @type {PromiseRecord<ZoeService>} */
  const zoeServicePromiseKit = makePromiseKit();

  // This method contains the power to create a new ZCF Vat, and must
  // be closely held. vatAdminSvc is even more powerful - any vat can
  // be created. We severely restrict access to vatAdminSvc for this reason.
  const createZCFVat = setupCreateZCFVat(vatAdminSvc, zcfBundleName);

  const runIssuerKit = makeIssuerKit('RUN', AssetKind.NAT, {
    decimalPlaces: 6,
  });

  const { makeChargeAccount, hasChargeAccount } = makeMakeChargeAccount(
    runIssuerKit.issuer,
  );

  // The ZoeStorageManager composes and consolidates capabilities
  // needed by Zoe according to POLA.
  const {
    depositPayments,
    getAssetKindByBrand,
    makeZoeInstanceStorageManager,
    install,
    unwrapInstallation,
    getPublicFacet,
    getBrands,
    getIssuers,
    getTerms,
    getInstanceAdmin,
    invitationIssuer,
  } = makeZoeStorageManager(createZCFVat, hasChargeAccount);

  // Pass the capabilities necessary to create zoe.startInstance
  const startInstance = makeStartInstance(
    zoeServicePromiseKit.promise,
    makeZoeInstanceStorageManager,
    unwrapInstallation,
    hasChargeAccount,
  );

  // Pass the capabilities necessary to create zoe.offer
  const offer = makeOffer(
    invitationIssuer,
    getInstanceAdmin,
    depositPayments,
    getAssetKindByBrand,
    hasChargeAccount,
  );

  // Make the methods that allow users to easily and credibly get
  // information about their invitations.
  const {
    getInstance,
    getInstallation,
    getInvitationDetails,
  } = makeInvitationQueryFns(invitationIssuer);

  /** @type {ZoeService} */
  const zoeService = Far('zoeService', {
    makeChargeAccount,

    // A chargeAccount is required
    install,
    startInstance,
    offer,
    getPublicFacet,

    // The functions below are getters only and have no impact on
    // state within Zoe
    getInvitationIssuer: () => invitationIssuer,
    getFeeIssuer: () => runIssuerKit.issuer,
    getBrands,
    getIssuers,
    getTerms,
    getInstance,
    getInstallation,
    getInvitationDetails,
  });

  // startInstance must pass the ZoeService to the newly created ZCF
  // vat, but the zoeService is not yet defined when startInstance is
  // defined. So, we pass a promise and then resolve the promise here.
  zoeServicePromiseKit.resolve(zoeService);

  return {
    zoeService,
    runIssuerKit,
  };
};

export { makeZoe };
