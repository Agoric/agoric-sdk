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

import { AmountMath, AssetKind } from '@agoric/ertp';
import { Far } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';

import { makeZoeStorageManager } from './zoeStorageManager.js';
import { makeStartInstance } from './startInstance.js';
import { makeOffer } from './offer/offer.js';
import { makeInvitationQueryFns } from './invitationQueries.js';
import { setupCreateZCFVat } from './createZCFVat.js';
import { createFeeMint } from './feeMint.js';
import { bindDefaultFeePurse, setupMakeFeePurse } from './feePurse.js';
import { natSafeMath } from '../contractSupport/index.js';

/**
 * Create an instance of Zoe.
 *
 * @param {VatAdminSvc} vatAdminSvc - The vatAdmin Service, which carries the power
 * to create a new vat.
 * @param {ShutdownWithFailure} shutdownZoeVat - a function to
 * shutdown the Zoe Vat. This function needs to use the vatPowers
 * available to a vat.
 * @param {FeeIssuerConfig} feeIssuerConfig
 * @param {ZoeFeesConfig} zoeFees
 * @param {MeteringConfig} meteringConfig
 * @param {string} [zcfBundleName] - The name of the contract facet bundle.
 * @returns {{
 *   zoeService: ZoeService,
 *   feeMintAccess: FeeMintAccess,
 *   initialFeeFunds: Payment,
 *   feeCollectionPurse: Purse,
 * }}
 */
const makeZoeKit = (
  vatAdminSvc,
  shutdownZoeVat = () => {},
  feeIssuerConfig = {
    name: 'RUN',
    assetKind: AssetKind.NAT,
    displayInfo: { decimalPlaces: 6, assetKind: AssetKind.NAT },
    initialFunds: 0n,
  },
  zoeFees = {
    getPublicFacetFee: 0n,
    installFee: 0n,
    startInstanceFee: 0n,
    offerFee: 0n,
  },
  meteringConfig = {
    incrementBy: 25_000_000n,
    initial: 50_000_000n, // executeContract for treasury is 13.5M
    threshold: 25_000_000n,
    price: {
      feeNumerator: 1n,
      computronDenominator: 1n, // default is just one-to-one
    },
  },
  zcfBundleName = undefined,
) => {
  // We must pass the ZoeService to `makeStartInstance` before it is
  // defined. See below where the promise is resolved.
  /** @type {PromiseRecord<ZoeService>} */
  const zoeServicePromiseKit = makePromiseKit();

  const {
    feeMintAccess,
    getFeeIssuerKit,
    feeIssuer,
    feeBrand,
    initialFeeFunds,
  } = createFeeMint(feeIssuerConfig, shutdownZoeVat);

  // The initial funds should be enough to pay for launching the
  // Agoric economy.
  assert(
    AmountMath.isGTE(
      AmountMath.make(feeBrand, feeIssuerConfig.initialFunds),
      AmountMath.add(
        AmountMath.make(feeBrand, zoeFees.installFee),
        AmountMath.make(feeBrand, zoeFees.startInstanceFee),
      ),
    ),
  );

  const getPublicFacetFeeAmount = AmountMath.make(
    feeBrand,
    zoeFees.getPublicFacetFee,
  );
  const installFeeAmount = AmountMath.make(feeBrand, zoeFees.installFee);
  const startInstanceFeeAmount = AmountMath.make(
    feeBrand,
    zoeFees.startInstanceFee,
  );
  const offerFeeAmount = AmountMath.make(feeBrand, zoeFees.offerFee);

  const { makeFeePurse, chargeZoeFee, feeCollectionPurse } = setupMakeFeePurse(
    feeIssuer,
  );

  const { multiply, ceilDivide } = natSafeMath;

  const chargeForComputrons = async feePurse => {
    const feeValue = ceilDivide(
      multiply(meteringConfig.incrementBy, meteringConfig.price.feeNumerator),
      meteringConfig.price.computronDenominator,
    );
    const feeToCharge = AmountMath.make(feeBrand, feeValue);
    await chargeZoeFee(feePurse, feeToCharge);
    return meteringConfig.incrementBy;
  };

  // This method contains the power to create a new ZCF Vat, and must
  // be closely held. vatAdminSvc is even more powerful - any vat can
  // be created. We severely restrict access to vatAdminSvc for this reason.
  const createZCFVat = setupCreateZCFVat(
    vatAdminSvc,
    meteringConfig.initial,
    meteringConfig.threshold,
    zcfBundleName,
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
    getInstallationForInstance,
    getInstanceAdmin,
    invitationIssuer,
  } = makeZoeStorageManager(
    createZCFVat,
    getFeeIssuerKit,
    shutdownZoeVat,
    chargeZoeFee,
    getPublicFacetFeeAmount,
    installFeeAmount,
    chargeForComputrons,
  );

  // Pass the capabilities necessary to create E(zoe).startInstance
  const startInstance = makeStartInstance(
    zoeServicePromiseKit.promise,
    makeZoeInstanceStorageManager,
    unwrapInstallation,
    chargeZoeFee,
    startInstanceFeeAmount,
  );

  // Pass the capabilities necessary to create E(zoe).offer
  const offer = makeOffer(
    invitationIssuer,
    getInstanceAdmin,
    depositPayments,
    getAssetKindByBrand,
    chargeZoeFee,
    offerFeeAmount,
  );

  // Make the methods that allow users to easily and credibly get
  // information about their invitations.
  const {
    getInstance,
    getInstallation,
    getInvitationDetails,
  } = makeInvitationQueryFns(invitationIssuer);

  /** @type {ZoeServiceFeePurseRequired} */
  const zoeService = Far('zoeServiceFeePurseRequired', {
    install,
    startInstance,
    offer,
    makeFeePurse,
    bindDefaultFeePurse: defaultFeePurse =>
      bindDefaultFeePurse(zoeService, defaultFeePurse),
    getPublicFacet,

    // The functions below are getters only and have no impact on
    // state within Zoe
    getInvitationIssuer: async () => invitationIssuer,
    getFeeIssuer: async () => feeIssuer,
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

  return harden({
    zoeService,
    feeMintAccess,
    initialFeeFunds,
    feeCollectionPurse,
  });
};

export { makeZoeKit };
