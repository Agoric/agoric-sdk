// @ts-check
import { makeWeakStore as makeNonVOWeakStore } from '@agoric/store';
import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

/**
 * Zoe uses ERTP, the Electronic Rights Transfer Protocol
 *
 * Within Zoe, the assetKind of validated amounts must be consistent
 * with the brand's assetKind. This is stricter than the validation
 * provided by AmountMath currently. When the brand has a
 * assetKind itself, AmountMath will validate that.
 */
import '@agoric/ertp/exported';
import '@agoric/store/exported';
import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';

import '../../exported';
import '../internal-types';

import { Far } from '@agoric/marshal';
import { makeZoeSeatAdminKit } from './zoeSeat';
import { makeHandle } from '../makeHandle';
import { makeZoeStorageManager } from './zoeStorageManager';
import { makeOffer } from './offer/offer';
import { makeInvitationQueryFns } from './invitationQueries';
import { handlePKitWarning } from '../handleWarning';
import { setupCreateZCFVat } from './createZCFVat';

/**
 * Create an instance of Zoe.
 *
 * @param {VatAdminSvc} vatAdminSvc - The vatAdmin Service, which carries the power
 * to create a new vat.
 * @param {string} [zcfBundleName] - The name of the contract facet bundle.
 * @returns {ZoeService} The created Zoe service.
 */
function makeZoe(vatAdminSvc, zcfBundleName = undefined) {
  const invitationKit = makeIssuerKit('Zoe Invitation', AssetKind.SET);

  /** @type {WeakStore<SeatHandle, ZoeSeatAdmin>} */
  const seatHandleToZoeSeatAdmin = makeNonVOWeakStore('seatHandle');

  // This method contains the power to create a new ZCF Vat, and must
  // be closely held. vatAdminSvc is even more powerful - any vat can
  // be created. We severely restrict access to vatAdminSvc for this reason.
  const createZCFVat = setupCreateZCFVat(vatAdminSvc, zcfBundleName);

  const {
    getInstance,
    getInstallation,
    getInvitationDetails,
  } = makeInvitationQueryFns(invitationKit.issuer);

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
  } = makeZoeStorageManager(createZCFVat);

  const offer = makeOffer(
    invitationKit.issuer,
    getInstanceAdmin,
    depositPayments,
    getAssetKindByBrand,
  );

  /** @type {ZoeService} */
  const zoeService = Far('zoeService', {
    getInvitationIssuer: () => invitationKit.issuer,
    install,
    getPublicFacet,
    getBrands,
    getIssuers,
    getTerms,
    getInstance,
    getInstallation,
    getInvitationDetails,
    startInstance: async (
      installationP,
      uncleanIssuerKeywordRecord = harden({}),
      customTerms = harden({}),
    ) => {
      const { installation, bundle } = await unwrapInstallation(installationP);
      // AWAIT ///

      const instance = makeHandle('Instance');

      const zoeInstanceStorageManager = await makeZoeInstanceStorageManager(
        installation,
        customTerms,
        uncleanIssuerKeywordRecord,
        instance,
      );
      // AWAIT ///

      const { adminNode, root } = await createZCFVat();
      /** @type {ZCFRoot} */
      const zcfRoot = root;

      /** @type {PromiseRecord<HandleOfferObj>} */
      const handleOfferObjPromiseKit = makePromiseKit();
      handlePKitWarning(handleOfferObjPromiseKit);
      const publicFacetPromiseKit = makePromiseKit();
      handlePKitWarning(publicFacetPromiseKit);

      const makeInstanceAdmin = () => {
        /** @type {Set<ZoeSeatAdmin>} */
        const zoeSeatAdmins = new Set();
        let acceptingOffers = true;

        const exitZoeSeatAdmin = zoeSeatAdmin =>
          zoeSeatAdmins.delete(zoeSeatAdmin);
        const hasExited = zoeSeatAdmin => !zoeSeatAdmins.has(zoeSeatAdmin);

        /** @type {InstanceAdmin} */
        const instanceAdmin = Far('instanceAdmin', {
          getPublicFacet: () => publicFacetPromiseKit.promise,
          getTerms: zoeInstanceStorageManager.getTerms,
          getIssuers: zoeInstanceStorageManager.getIssuers,
          getBrands: zoeInstanceStorageManager.getBrands,
          getInstance: () => instance,
          assertAcceptingOffers: () => {
            assert(acceptingOffers, `No further offers are accepted`);
          },
          exitAllSeats: completion => {
            acceptingOffers = false;
            zoeSeatAdmins.forEach(zoeSeatAdmin =>
              zoeSeatAdmin.exit(completion),
            );
          },
          failAllSeats: reason => {
            acceptingOffers = false;
            zoeSeatAdmins.forEach(zoeSeatAdmin => zoeSeatAdmin.fail(reason));
          },
          stopAcceptingOffers: () => (acceptingOffers = false),
          makeUserSeat: (invitationHandle, initialAllocation, proposal) => {
            const offerResultPromiseKit = makePromiseKit();
            handlePKitWarning(offerResultPromiseKit);
            const exitObjPromiseKit = makePromiseKit();
            handlePKitWarning(exitObjPromiseKit);
            const seatHandle = makeHandle('SeatHandle');

            const { userSeat, notifier, zoeSeatAdmin } = makeZoeSeatAdminKit(
              initialAllocation,
              exitZoeSeatAdmin,
              hasExited,
              proposal,
              zoeInstanceStorageManager.withdrawPayments,
              exitObjPromiseKit.promise,
              offerResultPromiseKit.promise,
            );

            seatHandleToZoeSeatAdmin.init(seatHandle, zoeSeatAdmin);

            const seatData = harden({
              proposal,
              initialAllocation,
              notifier,
              seatHandle,
            });

            zoeSeatAdmins.add(zoeSeatAdmin);

            E(handleOfferObjPromiseKit.promise)
              .handleOffer(invitationHandle, zoeSeatAdmin, seatData)
              .then(({ offerResultP, exitObj }) => {
                offerResultPromiseKit.resolve(offerResultP);
                exitObjPromiseKit.resolve(exitObj);
              });

            // return the userSeat before the offerHandler is called
            return userSeat;
          },
          makeNoEscrowSeat: (
            initialAllocation,
            proposal,
            exitObj,
            seatHandle,
          ) => {
            const { userSeat, notifier, zoeSeatAdmin } = makeZoeSeatAdminKit(
              initialAllocation,
              exitZoeSeatAdmin,
              hasExited,
              proposal,
              zoeInstanceStorageManager.withdrawPayments,
              exitObj,
            );
            zoeSeatAdmins.add(zoeSeatAdmin);
            seatHandleToZoeSeatAdmin.init(seatHandle, zoeSeatAdmin);
            return { userSeat, notifier, zoeSeatAdmin };
          },
        });
        return instanceAdmin;
      };

      const instanceAdmin = makeInstanceAdmin();
      zoeInstanceStorageManager.initInstanceAdmin(instance, instanceAdmin);

      E(adminNode)
        .done()
        .then(
          completion => instanceAdmin.exitAllSeats(completion),
          reason => instanceAdmin.failAllSeats(reason),
        );

      // Unpack the invitationKit.
      const {
        issuer: invitationIssuer,
        mint: invitationMint,
        brand: invitationBrand,
      } = invitationKit;

      /** @type {ZoeInstanceAdmin} */
      const zoeInstanceAdminForZcf = Far('zoeInstanceAdminForZcf', {
        makeInvitation: (invitationHandle, description, customProperties) => {
          const invitationAmount = AmountMath.make(
            [
              {
                ...customProperties,
                description,
                handle: invitationHandle,
                instance,
                installation,
              },
            ],
            invitationBrand,
          );
          return invitationMint.mintPayment(invitationAmount);
        },
        // checks of keyword done on zcf side
        saveIssuer: zoeInstanceStorageManager.saveIssuer,
        // A Seat requested by the contract without any payments to escrow
        makeNoEscrowSeat: instanceAdmin.makeNoEscrowSeat,
        exitAllSeats: completion => instanceAdmin.exitAllSeats(completion),
        failAllSeats: reason => instanceAdmin.failAllSeats(reason),
        makeZoeMint: zoeInstanceStorageManager.makeZoeMint,
        replaceAllocations: seatHandleAllocations => {
          seatHandleAllocations.forEach(({ seatHandle, allocation }) => {
            const zoeSeatAdmin = seatHandleToZoeSeatAdmin.get(seatHandle);
            zoeSeatAdmin.replaceAllocation(allocation);
          });
        },
        stopAcceptingOffers: () => instanceAdmin.stopAcceptingOffers(),
      });

      // At this point, the contract will start executing. All must be
      // ready

      const {
        creatorFacet = Far('emptyCreatorFacet', {}),
        publicFacet = Far('emptyPublicFacet', {}),
        creatorInvitation: creatorInvitationP,
        handleOfferObj,
      } = await E(zcfRoot).executeContract(
        bundle,
        zoeService,
        invitationIssuer,
        zoeInstanceAdminForZcf,
        zoeInstanceStorageManager.getInstanceRecord(),
        zoeInstanceStorageManager.getIssuerRecords(),
      );

      handleOfferObjPromiseKit.resolve(handleOfferObj);
      publicFacetPromiseKit.resolve(publicFacet);

      // creatorInvitation can be undefined, but if it is defined,
      // let's make sure it is an invitation.
      return Promise.allSettled([
        creatorInvitationP,
        invitationIssuer.isLive(creatorInvitationP),
      ]).then(([invitationResult, isLiveResult]) => {
        let creatorInvitation;
        if (invitationResult.status === 'fulfilled') {
          creatorInvitation = invitationResult.value;
        }
        if (creatorInvitation !== undefined) {
          assert(
            isLiveResult.status === 'fulfilled' && isLiveResult.value,
            X`The contract did not correctly return a creatorInvitation`,
          );
        }
        const adminFacet = Far('adminFacet', {
          getVatShutdownPromise: () => E(adminNode).done(),
          getVatStats: () => E(adminNode).adminData(),
        });

        // Actually returned to the user.
        return {
          creatorFacet,
          creatorInvitation,
          instance,
          publicFacet,
          adminFacet,
        };
      });
    },
    offer,
  });

  return zoeService;
}

export { makeZoe };
