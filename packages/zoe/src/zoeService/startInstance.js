// @ts-check

import { assert, details as X, quote as q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far, passStyleOf } from '@endo/marshal';
import { makeWeakStore } from '@agoric/store';

import { makeZoeSeatAdminKit } from './zoeSeat.js';
import { makeHandle } from '../makeHandle.js';
import { handlePKitWarning } from '../handleWarning.js';

/**
 * @param {Promise<ZoeService>} zoeServicePromise
 * @param {MakeZoeInstanceStorageManager} makeZoeInstanceStorageManager
 * @param {UnwrapInstallation} unwrapInstallation
 * @returns {StartInstance}
 */
export const makeStartInstance = (
  zoeServicePromise,
  makeZoeInstanceStorageManager,
  unwrapInstallation,
) => {
  /** @type {StartInstance} */
  const startInstance = async (
    installationP,
    uncleanIssuerKeywordRecord = harden({}),
    customTerms = harden({}),
    privateArgs = undefined,
  ) => {
    /** @type {WeakStore<SeatHandle, ZoeSeatAdmin>} */
    const seatHandleToZoeSeatAdmin = makeWeakStore('seatHandle');

    const { installation, bundle } = await unwrapInstallation(installationP);
    // AWAIT ///

    if (privateArgs !== undefined) {
      const passStyle = passStyleOf(privateArgs);
      assert(
        passStyle === 'copyRecord',
        X`privateArgs must be a pass-by-copy record, but instead was a ${q(
          passStyle,
        )}: ${privateArgs}`,
      );
    }

    const instance = makeHandle('Instance');

    const zoeInstanceStorageManager = await makeZoeInstanceStorageManager(
      installation,
      customTerms,
      uncleanIssuerKeywordRecord,
      instance,
    );
    // AWAIT ///

    const { adminNode, root } = zoeInstanceStorageManager;
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
        getInstallationForInstance:
          zoeInstanceStorageManager.getInstallationForInstance,
        getInstance: () => instance,
        assertAcceptingOffers: () => {
          assert(acceptingOffers, `No further offers are accepted`);
        },
        exitAllSeats: completion => {
          acceptingOffers = false;
          zoeSeatAdmins.forEach(zoeSeatAdmin => zoeSeatAdmin.exit(completion));
        },
        failAllSeats: reason => {
          acceptingOffers = false;
          zoeSeatAdmins.forEach(zoeSeatAdmin => zoeSeatAdmin.fail(reason));
        },
        stopAcceptingOffers: () => (acceptingOffers = false),
        makeUserSeat: (
          invitationHandle,
          initialAllocation,
          proposal,
          offerArgs = undefined,
        ) => {
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
            offerArgs,
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

    /** @type {ZoeInstanceAdmin} */
    const zoeInstanceAdminForZcf = Far('zoeInstanceAdminForZcf', {
      makeInvitation: zoeInstanceStorageManager.makeInvitation,
      // checks of keyword done on zcf side
      saveIssuer: zoeInstanceStorageManager.saveIssuer,
      // A Seat requested by the contract without any payments to escrow
      makeNoEscrowSeat: instanceAdmin.makeNoEscrowSeat,
      exitAllSeats: completion => instanceAdmin.exitAllSeats(completion),
      failAllSeats: reason => instanceAdmin.failAllSeats(reason),
      makeZoeMint: zoeInstanceStorageManager.makeZoeMint,
      registerFeeMint: zoeInstanceStorageManager.registerFeeMint,
      replaceAllocations: seatHandleAllocations => {
        try {
          seatHandleAllocations.forEach(({ seatHandle, allocation }) => {
            const zoeSeatAdmin = seatHandleToZoeSeatAdmin.get(seatHandle);
            zoeSeatAdmin.replaceAllocation(allocation);
          });
        } catch (err) {
          adminNode.terminateWithFailure(err);
          throw err;
        }
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
      zoeServicePromise,
      zoeInstanceStorageManager.invitationIssuer,
      zoeInstanceAdminForZcf,
      zoeInstanceStorageManager.getInstanceRecord(),
      zoeInstanceStorageManager.getIssuerRecords(),
      privateArgs,
    );

    handleOfferObjPromiseKit.resolve(handleOfferObj);
    publicFacetPromiseKit.resolve(publicFacet);

    // creatorInvitation can be undefined, but if it is defined,
    // let's make sure it is an invitation.
    return Promise.allSettled([
      creatorInvitationP,
      zoeInstanceStorageManager.invitationIssuer.isLive(creatorInvitationP),
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
  };
  return startInstance;
};
