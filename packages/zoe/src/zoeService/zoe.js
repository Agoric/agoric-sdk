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

import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { makeZoeStorageManager } from './zoeStorageManager.js';
import { makeStartInstance } from './startInstance.js';
import { makeOfferMethod } from './offer/offer.js';
import { makeInvitationQueryFns } from './invitationQueries.js';
import { getZcfBundleCap, setupCreateZCFVat } from './createZCFVat.js';
import { vivifyFeeMint, defaultFeeIssuerConfig } from './feeMint.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * Create an instance of Zoe.
 *
 * @param {VatAdminSvc} vatAdminSvc - The vatAdmin Service, which carries the power
 * to create a new vat.
 * @param {ShutdownWithFailure} shutdownZoeVat - a function to
 * shutdown the Zoe Vat. This function needs to use the vatPowers
 * available to a vat.
 * @param {FeeIssuerConfig} feeIssuerConfig
 * @param {ZCFSpec} [zcfSpec] - Pointer to the contract facet bundle.
 * @param {Baggage} [zoeBaggage]
 * @returns {{
 *   zoeService: ZoeService,
 *   feeMintAccess: FeeMintAccess,
 * }}
 */
const makeZoeKit = (
  vatAdminSvc,
  shutdownZoeVat = () => {},
  feeIssuerConfig = defaultFeeIssuerConfig,
  zcfSpec = { name: 'zcf' },
  zoeBaggage = makeScalarBigMapStore('zoe baggage', { durable: true }),
) => {
  const feeMint = vivifyFeeMint(zoeBaggage, feeIssuerConfig, shutdownZoeVat);

  /** @type {GetBundleCapForID} */
  const getBundleCapForID = bundleID =>
    E(vatAdminSvc).waitForBundleCap(bundleID);

  const zcfBundleCap = getZcfBundleCap(zcfSpec, vatAdminSvc);
  // This method contains the power to create a new ZCF Vat, and must
  // be closely held. vatAdminSvc is even more powerful - any vat can
  // be created. We severely restrict access to vatAdminSvc for this reason.
  const createZCFVat = setupCreateZCFVat(
    vatAdminSvc,
    zcfBundleCap,
    // eslint-disable-next-line no-use-before-define
    () => invitationIssuer,
    // eslint-disable-next-line no-use-before-define
    () => zoeService,
  );
  const getBundleCapByIdNow = id => E(vatAdminSvc).getBundleCap(id);

  // The ZoeStorageManager composes and consolidates capabilities
  // needed by Zoe according to POLA.
  const {
    depositPayments,
    getAssetKindByBrand,
    makeZoeInstanceStorageManager,
    installBundle,
    installBundleID,
    unwrapInstallation,
    getBundleIDFromInstallation,
    getPublicFacet,
    getBrands,
    getIssuers,
    getTerms,
    getOfferFilter,
    getInstallationForInstance,
    getInstanceAdmin,
    invitationIssuer,
    getProposalSchemaForInvitation,
  } = makeZoeStorageManager(
    createZCFVat,
    getBundleCapForID,
    feeMintAccess => feeMint.getFeeIssuerKit(feeMintAccess),
    shutdownZoeVat,
    feeMint.getFeeIssuer(),
    feeMint.getFeeBrand(),
    zoeBaggage,
  );

  // Pass the capabilities necessary to create E(zoe).startInstance
  const startInstance = makeStartInstance(
    makeZoeInstanceStorageManager,
    unwrapInstallation,
    zcfBundleCap,
    getBundleCapByIdNow,
  );

  // Pass the capabilities necessary to create E(zoe).offer
  const offer = makeOfferMethod(
    invitationIssuer,
    getInstanceAdmin,
    depositPayments,
    getAssetKindByBrand,
    getProposalSchemaForInvitation,
  );

  // Make the methods that allow users to easily and credibly get
  // information about their invitations.
  const { getInstance, getInstallation, getInvitationDetails } =
    makeInvitationQueryFns(invitationIssuer);

  const getConfiguration = () => {
    return harden({
      feeIssuerConfig,
    });
  };

  /** @type {ZoeService} */
  const zoeService = Far('zoeService', {
    install: installBundle,
    installBundleID,
    startInstance,
    offer,
    /**
     * @deprecated Useless but provided during transition to keep old
     * code from breaking.
     */
    makeFeePurse: async () => feeMint.getFeeIssuer().makeEmptyPurse(),
    /**
     * @deprecated Useless but provided during transition to keep old
     * code from breaking.
     * @param {ERef<Purse>} _defaultFeePurse
     */
    bindDefaultFeePurse: _defaultFeePurse => zoeService,
    getPublicFacet,

    // The functions below are getters only and have no impact on
    // state within Zoe
    getInvitationIssuer: async () => invitationIssuer,
    getFeeIssuer: async () => feeMint.getFeeIssuer(),
    getBrands,
    getIssuers,
    getTerms,
    getOfferFilter,
    getInstallationForInstance,
    getInstance,
    getInstallation,
    getInvitationDetails,
    getConfiguration,
    getBundleIDFromInstallation,
    getProposalSchemaForInvitation,
  });

  return harden({
    zoeService,
    feeMintAccess: feeMint.getFeeMintAccess(),
  });
};

export { makeZoeKit };
/**
 * @typedef {ReturnType<typeof makeZoeKit>} ZoeKit
 */
