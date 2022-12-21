/**
 * Zoe uses ERTP, the Electronic Rights Transfer Protocol
 *
 * A note about ERTP AssetKinds: Within Zoe, the assetKind of
 * validated amounts must be consistent with the brand's assetKind.
 * This is stricter than the validation provided by AmountMath
 * currently. When the brand has an assetKind itself, AmountMath will
 * validate that.
 */
// Ambient types. https://github.com/Agoric/agoric-sdk/issues/6512
import '@agoric/ertp/exported.js';
import '@agoric/store/exported.js';
import '@agoric/vats/exported.js';

import '../internal-types.js';

import { E } from '@endo/eventual-send';
import {
  makeScalarBigMapStore,
  vivifyFarClassKit,
  provide,
} from '@agoric/vat-data';

import { makeZoeStorageManager } from './zoeStorageManager.js';
import { makeStartInstance } from './startInstance.js';
import { makeOfferMethod } from './offer/offer.js';
import { makeInvitationQueryFns } from './invitationQueries.js';
import { getZcfBundleCap, setupCreateZCFVat } from './createZCFVat.js';
import { defaultFeeIssuerConfig, vivifyFeeMint } from './feeMint.js';
import { ZoeServiceIKit } from '../typeGuards.js';

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
 */
const makeZoeKit = (
  vatAdminSvc,
  shutdownZoeVat = () => {},
  feeIssuerConfig = defaultFeeIssuerConfig,
  zcfSpec = { name: 'zcf' },
  zoeBaggage = makeScalarBigMapStore('zoe baggage', { durable: true }),
) => {
  let zoeService;

  const feeMintKit = vivifyFeeMint(zoeBaggage, feeIssuerConfig, shutdownZoeVat);

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
    () => invitationIssuerAccess.getInvitationIssuer(),
    () => zoeService,
  );
  const getBundleCapByIdNow = id => E(vatAdminSvc).getBundleCap(id);

  // The ZoeStorageManager composes and consolidates capabilities
  // needed by Zoe according to POLA.
  const {
    zoeServiceDataAccess,
    makeOfferAccess,
    startInstanceAccess,
    invitationIssuerAccess,
  } = makeZoeStorageManager(
    createZCFVat,
    getBundleCapForID,
    shutdownZoeVat,
    feeMintKit.feeMint,
    zoeBaggage,
  );

  // Pass the capabilities necessary to create E(zoe).startInstance
  const startInstance = makeStartInstance(
    startInstanceAccess,
    zcfBundleCap,
    getBundleCapByIdNow,
    zoeBaggage,
  );

  // Pass the capabilities necessary to create E(zoe).offer
  const offer = makeOfferMethod(makeOfferAccess);

  // Make the methods that allow users to easily and credibly get
  // information about their invitations.

  const invitationIssuer = invitationIssuerAccess.getInvitationIssuer();
  const { getInstance, getInstallation, getInvitationDetails } =
    makeInvitationQueryFns(invitationIssuer);

  const getConfiguration = () => {
    return harden({
      feeIssuerConfig,
    });
  };

  const makeZoeService = vivifyFarClassKit(
    zoeBaggage,
    'ZoeService',
    ZoeServiceIKit,
    dataAccess => ({ dataAccess }),
    {
      /** @type {ZoeService} */
      zoeService: {
        install(bundleId) {
          const { state } = this;
          return state.dataAccess.installBundle(bundleId);
        },
        installBundleID(bundleId) {
          const { state } = this;
          return state.dataAccess.installBundleID(bundleId);
        },
        startInstance,
        offer,
        setOfferFilter(instance, filters) {
          const { state } = this;
          state.dataAccess.setOfferFilter(instance, filters);
        },

        // The functions below are getters only and have no impact on
        // state within Zoe
        getOfferFilter(instance) {
          const { state } = this;
          return state.dataAccess.getOfferFilter(instance);
        },
        async getInvitationIssuer() {
          const { state } = this;
          return state.dataAccess.getInvitationIssuer();
        },
        async getFeeIssuer() {
          return feeMintKit.feeMint.getFeeIssuer();
        },

        getBrands(instance) {
          const { state } = this;
          return state.dataAccess.getBrands(instance);
        },
        getIssuers(instance) {
          const { state } = this;
          return state.dataAccess.getIssuers(instance);
        },
        getPublicFacet(instance) {
          const { state } = this;
          return state.dataAccess.getPublicFacet(instance);
        },
        getTerms(instance) {
          const { state } = this;
          return state.dataAccess.getTerms(instance);
        },
        getInstallationForInstance(instance) {
          const { state } = this;
          return state.dataAccess.getInstallationForInstance(instance);
        },
        getBundleIDFromInstallation(installation) {
          const { state } = this;
          return state.dataAccess.getBundleIDFromInstallation(installation);
        },
        getInstallation,

        getInstance(invitation) {
          return getInstance(invitation);
        },
        getConfiguration,
        getInvitationDetails,
        getProposalShapeForInvitation(invitation) {
          const { state } = this;
          return state.dataAccess.getProposalShapeForInvitation(invitation);
        },
      },
      feeMintAccessRetriever: {
        /** @type {() => FeeMintAccess} */
        get() {
          // @ts-expect-error type cast
          return feeMintKit.feeMintAccess;
        },
      },
    },
  );

  const zoeServices = provide(zoeBaggage, 'zoe', () =>
    makeZoeService(zoeServiceDataAccess),
  );
  zoeService = zoeServices.zoeService;
  return zoeServices;
};

export { makeZoeKit };
/**
 * @typedef {ReturnType<typeof makeZoeKit>} ZoeKit
 */
