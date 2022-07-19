// @ts-check

import { E } from '@endo/eventual-send';
import { makePromiseKit } from '@endo/promise-kit';
import { Far, passStyleOf } from '@endo/marshal';
import { makeWeakStore } from '@agoric/store';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { makeZoeSeatAdminKit } from './zoeSeat.js';
import { defineDurableHandle } from '../makeHandle.js';
import { handlePKitWarning } from '../handleWarning.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const { details: X, quote: q } = assert;

/**
 * @param {MakeZoeInstanceStorageManager} makeZoeInstanceStorageManager
 * @param {UnwrapInstallation} unwrapInstallation
 * @param {ERef<BundleCap>} zcfBundleCapP
 * @param {(id: string) => BundleCap} getBundleCapByIdNow
 * @param {Baggage} [zoeBaggage]
 * @returns {import('./utils.js').StartInstance}
 */
export const makeStartInstance = (
  makeZoeInstanceStorageManager,
  unwrapInstallation,
  zcfBundleCapP,
  getBundleCapByIdNow,
  zoeBaggage = makeScalarBigMapStore('zoe baggage', { durable: true }),
) => {
  const makeInstanceHandle = defineDurableHandle(zoeBaggage, 'Instance');
  const makeSeatHandle = defineDurableHandle(zoeBaggage, 'Seat');

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

    const contractBundleCap = bundle || bundleCap;
    assert(contractBundleCap);

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
      contractBundleCap,
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

          const { userSeat, zoeSeatAdmin } = makeZoeSeatAdminKit(
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
            seatHandle,
            offerArgs,
          });

          zoeSeatAdmins.add(zoeSeatAdmin);

          E.when(
            E(handleOfferObjPromiseKit.promise).handleOffer(
              invitationHandle,
              seatData,
            ),
            ({ offerResultPromise, exitObj }) => {
              offerResultPromiseKit.resolve(offerResultPromise);
              exitObjPromiseKit.resolve(exitObj);
            },
            err => {
              adminNode.terminateWithFailure(err);
              throw err;
            },
          );

          // return the userSeat before the offerHandler is called
          return userSeat;
        },
        makeNoEscrowSeatKit: (
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
          return { userSeat, notifier };
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
      makeNoEscrowSeatKit: instanceAdmin.makeNoEscrowSeatKit,
      exitAllSeats: completion => instanceAdmin.exitAllSeats(completion),
      failAllSeats: reason => instanceAdmin.failAllSeats(reason),
      exitSeat: (seatHandle, completion) => {
        seatHandleToZoeSeatAdmin.get(seatHandle).exit(completion);
      },
      failSeat: (seatHandle, reason) => {
        seatHandleToZoeSeatAdmin.get(seatHandle).fail(reason);
      },
      getSeatNotifier: seatHandle =>
        seatHandleToZoeSeatAdmin.get(seatHandle).getNotifier(),
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
    } = await E(zcfRoot).startZcf(
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
      zcfBundleCapP,
    ]).then(([invitationResult, isLiveResult, zcfBundleCapResult]) => {
      let creatorInvitation;
      if (invitationResult.status === 'fulfilled') {
        creatorInvitation = invitationResult.value;
      }
      if (creatorInvitation !== undefined) {
        assert(
          isLiveResult.status === 'fulfilled' && isLiveResult.value,
          'The contract did not correctly return a creatorInvitation',
        );
      }
      if (zcfBundleCapResult !== undefined) {
        assert(
          zcfBundleCapResult.status === 'fulfilled' && zcfBundleCapResult.value,
          'the budnle cap was broken',
        );
      }
      const adminFacet = Far('adminFacet', {
        getVatShutdownPromise: () => E(adminNode).done(),
        restartContract: _newPrivateArgs => {
          const vatParameters = { contractBundleCap };
          return E(adminNode).upgrade(zcfBundleCapResult.value, {
            vatParameters,
          });
        },
        upgradeContract: async (contractBundleId, newPrivateArgs) => {
          const newContractBundleCap = await getBundleCapByIdNow(
            contractBundleId,
          );
          const vatParameters = {
            contractBundleCap: newContractBundleCap,
            privateArgs: newPrivateArgs,
          };
          return E(adminNode).upgrade(zcfBundleCapResult.value, {
            vatParameters,
          });
        },
      });

      // Actually returned to the user.
      return {
        creatorFacet,

        // TODO (#5775) deprecate this return value from contracts.
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
