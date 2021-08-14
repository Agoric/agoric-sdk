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
import { E } from '@agoric/eventual-send';

import { makeZoeStorageManager } from './zoeStorageManager.js';
import { makeStartInstance } from './startInstance.js';
import { makeOffer } from './offer/offer.js';
import { makeInvitationQueryFns } from './invitationQueries.js';
import { setupCreateZCFVat } from './createZCFVat.js';
import { createFeeMint } from './feeMint.js';
import { bindDefaultFeePurse, setupMakeFeePurse } from './feePurse.js';
import { makeChargeForComputrons } from './chargeForComputrons.js';
import { HIGH_FEE, LONG_EXP, LOW_FEE, SHORT_EXP } from '../constants.js';

const { details: X } = assert;

/**
 * Create an instance of Zoe.
 *
 * @param {VatAdminSvc} vatAdminSvc - The vatAdmin Service, which carries the power
 * to create a new vat.
 * @param {ShutdownWithFailure} shutdownZoeVat - a function to
 * shutdown the Zoe Vat. This function needs to use the vatPowers
 * available to a vat.
 * @param {FeeIssuerConfig} feeIssuerConfig
 * @param {ZoeFeesConfig} zoeFeesConfig
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
  zoeFeesConfig = {
    getPublicFacetFee: 0n,
    installFee: 0n,
    startInstanceFee: 0n,
    offerFee: 0n,
    timeAuthority: undefined,
    lowFee: 500_000n,
    highFee: 10_000_000n,
    shortExp: 1000n * 60n * 5n, // 5 min in milliseconds
    longExp: 1000n * 60n * 60n * 24n * 1n, // 1 day in milliseconds
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
        AmountMath.make(feeBrand, zoeFeesConfig.installFee),
        AmountMath.make(feeBrand, zoeFeesConfig.startInstanceFee),
      ),
    ),
  );

  const getPublicFacetFeeAmount = AmountMath.make(
    feeBrand,
    zoeFeesConfig.getPublicFacetFee,
  );
  const installFeeAmount = AmountMath.make(feeBrand, zoeFeesConfig.installFee);
  const startInstanceFeeAmount = AmountMath.make(
    feeBrand,
    zoeFeesConfig.startInstanceFee,
  );
  const offerFeeAmount = AmountMath.make(feeBrand, zoeFeesConfig.offerFee);

  const { makeFeePurse, chargeZoeFee, feeCollectionPurse } = setupMakeFeePurse(
    feeIssuer,
  );

  // This method contains the power to create a new ZCF Vat, and must
  // be closely held. vatAdminSvc is even more powerful - any vat can
  // be created. We severely restrict access to vatAdminSvc for this reason.
  const createZCFVat = setupCreateZCFVat(
    vatAdminSvc,
    meteringConfig.initial,
    meteringConfig.threshold,
    zcfBundleName,
  );

  const chargeForComputrons = makeChargeForComputrons(
    meteringConfig,
    feeBrand,
    chargeZoeFee,
  );

  /** @type {TranslateFee} */
  const translateFee = relativeFee => {
    if (!relativeFee) {
      return undefined;
    }
    if (relativeFee === LOW_FEE) {
      return AmountMath.make(feeBrand, zoeFeesConfig.lowFee);
    } else if (relativeFee === HIGH_FEE) {
      return AmountMath.make(feeBrand, zoeFeesConfig.highFee);
    }
    assert.fail(X`relativeFee ${relativeFee} was not recognized`);
  };

  /** @type {TranslateExpiry} */
  const translateExpiry = async relativeExpiry => {
    if (!zoeFeesConfig.timeAuthority || !relativeExpiry) {
      return undefined;
    }
    const currentTime = await E(
      zoeFeesConfig.timeAuthority,
    ).getCurrentTimestamp();
    if (relativeExpiry === SHORT_EXP) {
      return currentTime + zoeFeesConfig.shortExp;
    } else if (relativeExpiry === LONG_EXP) {
      return currentTime + zoeFeesConfig.longExp;
    }
    assert.fail(X`relativeExpiry ${relativeExpiry} was not recognized`);
  };

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
    translateFee,
    translateExpiry,
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
    zoeFeesConfig.timeAuthority,
  );

  // Make the methods that allow users to easily and credibly get
  // information about their invitations.
  const {
    getInstance,
    getInstallation,
    getInvitationDetails,
  } = makeInvitationQueryFns(invitationIssuer);

  const getConfiguration = () => {
    return harden({
      feeIssuerConfig,
      zoeFeesConfig,
      meteringConfig,
    });
  };

  /** @type {ZoeServiceFeePurseRequired} */
  const zoeService = Far('zoeServiceFeePurseRequired', {
    install,
    startInstance,
    offer,
    makeFeePurse: async () => makeFeePurse(),
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
    getConfiguration,
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
