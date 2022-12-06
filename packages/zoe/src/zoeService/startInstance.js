import { E } from '@endo/eventual-send';
import { passStyleOf } from '@endo/marshal';
import {
  M,
  makeScalarBigMapStore,
  provideDurableWeakMapStore,
  vivifyFarClass,
} from '@agoric/vat-data';
import { initEmpty } from '@agoric/store';

import { defineDurableHandle } from '../makeHandle.js';
import { makeInstanceAdminMaker } from './instanceAdminStorage.js';
import { AdminFacetGuard, InstanceAdminI } from '../typeGuards.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */
/** @typedef { import('@agoric/swingset-vat').BundleCap} BundleCap */

const { details: X, quote: q } = assert;

const instanceAdminBehavior = {
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
  makeNoEscrowSeatKit(initialAllocations, proposal, exitObj, seatHandle) {
    const { state } = this;
    return state.instanceAdmin.makeNoEscrowSeatKit(
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
    state.seatHandleToAdmin.get(seatHandle).exit(completion);
  },
  failSeat(seatHandle, reason) {
    const { state } = this;
    state.seatHandleToAdmin.get(seatHandle).fail(reason);
  },
  makeZoeMint(keyword, assetKind, displayInfo, pattern) {
    const { state } = this;
    return state.instanceStorage.makeZoeMint(
      keyword,
      assetKind,
      displayInfo,
      pattern,
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
        const zoeSeatAdmin = state.seatHandleToAdmin.get(seatHandle);
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
    return state.seatHandleToAdmin.get(seatHandle).getExitSubscriber();
  },
};

/**
 * @param {any} startInstanceAccess
 * @param {ERef<BundleCap>} zcfBundleCapP
 * @param {(id: string) => BundleCap} getBundleCapByIdNow
 * @param {Baggage} [zoeBaggage]
 * @returns {import('./utils').StartInstance}
 */
export const makeStartInstance = (
  startInstanceAccess,
  zcfBundleCapP,
  getBundleCapByIdNow,
  zoeBaggage = makeScalarBigMapStore('zoe baggage', { durable: true }),
) => {
  const makeInstanceHandle = defineDurableHandle(zoeBaggage, 'Instance');

  /** @type {WeakStore<SeatHandle, ZoeSeatAdmin>} */
  const seatHandleToZoeSeatAdmin = provideDurableWeakMapStore(
    zoeBaggage,
    'seatHandleToZoeSeatAdmin',
  );

  const instanceAdminMaker = makeInstanceAdminMaker(
    zoeBaggage,
    seatHandleToZoeSeatAdmin,
  );

  const makeZoeInstanceAdmin = vivifyFarClass(
    zoeBaggage,
    'zoeInstanceAdmin',
    InstanceAdminI,
    (instanceStorage, instanceAdmin, seatHandleToAdmin, adminNode) => ({
      instanceStorage,
      instanceAdmin,
      seatHandleToAdmin,
      adminNode,
    }),
    instanceAdminBehavior,
  );

  const vivifyEmptyFacet = facetName =>
    vivifyFarClass(
      zoeBaggage,
      facetName,
      M.interface(facetName, {}),
      initEmpty,
      {},
    );
  const makeEmptyCreatorFacet = vivifyEmptyFacet('emptyCreatorFacet');
  const makeEmptyPublicFacet = vivifyEmptyFacet('emptyPublicFacet');

  const makeAdminFacet = vivifyFarClass(
    zoeBaggage,
    'adminFacet',
    AdminFacetGuard,
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
      restartContract(_newPrivateArgs) {
        const { state } = this;

        const vatParameters = { contractBundleCap: state.contractBundleCap };
        return E(state.adminNode).upgrade(state.zcfBundleCap.value, {
          vatParameters,
        });
      },
      async upgradeContract(contractBundleId, newPrivateArgs) {
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

    E(adminNode)
      .done()
      .then(
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
    });
  };
  // @ts-expect-error cast
  return startInstance;
};
