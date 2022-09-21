// @ts-check

import { E } from '@endo/eventual-send';
import { makePromiseKit } from '@endo/promise-kit';
import { Far, passStyleOf } from '@endo/marshal';
import { makeWeakStore } from '@agoric/store';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { defineDurableHandle } from '../makeHandle.js';
import { handlePKitWarning } from '../handleWarning.js';
import { makeInstanceAdminMaker } from './instanceAdminStorage.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

const { details: X, quote: q } = assert;

/**
 * @param {MakeZoeInstanceStorageManager} makeZoeInstanceStorageManager
 * @param {UnwrapInstallation} unwrapInstallation
 * @param {ERef<BundleCap>} zcfBundleCapP
 * @param {(id: string) => BundleCap} getBundleCapByIdNow
 * @param {Baggage} [zoeBaggage]
 * @returns {import('./utils').StartInstance}
 */
export const makeStartInstance = (
  makeZoeInstanceStorageManager,
  unwrapInstallation,
  zcfBundleCapP,
  getBundleCapByIdNow,
  zoeBaggage = makeScalarBigMapStore('zoe baggage', { durable: true }),
) => {
  const makeInstanceHandle = defineDurableHandle(zoeBaggage, 'Instance');

  /** @type {WeakStore<SeatHandle, ZoeSeatAdmin>} */
  const seatHandleToZoeSeatAdmin = makeWeakStore('seatHandle');

  const instanceAdminMaker = makeInstanceAdminMaker(
    zoeBaggage,
    seatHandleToZoeSeatAdmin,
  );

  const startInstance = async (
    installationP,
    uncleanIssuerKeywordRecord = harden({}),
    customTerms = harden({}),
    privateArgs = undefined,
  ) => {
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

    const instanceHandle = makeInstanceHandle();

    const instanceBaggage = makeScalarBigMapStore('instanceBaggage', {
      durable: true,
    });

    const zoeInstanceStorageManager = await makeZoeInstanceStorageManager(
      instanceBaggage,
      installation,
      customTerms,
      uncleanIssuerKeywordRecord,
      instanceHandle,
      contractBundleCap,
    );
    // AWAIT ///

    const adminNode = zoeInstanceStorageManager.getAdminNode();
    /** @type {ZCFRoot} */
    const zcfRoot = zoeInstanceStorageManager.getRoot();

    /** @type {PromiseRecord<HandleOfferObj>} */
    const handleOfferObjPromiseKit = makePromiseKit();
    handlePKitWarning(handleOfferObjPromiseKit);
    const publicFacetPromiseKit = makePromiseKit();
    handlePKitWarning(publicFacetPromiseKit);

    /** @type {InstanceAdmin} */
    const instanceAdmin = instanceAdminMaker(
      instanceHandle,
      zoeInstanceStorageManager,
      adminNode,
      publicFacetPromiseKit.promise,
    );
    console.log(`StIn`, instanceAdmin.getInstanceId(), instanceHandle);
    zoeInstanceStorageManager.initInstanceAdmin(instanceHandle, instanceAdmin);

    E(adminNode)
      .done()
      .then(
        completion => {
          console.log(
            `SI  DONE ${completion} ${instanceAdmin.getInstanceId()}`,
          );
          instanceAdmin.exitAllSeats(completion);
        },
        reason => instanceAdmin.failAllSeats(reason),
      );

    /** @type {ZoeInstanceAdmin} */
    const zoeInstanceAdminForZcf = Far('zoeInstanceAdminForZcf', {
      makeInvitation: zoeInstanceStorageManager.makeInvitation,
      // checks of keyword done on zcf side
      saveIssuer: zoeInstanceStorageManager.saveIssuer,
      // A Seat requested by the contract without any payments to escrow
      makeNoEscrowSeatKit: (...args) =>
        instanceAdmin.makeNoEscrowSeatKit(...args),
      exitAllSeats: completion => {
        console.log(
          `SI   ExAll  (${completion})`,
          instanceAdmin.getInstanceId(),
        );
        instanceAdmin.exitAllSeats(completion);
      },
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
        console.log(
          `SI  replaceAllocs()  seats`,
          seatHandleAllocations.map(({ seatHandle }) =>
            seatHandleToZoeSeatAdmin.has(seatHandle),
          ),
        );

        try {
          seatHandleAllocations.forEach(({ seatHandle, allocation }) => {
            const zoeSeatAdmin = seatHandleToZoeSeatAdmin.get(seatHandle);
            console.log(`SI  replacing ${zoeSeatAdmin.getSeatId()}`);
            zoeSeatAdmin.replaceAllocation(allocation);
          });
        } catch (err) {
          adminNode.terminateWithFailure(err);
          throw err;
        }
      },
      stopAcceptingOffers: () => instanceAdmin.stopAcceptingOffers(),
      setOfferFilter: strings => instanceAdmin.setOfferFilter(strings),
      getOfferFilter: () => instanceAdmin.getOfferFilter(),
    });

    // At this point, the contract will start executing. All must be ready

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

    instanceAdmin.initHandlerObj(handleOfferObj);
    publicFacetPromiseKit.resolve(publicFacet);

    // creatorInvitation can be undefined, but if it is defined,
    // let's make sure it is an invitation.
    return Promise.allSettled([
      creatorInvitationP,
      zoeInstanceStorageManager
        .getInvitationIssuer()
        .isLive(creatorInvitationP),
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
        instance: instanceHandle,
        publicFacet,
        adminFacet,
      };
    });
  };

  // @ts-expect-error TODO   cth
  return startInstance;
};
