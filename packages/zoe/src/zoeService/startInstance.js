import { E } from '@endo/eventual-send';
import { passStyleOf } from '@endo/marshal';
import {
  M,
  makeScalarBigMapStore,
  provideDurableWeakMapStore,
  prepareExoClass,
} from '@agoric/vat-data';
import { initEmpty } from '@agoric/store';

import { defineDurableHandle } from '../makeHandle.js';
import { makeInstanceAdminMaker } from './instanceAdminStorage.js';
import { AdminFacetI, InstanceAdminI } from '../typeGuards.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */
/** @typedef { import('@agoric/swingset-vat').BundleCap} BundleCap */

const { Fail, quote: q } = assert;

/**
 * @param {any} startInstanceAccess
 * @param {() => ERef<BundleCap>} getZcfBundleCapP
 * @param {(id: string) => BundleCap} getBundleCapByIdNow
 * @param {Baggage} [zoeBaggage]
 * @returns {import('./utils').StartInstance}
 */
export const makeStartInstance = (
  startInstanceAccess,
  getZcfBundleCapP,
  getBundleCapByIdNow,
  zoeBaggage = makeScalarBigMapStore('zoe baggage', { durable: true }),
) => {
  const makeInstanceHandle = defineDurableHandle(zoeBaggage, 'Instance');

  /** @type {WeakMapStore<SeatHandle, ZoeSeatAdmin>} */
  const seatHandleToZoeSeatAdmin = provideDurableWeakMapStore(
    zoeBaggage,
    'seatHandleToZoeSeatAdmin',
  );

  const instanceAdminMaker = makeInstanceAdminMaker(
    zoeBaggage,
    seatHandleToZoeSeatAdmin,
  );

  const makeZoeInstanceAdmin = prepareExoClass(
    zoeBaggage,
    'zoeInstanceAdmin',
    InstanceAdminI,
    (instanceStorage, instanceAdmin, seatHandleToSeatAdmin, adminNode) => ({
      instanceStorage,
      instanceAdmin,
      seatHandleToSeatAdmin,
      adminNode,
    }),
    {
      makeInvitation(handle, desc, customProps, proposalShape) {
        const { state } = this;
        return state.instanceStorage.makeInvitation(
          handle,
          desc,
          customProps,
          proposalShape,
        );
      },
      // checks of keyword done on zcf side
      saveIssuer(issuer, keyword) {
        const { state } = this;
        return state.instanceStorage.saveIssuer(issuer, keyword);
      },
      // A Seat requested by the contract without any payments to escrow
      makeNoEscrowSeat(initialAllocations, proposal, exitObj, seatHandle) {
        const { state } = this;
        return state.instanceAdmin.makeNoEscrowSeat(
          initialAllocations,
          proposal,
          exitObj,
          seatHandle,
        );
      },
      exitAllSeats(completion) {
        const { state } = this;
        state.instanceAdmin.exitAllSeats(completion);
      },
      failAllSeats(reason) {
        const { state } = this;
        return state.instanceAdmin.failAllSeats(reason);
      },
      exitSeat(seatHandle, completion) {
        const { state } = this;
        state.seatHandleToSeatAdmin.get(seatHandle).exit(completion);
      },
      failSeat(seatHandle, reason) {
        const { state } = this;
        state.seatHandleToSeatAdmin.get(seatHandle).fail(reason);
      },
      makeZoeMint(keyword, assetKind, displayInfo, options) {
        const { state } = this;
        return state.instanceStorage.makeZoeMint(
          keyword,
          assetKind,
          displayInfo,
          options,
        );
      },
      registerFeeMint(keyword, feeMintAccess) {
        const { state } = this;
        return state.instanceStorage.registerFeeMint(keyword, feeMintAccess);
      },
      replaceAllocations(seatHandleAllocations) {
        const { state } = this;
        try {
          seatHandleAllocations.forEach(({ seatHandle, allocation }) => {
            const zoeSeatAdmin = state.seatHandleToSeatAdmin.get(seatHandle);
            zoeSeatAdmin.replaceAllocation(allocation);
          });
        } catch (err) {
          state.adminNode.terminateWithFailure(err);
          throw err;
        }
      },
      stopAcceptingOffers() {
        const { state } = this;
        return state.instanceAdmin.stopAcceptingOffers();
      },
      setOfferFilter(strings) {
        const { state } = this;
        state.instanceAdmin.setOfferFilter(strings);
      },
      getOfferFilter() {
        const { state } = this;
        return state.instanceAdmin.getOfferFilter();
      },
      getExitSubscriber(seatHandle) {
        const { state } = this;
        return state.seatHandleToSeatAdmin.get(seatHandle).getExitSubscriber();
      },
      isBlocked(string) {
        const { state } = this;
        return state.instanceAdmin.isBlocked(string);
      },
    },
  );

  const prepareEmptyFacet = facetName =>
    prepareExoClass(
      zoeBaggage,
      facetName,
      M.interface(facetName, {}),
      initEmpty,
      {},
    );
  const makeEmptyCreatorFacet = prepareEmptyFacet('emptyCreatorFacet');
  const makeEmptyPublicFacet = prepareEmptyFacet('emptyPublicFacet');

  const makeAdminFacet = prepareExoClass(
    zoeBaggage,
    'adminFacet',
    AdminFacetI,
    (adminNode, zcfBundleCap, contractBundleCap) => ({
      adminNode,
      zcfBundleCap,
      contractBundleCap,
    }),
    {
      getVatShutdownPromise() {
        const { state } = this;

        return E(state.adminNode).done();
      },
      restartContract(_newPrivateArgs = undefined) {
        const { state } = this;

        const vatParameters = { contractBundleCap: state.contractBundleCap };
        return E(state.adminNode).upgrade(state.zcfBundleCap.value, {
          vatParameters,
        });
      },
      async upgradeContract(contractBundleId, newPrivateArgs = undefined) {
        const { state } = this;
        const newContractBundleCap = await getBundleCapByIdNow(
          contractBundleId,
        );
        const vatParameters = {
          contractBundleCap: newContractBundleCap,
          privateArgs: newPrivateArgs,
        };
        return E(state.adminNode).upgrade(state.zcfBundleCap.value, {
          vatParameters,
        });
      },
    },
  );

  const startInstance = async (
    installationP,
    uncleanIssuerKeywordRecord = harden({}),
    customTerms = harden({}),
    privateArgs = undefined,
  ) => {
    const { installation, bundle, bundleCap } = await E(
      startInstanceAccess,
    ).unwrapInstallation(installationP);
    // AWAIT ///

    const contractBundleCap = bundle || bundleCap;
    assert(contractBundleCap);

    if (privateArgs !== undefined) {
      const passStyle = passStyleOf(privateArgs);
      passStyle === 'copyRecord' ||
        Fail`privateArgs must be a pass-by-copy record, but instead was a ${q(
          passStyle,
        )}: ${privateArgs}`;
    }

    const instanceHandle = makeInstanceHandle();

    const instanceBaggage = makeScalarBigMapStore('instanceBaggage', {
      durable: true,
    });

    const zoeInstanceStorageManager = await E(
      startInstanceAccess,
    ).makeZoeInstanceStorageManager(
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

    /** @type {InstanceAdmin} */
    const instanceAdmin = instanceAdminMaker(
      instanceHandle,
      zoeInstanceStorageManager,
      adminNode,
    );
    zoeInstanceStorageManager.initInstanceAdmin(instanceHandle, instanceAdmin);

    E.when(
      E(adminNode).done(),
      completion => {
        instanceAdmin.exitAllSeats(completion);
      },
      reason => instanceAdmin.failAllSeats(reason),
    );

    /** @type {ZoeInstanceAdmin} */
    const zoeInstanceAdminForZcf = makeZoeInstanceAdmin(
      zoeInstanceStorageManager,
      instanceAdmin,
      seatHandleToZoeSeatAdmin,
      adminNode,
    );

    // At this point, the contract will start executing. All must be ready

    const {
      creatorFacet = makeEmptyCreatorFacet(),
      publicFacet = makeEmptyPublicFacet(),
      creatorInvitation: creatorInvitationP,
      handleOfferObj,
    } = await E(zcfRoot).startZcf(
      zoeInstanceAdminForZcf,
      zoeInstanceStorageManager.getInstanceRecord(),
      zoeInstanceStorageManager.getIssuerRecords(),
      privateArgs,
    );

    instanceAdmin.initDelayedState(handleOfferObj, publicFacet);

    const settledBundleCap = await getZcfBundleCapP();
    // creatorInvitation can be undefined, but if it is defined,
    // let's make sure it is an invitation.
    return E.when(
      Promise.allSettled([
        creatorInvitationP,
        zoeInstanceStorageManager
          .getInvitationIssuer()
          .isLive(creatorInvitationP),
        settledBundleCap,
      ]),
      ([invitationResult, isLiveResult, zcfBundleCapResult]) => {
        let creatorInvitation;
        if (invitationResult.status === 'fulfilled') {
          creatorInvitation = invitationResult.value;
        }
        if (creatorInvitation !== undefined) {
          (isLiveResult.status === 'fulfilled' && isLiveResult.value) ||
            Fail`The contract did not correctly return a creatorInvitation`;
        }
        if (zcfBundleCapResult !== undefined) {
          (zcfBundleCapResult.status === 'fulfilled' &&
            zcfBundleCapResult.value) ||
            Fail`the bundle cap was broken`;
        }
        const adminFacet = makeAdminFacet(
          adminNode,
          harden(zcfBundleCapResult),
          contractBundleCap,
        );

        // Actually returned to the user.
        return {
          creatorFacet,

          // TODO (#5775) deprecate this return value from contracts.
          creatorInvitation,
          instance: instanceHandle,
          publicFacet,
          adminFacet,
        };
      },
    );
  };
  // @ts-expect-error cast
  return startInstance;
};
