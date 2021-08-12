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
import '@agoric/ertp/exported.js';
import '@agoric/store/exported.js';

import '../../exported.js';
import '../internal-types.js';

import { Far } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';
import { AssetKind } from '@agoric/ertp';

import { makeZoeStorageManager } from './zoeStorageManager.js';
import { makeStartInstance } from './startInstance.js';
import { makeOffer } from './offer/offer.js';
import { makeInvitationQueryFns } from './invitationQueries.js';
import { setupCreateZCFVat } from './createZCFVat.js';
import { createFeeMint } from './feeMint.js';

/**
 * Create an instance of Zoe.
 *
 * @param {VatAdminSvc} vatAdminSvc - The vatAdmin Service, which carries the power
 * to create a new vat.
 * @param {FeeIssuerConfig} feeIssuerConfig
 * @param {string} [zcfBundleName] - The name of the contract facet bundle.
 * @returns {{ zoeService: ZoeService, feeMintAccess: FeeMintAccess }}
 */
const makeZoeKit = (
  vatAdminSvc,
  feeIssuerConfig = {
    name: 'RUN',
    assetKind: AssetKind.NAT,
    displayInfo: { decimalPlaces: 6, assetKind: AssetKind.NAT },
  },
  zcfBundleName = undefined,
) => {
  // We must pass the ZoeService to `makeStartInstance` before it is
  // defined. See below where the promise is resolved.
  /** @type {PromiseRecord<ZoeService>} */
  const zoeServicePromiseKit = makePromiseKit();

  const { feeMintAccess, getFeeIssuerKit, feeIssuer } = createFeeMint(
    feeIssuerConfig,
  );

  // This method contains the power to create a new ZCF Vat, and must
  // be closely held. vatAdminSvc is even more powerful - any vat can
  // be created. We severely restrict access to vatAdminSvc for this reason.
  const createZCFVat = setupCreateZCFVat(vatAdminSvc, zcfBundleName);

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
    getInstallationForInstance,
    getInstanceAdmin,
    invitationIssuer,
  } = makeZoeStorageManager(createZCFVat, getFeeIssuerKit);

  // Pass the capabilities necessary to create zoe.startInstance
  const startInstance = makeStartInstance(
    zoeServicePromiseKit.promise,
    makeZoeInstanceStorageManager,
    unwrapInstallation,
  );

  // Pass the capabilities necessary to create zoe.offer
  const offer = makeOffer(
    invitationIssuer,
    getInstanceAdmin,
    depositPayments,
    getAssetKindByBrand,
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
    install,
    startInstance,
    offer,

    // The functions below are getters only and have no impact on
    // state within Zoe
    getInvitationIssuer: () => invitationIssuer,
    getFeeIssuer: () => feeIssuer,
    getPublicFacet,
    getBrands,
    getIssuers,
    getTerms,
    getInstallationForInstance,
    getInstance,
    getInstallation,
    getInvitationDetails,
  });

  // startInstance must pass the ZoeService to the newly created ZCF
  // vat, but the zoeService is not yet defined when startInstance is
  // defined. So, we pass a promise and then resolve the promise here.
  zoeServicePromiseKit.resolve(zoeService);

  return harden({ zoeService, feeMintAccess });
};

export { makeZoeKit };
