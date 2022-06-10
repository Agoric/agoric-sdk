// @ts-check

import { assert, details as X, quote as q } from '@agoric/assert';
import { E } from '@endo/eventual-send';
import { makePromiseKit } from '@endo/promise-kit';
import { Far, passStyleOf } from '@endo/marshal';
import { makeWeakStore } from '@agoric/store';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { makeZoeSeatAdminKit } from './zoeSeat.js';
import { defineDurableHandle } from '../makeHandle.js';
import { handlePKitWarning } from '../handleWarning.js';

/**
 * @param {Promise<ZoeService>} zoeServicePromise
 * @param {MakeZoeInstanceStorageManager} makeZoeInstanceStorageManager
 * @param {UnwrapInstallation} unwrapInstallation
 * @param {MapStore<string, unknown>} [zoeBaggage]
 * @returns {import('./utils.js').StartInstance}
 */
export const makeStartInstance = (
  zoeServicePromise,
  makeZoeInstanceStorageManager,
  unwrapInstallation,
  zoeBaggage = makeScalarBigMapStore('zoe baggage', { durable: true }),
) => {
  const makeInstanceHandle = defineDurableHandle(zoeBaggage, 'Instance');
  // TODO(MSM): Should be 'Seat' rather than 'SeatHandle'
  const makeSeatHandle = defineDurableHandle(zoeBaggage, 'SeatHandle');

  const startInstance = async (
    installationP,
    uncleanIssuerKeywordRecord = harden({}),
    customTerms = harden({}),
    privateArgs = undefined,
  ) => {
    /** @type {WeakStore<SeatHandle, ZoeSeatAdmin>} */
    const seatHandleToZoeSeatAdmin = makeWeakStore('seatHandle');

    const { installation, bundle, bundleCap } = await unwrapInstallation(
      installationP,
    );
    // AWAIT ///

    const bundleOrBundleCap = bundle || bundleCap;
    assert(bundleOrBundleCap);

    if (privateArgs !== undefined) {
      const passStyle = passStyleOf(privateArgs);
      assert(
        passStyle === 'copyRecord',
        X`privateArgs must be a pass-by-copy record, but instead was a ${q(
          passStyle,
        )}: ${privateArgs}`,
      );
    }

    const instance = makeInstanceHandle();

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
        stopAcceptingOffers: () => {
          acceptingOffers = false;
        },
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
          const seatHandle = makeSeatHandle();

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
      bundleOrBundleCap,
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
  // @ts-expect-error cast
  return startInstance;
};
