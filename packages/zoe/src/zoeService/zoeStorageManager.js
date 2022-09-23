// @ts-check

import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import {
  makeScalarBigMapStore,
  provideDurableWeakMapStore,
  vivifyFarClassKit,
} from '@agoric/vat-data';
import { initEmpty } from '@agoric/store';

import { provideIssuerStorage } from '../issuerStorage.js';
import { makeAndStoreInstanceRecord } from '../instanceRecordStorage.js';
import { makeIssuerRecord } from '../issuerRecord.js';
import { makeEscrowStorage } from './escrowStorage.js';
import { vivifyInvitationKit } from './makeInvitation.js';
import { makeInstanceAdminStorage } from './instanceAdminStorage.js';
import { makeInstallationStorage } from './installationStorage.js';

import './types.js';
import './internal-types.js';
import {
  InstanceStorageManagerGuard,
  ZoeStorageMangerInterface,
} from '../typeGuards.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * The Zoe Storage Manager encapsulates and composes important
 * capabilities, such as the ability to create a new purse and deposit
 * and withdraw into a purse, according to the Principle of Least
 * Authority. The code for these capabilities is imported from smaller
 * files which should have unit tests. After composing, Zoe Storage
 * Manager divides up the resulting capabilities between those needed
 * by a new contract instance (returned as the result of
 * `makeZoeInstanceStorageManager`) and those needed for other purposes.
 *
 * @param {CreateZCFVat} createZCFVat - the ability to create a new
 * ZCF Vat
 * @param {GetBundleCapForID} getBundleCapForID
 * @param {ShutdownWithFailure} shutdownZoeVat
 * @param {{
 *    getFeeMintAccessToken: () => FeeMintAccess,
 *    getFeeIssuerKit: GetFeeIssuerKit,
 *    getFeeIssuer: () => Issuer,
 *    getFeeBrand: () => Brand,
 * }} feeMint
 * @param {Baggage} [zoeBaggage]
 */
export const makeZoeStorageManager = (
  createZCFVat,
  getBundleCapForID,
  shutdownZoeVat,
  feeMint,
  zoeBaggage = makeScalarBigMapStore('zoe baggage', { durable: true }),
) => {
  // issuerStorage contains the issuers that the ZoeService knows
  // about, as well as information about them such as their brand,
  // assetKind, and displayInfo
  const issuerStorage = provideIssuerStorage(zoeBaggage);
  issuerStorage.instantiate();

  // EscrowStorage holds the purses that Zoe uses for escrow. This
  // object should be closely held and tracked: all of the digital
  // assets that users escrow are contained within these purses.
  const escrowStorage = makeEscrowStorage(zoeBaggage);

  // Add a purse for escrowing user funds (not for fees). Create the
  // local, non-remote escrow purse for the fee mint immediately.
  // Without this step, registration of the feeIssuer in a contract
  // would treat the feeIssuer as if it is remote, creating a promise
  // for a purse with E(issuer).makeEmptyPurse(). We need a local
  // purse, so we cannot allow that to happen.
  escrowStorage.makeLocalPurse(feeMint.getFeeIssuer(), feeMint.getFeeBrand());

  // In order to participate in a contract, users must have
  // invitations, which are ERTP payments made by Zoe. This code
  // contains the mint capability for invitations.
  const { setupMakeInvitation, invitationIssuer } = vivifyInvitationKit(
    zoeBaggage,
    shutdownZoeVat,
  );

  // Every new instance of a contract creates a corresponding
  // "zoeInstanceAdmin" - an admin facet within the Zoe Service for
  // that particular instance. This code manages the storage of those
  // instanceAdmins
  const instanceAdminManager = makeInstanceAdminStorage(zoeBaggage);

  // Zoe stores "installations" - identifiable bundles of contract
  // code that can be reused to create new contract instances
  const installationStorage = makeInstallationStorage(
    getBundleCapForID,
    zoeBaggage,
  );

  const proposalShapes = provideDurableWeakMapStore(
    zoeBaggage,
    'proposal shapes',
  );

  const getProposalShapeForInvitation = invitationHandle => {
    if (proposalShapes.has(invitationHandle)) {
      return proposalShapes.get(invitationHandle);
    }
    return undefined;
  };

  const makeZoeInstanceStorageManager = async (
    instanceBaggage,
    installation,
    customTerms,
    uncleanIssuerKeywordRecord,
    instance,
    contractBundleCap,
  ) => {
    // Clean the issuerKeywordRecord we receive in `startInstance`
    // from the user, and save the issuers in Zoe if they are not
    // already stored there
    const { issuers, brands } = await issuerStorage.storeIssuerKeywordRecord(
      uncleanIssuerKeywordRecord,
    );

    // Create purses for the issuers if they do not already exist
    await Promise.all(
      Object.entries(issuers).map(([keyword, issuer]) =>
        escrowStorage.createPurse(issuer, brands[keyword]),
      ),
    );

    // The instanceRecord is what the contract code is parameterized
    // with: the particular terms, issuers, and brands used in a
    // contract instance based on the installation. A user can query
    // Zoe to find out the installation, terms, issuers, and brands
    // for a contract instance. Contract code has similar query
    // capabilities from the ZCF side.
    const instanceRecordManager = makeAndStoreInstanceRecord(
      instanceBaggage,
      installation,
      instance,
      customTerms,
      issuers,
      brands,
    );

    /** @type {WrapIssuerKitWithZoeMint} */
    const wrapIssuerKitWithZoeMint = (keyword, localIssuerKit) => {
      const {
        mint: localMint,
        issuer: localIssuer,
        brand: localBrand,
        displayInfo: localDisplayInfo,
      } = localIssuerKit;

      const localIssuerRecord = makeIssuerRecord(
        localBrand,
        localIssuer,
        localDisplayInfo,
      );
      issuerStorage.storeIssuerRecord(localIssuerRecord);
      const localPooledPurse = escrowStorage.makeLocalPurse(
        localIssuerRecord.issuer,
        localIssuerRecord.brand,
      );
      instanceRecordManager.addIssuerToInstanceRecord(
        keyword,
        localIssuerRecord,
      );
      /** @type {ZoeMint} */
      const zoeMint = Far('ZoeMint', {
        getIssuerRecord: () => {
          return localIssuerRecord;
        },
        mintAndEscrow: totalToMint => {
          const payment = localMint.mintPayment(totalToMint);
          // Note COMMIT POINT within deposit.
          localPooledPurse.deposit(payment, totalToMint);
        },
        withdrawAndBurn: totalToBurn => {
          // eslint-disable-next-line no-use-before-define
          try {
            // COMMIT POINT
            const payment = localPooledPurse.withdraw(totalToBurn);
            // Note redundant COMMIT POINT within burn.
            localIssuer.burn(payment, totalToBurn);
          } catch (err) {
            // eslint-disable-next-line no-use-before-define
            adminNode.terminateWithFailure(err);
            throw err;
          }
        },
      });
      return zoeMint;
    };

    const makeInvitationImpl = setupMakeInvitation(
      instance,
      installation,
      proposalShapes,
    );

    const { root, adminNode } = await createZCFVat(contractBundleCap);

    const makeISM = vivifyFarClassKit(
      instanceBaggage,
      'InstanceStorageManager',
      InstanceStorageManagerGuard,
      initEmpty,
      {
        instanceStorageManager: {
          getTerms() {
            return instanceRecordManager.getTerms();
          },
          getIssuers() {
            return instanceRecordManager.getIssuers();
          },
          getBrands() {
            return instanceRecordManager.getBrands();
          },
          getInstallationForInstance() {
            return instanceRecordManager.getInstallationForInstance();
          },
          async saveIssuer(issuerP, keyword) {
            const issuerRecord = await issuerStorage.storeIssuer(issuerP);
            await escrowStorage.createPurse(
              issuerRecord.issuer,
              issuerRecord.brand,
            );
            instanceRecordManager.addIssuerToInstanceRecord(
              keyword,
              issuerRecord,
            );
            return issuerRecord;
          },
          makeZoeMint(
            keyword,
            assetKind = AssetKind.NAT,
            displayInfo,
            { elementShape = undefined } = {},
          ) {
            // Local indicates one that zoe itself makes from vetted code,
            // and so can be assumed correct and fresh by zoe.
            const localIssuerKit = makeIssuerKit(
              keyword,
              assetKind,
              displayInfo,
              // eslint-disable-next-line no-use-before-define
              adminNode.terminateWithFailure,
              { elementShape },
            );
            return wrapIssuerKitWithZoeMint(keyword, localIssuerKit);
          },
          registerFeeMint(keyword, allegedFeeMintAccess) {
            const feeIssuerKit = feeMint.getFeeIssuerKit(allegedFeeMintAccess);
            return wrapIssuerKitWithZoeMint(keyword, feeIssuerKit);
          },
          getInstanceRecord() {
            return instanceRecordManager.getInstanceRecord();
          },
          getIssuerRecords() {
            return issuerStorage.getIssuerRecords(
              // the issuerStorage is a weakStore, so we cannot iterate over
              // it directly. Additionally, we only want to export the
              // issuers used in this contract instance specifically, not
              // all issuers.
              Object.values(
                instanceRecordManager.getInstanceRecord().terms.issuers,
              ),
            );
          },
          initInstanceAdmin(i, instanceAdmin) {
            return instanceAdminManager.updater.initInstanceAdmin(
              i,
              instanceAdmin,
            );
          },
          deleteInstanceAdmin(i) {
            instanceAdminManager.updater.deleteInstanceAdmin(i);
          },
          makeInvitation(handle, desc, customProps, proposalShape) {
            return makeInvitationImpl(handle, desc, customProps, proposalShape);
          },
          getInvitationIssuer() {
            return invitationIssuer;
          },
          getRoot() {
            return root;
          },
          getWithdrawFacet() {
            const { facets } = this;
            return facets.withdrawFacet;
          },
          getAdminNode() {
            return adminNode;
          },
        },
        // Goes to the Zoe seat, which isn't restricted in how much to withdraw
        withdrawFacet: {
          withdrawPayments(amounts) {
            return escrowStorage.withdrawPayments(amounts);
          },
        },
      },
    );
    return makeISM().instanceStorageManager;
  };

  const installBundle = bundleID => {
    return installationStorage.installBundle(bundleID);
  };

  const getInvitationIssuer = () => invitationIssuer;

  const makeStorageManager = vivifyFarClassKit(
    zoeBaggage,
    'ZoeStorageManager',
    ZoeStorageMangerInterface,
    instanceAdmins => ({ instanceAdmins }),
    {
      zoeServiceDataAccess: {
        getInvitationIssuer,
        getBundleIDFromInstallation(allegedInstallation) {
          return installationStorage.getBundleIDFromInstallation(
            allegedInstallation,
          );
        },
        getPublicFacet(instance) {
          const { state } = this;
          return state.instanceAdmins.getPublicFacet(instance);
        },
        getBrands(instance) {
          const { state } = this;
          return state.instanceAdmins.getBrands(instance);
        },
        getIssuers(instance) {
          const { state } = this;
          return state.instanceAdmins.getIssuers(instance);
        },
        getOfferFilter(instance) {
          const { state } = this;
          return state.instanceAdmins.getOfferFilter(instance);
        },
        setOfferFilter(instance, filters) {
          const { state } = this;
          state.instanceAdmins.setOfferFilter(instance, filters);
        },
        getTerms(instance) {
          const { state } = this;
          return state.instanceAdmins.getTerms(instance);
        },
        getInstallationForInstance(instance) {
          const { state } = this;
          return state.instanceAdmins.getInstallationForInstance(instance);
        },
        getProposalShapeForInvitation,
        installBundle,
        installBundleID(bundleID) {
          return installationStorage.installBundleID(bundleID);
        },
      },
      makeOfferAccess: {
        getAssetKindByBrand: issuerStorage.getAssetKindByBrand /* o */,
        installBundle,
        getInstanceAdmin(instance) {
          const { state } = this;
          return state.instanceAdmins.getInstanceAdmin(instance);
        },
        getProposalShapeForInvitation,
        getInvitationIssuer,
        depositPayments(proposal, payments) {
          return escrowStorage.depositPayments(proposal, payments);
        },
      },
      startInstanceAccess: {
        makeZoeInstanceStorageManager,
        unwrapInstallation(installation) {
          return installationStorage.unwrapInstallation(installation);
        },
      },
      invitationIssuerAccess: {
        getInvitationIssuer,
      },
    },
  );

  return makeStorageManager(instanceAdminManager.accessor);
};
