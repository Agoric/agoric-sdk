import { makeWeakStore } from '@agoric/store';
import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import { makeIssuerKit, MathKind } from '@agoric/ertp';

import { Data, Far } from '@agoric/marshal';
import { makeZoeSeatAdminKit } from './zoeSeat';
import zcfContractBundle from '../../bundles/bundle-contractFacet';
import { makeHandle } from '../makeHandle';

function makeZoe(vatAdminSvc, zcfBundleName = undefined) {
  const invitationKit = makeIssuerKit('Zoe Invitation', MathKind.SET);
  const installations = new WeakSet();
  const instanceToInstanceAdmin = makeWeakStore('instance');
  const brandToPurse = makeWeakStore('brand');
  const seatHandleToZoeSeatAdmin = makeWeakStore('seatHandle');

  const install = async bundle => {
    assert(bundle, X`a bundle must be provided`);
    /** @type {Installation} */
    const installation = Far('Installation', {
      getBundle: () => bundle,
    });
    installations.add(installation);
    return installation;
  };

  const zoeService = Far('zoeService', {
    install,
    startInstance: async installationP => {
      const installation = await Promise.resolve(installationP);
      assert(
        installations.has(installation),
        X`${installation} was not a valid installation`,
      );

      const instance = makeHandle('Instance');

      const createVatResultP = zcfBundleName
        ? E(vatAdminSvc).createVatByName(zcfBundleName)
        : E(vatAdminSvc).createVat(zcfContractBundle);
      const { adminNode, root } = await createVatResultP;

      const zcfRoot = root;

      const bundle = installation.getBundle();
      const addSeatObjPromiseKit = makePromiseKit();

      addSeatObjPromiseKit.promise.catch(_ => {});
      const publicFacetPromiseKit = makePromiseKit();

      publicFacetPromiseKit.promise.catch(_ => {});

      const makeInstanceAdmin = () => {
        const zoeSeatAdmins = new Set();
        let acceptingOffers = true;

        /** @type {InstanceAdmin} */
        return Far('instanceAdmin', {
          addZoeSeatAdmin: zoeSeatAdmin => zoeSeatAdmins.add(zoeSeatAdmin),
          tellZCFToMakeSeat: (
            invitationHandle,
            zoeSeatAdmin,
            seatHandle,
          ) => {
            return E(
              /** @type {Promise<AddSeatObj>} */ (addSeatObjPromiseKit.promise),
            ).addSeat(invitationHandle, zoeSeatAdmin, seatHandle);
          },
          hasZoeSeatAdmin: zoeSeatAdmin => zoeSeatAdmins.has(zoeSeatAdmin),
          removeZoeSeatAdmin: zoeSeatAdmin =>
            zoeSeatAdmins.delete(zoeSeatAdmin),
          acceptingOffers: () => acceptingOffers,
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
        });
      };

      const instanceAdmin = makeInstanceAdmin();
      instanceToInstanceAdmin.init(instance, instanceAdmin);

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
        amountMath: invitationAmountMath,
      } = invitationKit;

      /** @type {ZoeInstanceAdmin} */
      const zoeInstanceAdminForZcf = Far('zoeInstanceAdminForZcf', {
        makeInvitation: (invitationHandle, description, customProperties) => {
          const invitationAmount = invitationAmountMath.make(
            harden([
              {
                ...customProperties,
                description,
                handle: invitationHandle,
                instance,
                installation,
              },
            ]),
          );
          return invitationMint.mintPayment(invitationAmount);
        },
        exitAllSeats: completion => instanceAdmin.exitAllSeats(completion),
        failAllSeats: reason => instanceAdmin.failAllSeats(reason),
        stopAcceptingOffers: () => instanceAdmin.stopAcceptingOffers(),
      });

      // At this point, the contract will start executing. All must be
      // ready

      const {
        creatorFacet = Far('emptyCreatorFacet', {}),
        publicFacet = Far('emptyPublicFacet', {}),
        creatorInvitation: creatorInvitationP,
        addSeatObj,
      } = await E(zcfRoot).executeContract(bundle, zoeInstanceAdminForZcf);

      addSeatObjPromiseKit.resolve(addSeatObj);
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
    offer: async invitation => {
      const invitationAmount = await invitationKit.issuer.burn(invitation);
      const invitationHandle = invitationAmount.value[0].handle;
      const instance = invitationAmount.value[0].instance;
      const instanceAdmin = instanceToInstanceAdmin.get(instance);

      const offerResultPromiseKit = makePromiseKit();
      // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
      // This does not suppress any error messages.
      offerResultPromiseKit.promise.catch(_ => {});
      const exitObjPromiseKit = makePromiseKit();
      // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
      // This does not suppress any error messages.
      exitObjPromiseKit.promise.catch(_ => {});
      const seatHandle = makeHandle('SeatHandle');

      const initialAllocation = harden({});
      const proposal = harden({
        want: Data({}),
        give: Data({}),
        exit: { onDemand: null },
      });

      const { userSeat, zoeSeatAdmin } = makeZoeSeatAdminKit(
        initialAllocation,
        instanceAdmin,
        proposal,
        brandToPurse,
        exitObjPromiseKit.promise,
        offerResultPromiseKit.promise,
      );

      seatHandleToZoeSeatAdmin.init(seatHandle, zoeSeatAdmin);

      instanceAdmin.addZoeSeatAdmin(zoeSeatAdmin);
      instanceAdmin
        .tellZCFToMakeSeat(invitationHandle, zoeSeatAdmin, seatHandle)
        .then(({ offerResultP, exitObj }) => {
          offerResultPromiseKit.resolve(offerResultP);
          exitObjPromiseKit.resolve(exitObj);
        })
        // Don't trigger Node.js's UnhandledPromiseRejectionWarning.
        // This does not suppress any error messages.
        .catch(() => {});

      return userSeat;
    },
  });

  return zoeService;
}

export { makeZoe };
