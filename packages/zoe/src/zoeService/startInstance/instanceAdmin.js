// @ts-check

import { makeWeakStore as makeNonVOWeakStore } from '@agoric/store';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';
import { assert, details as X } from '@agoric/assert';

import { makeZoeSeatAdminKit } from '../zoeSeat';
import { makeHandle } from '../../makeHandle';
import { handlePKitWarning } from '../../handleWarning';

export const makeInstanceAdmin = (
  zoeInstanceStorageManager,
  zoeService,
  bundle,
  zcfRoot,
) => {
  /** @type {WeakStore<SeatHandle, ZoeSeatAdmin>} */
  const seatHandleToZoeSeatAdmin = makeNonVOWeakStore('seatHandle');

  /** @type {PromiseRecord<HandleOfferObj>} */
  const handleOfferObjPromiseKit = makePromiseKit();
  handlePKitWarning(handleOfferObjPromiseKit);
  const publicFacetPromiseKit = makePromiseKit();
  handlePKitWarning(publicFacetPromiseKit);

  /** @type {Set<ZoeSeatAdmin>} */
  const zoeSeatAdmins = new Set();
  let acceptingOffers = true;

  const exitZoeSeatAdmin = zoeSeatAdmin => zoeSeatAdmins.delete(zoeSeatAdmin);
  const hasExited = zoeSeatAdmin => !zoeSeatAdmins.has(zoeSeatAdmin);

  const {
    getTerms,
    getIssuers,
    getBrands,
    makeZoeMint,
    makeInvitation,
    withdrawPayments,
    saveIssuer,
  } = zoeInstanceStorageManager;

  const makeNoEscrowSeat = (
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
      withdrawPayments,
      exitObj,
    );
    zoeSeatAdmins.add(zoeSeatAdmin);
    seatHandleToZoeSeatAdmin.init(seatHandle, zoeSeatAdmin);
    return { userSeat, notifier, zoeSeatAdmin };
  };

  const exitAllSeats = completion => {
    acceptingOffers = false;
    zoeSeatAdmins.forEach(zoeSeatAdmin => zoeSeatAdmin.exit(completion));
  };
  const failAllSeats = reason => {
    acceptingOffers = false;
    zoeSeatAdmins.forEach(zoeSeatAdmin => zoeSeatAdmin.fail(reason));
  };

  /** @type {ZoeInstanceAdmin} */
  const zoeInstanceAdminForZcf = Far('zoeInstanceAdminForZcf', {
    makeInvitation,
    // checks of keyword done on zcf side
    saveIssuer,
    // A Seat requested by the contract without any payments to escrow
    makeNoEscrowSeat,
    exitAllSeats,
    failAllSeats,
    makeZoeMint,
    replaceAllocations: seatHandleAllocations => {
      seatHandleAllocations.forEach(({ seatHandle, allocation }) => {
        const zoeSeatAdmin = seatHandleToZoeSeatAdmin.get(seatHandle);
        zoeSeatAdmin.replaceAllocation(allocation);
      });
    },
    stopAcceptingOffers: () => (acceptingOffers = false),
  });

  /** @type {InstanceAdmin} */
  const instanceAdmin = Far('instanceAdmin', {
    getPublicFacet: () => publicFacetPromiseKit.promise,
    getTerms,
    getIssuers,
    getBrands,
    assertAcceptingOffers: () => {
      assert(acceptingOffers, `No further offers are accepted`);
    },
    exitAllSeats,
    failAllSeats,
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
        withdrawPayments,
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
    executeContract: async () => {
      const {
        creatorFacet = Far('emptyCreatorFacet', {}),
        publicFacet = Far('emptyPublicFacet', {}),
        creatorInvitation: creatorInvitationP,
        handleOfferObj,
      } = await E(zcfRoot).executeContract(
        bundle,
        zoeService,
        zoeInstanceStorageManager.invitationIssuer,
        zoeInstanceAdminForZcf,
        zoeInstanceStorageManager.exportInstanceRecord(),
        zoeInstanceStorageManager.exportIssuerStorage(),
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

        return {
          creatorFacet,
          creatorInvitation,
          publicFacet,
        };
      });
    },
  });

  return harden(instanceAdmin);
};
