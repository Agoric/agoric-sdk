import { makeWeakStore as nonVOMakeWeakStore } from '@agoric/store';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import { makeIssuerKit, MathKind } from '@agoric/ertp';

import { Far } from '@agoric/marshal';
import zcfContractBundle from '../../bundles/bundle-contractFacet';
import { makeHandle } from '../makeHandle';

function makeZoe(vatAdminSvc) {
  const invitationKit = makeIssuerKit('Zoe Invitation', MathKind.SET);
  const installations = new WeakSet();
  const instanceToInstanceAdmin = nonVOMakeWeakStore('instance');
  const seatHandleToZoeSeatAdmin = nonVOMakeWeakStore('seatHandle');

  const install = async bundle => {
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

      const instance = makeHandle('Instance');

      const createVatResultP = E(vatAdminSvc).createVat(zcfContractBundle);
      const { root: zcfRoot } = await createVatResultP;

      const bundle = installation.getBundle();
      const addSeatObjPromiseKit = makePromiseKit();

      addSeatObjPromiseKit.promise.catch(_ => {});
      const publicFacetPromiseKit = makePromiseKit();

      publicFacetPromiseKit.promise.catch(_ => {});

      const makeInstanceAdmin = () => {
        const zoeSeatAdmins = new Set();

        /** @type {InstanceAdmin} */
        return Far('instanceAdmin', {
          addZoeSeatAdmin: zoeSeatAdmin => zoeSeatAdmins.add(zoeSeatAdmin),
          tellZCFToMakeSeat: (invitationHandle, zoeSeatAdmin, seatHandle) => {
            return E(
              /** @type {Promise<AddSeatObj>} */ (addSeatObjPromiseKit.promise),
            ).addSeat(invitationHandle, zoeSeatAdmin, seatHandle);
          },
          hasZoeSeatAdmin: zoeSeatAdmin => zoeSeatAdmins.has(zoeSeatAdmin),
          removeZoeSeatAdmin: zoeSeatAdmin =>
            zoeSeatAdmins.delete(zoeSeatAdmin),
        });
      };

      const instanceAdmin = makeInstanceAdmin();
      instanceToInstanceAdmin.init(instance, instanceAdmin);

      // Unpack the invitationKit.
      const {
        issuer: invitationIssuer,
        mint: invitationMint,
        amountMath: invitationAmountMath,
      } = invitationKit;

      /** @type {ZoeInstanceAdmin} */
      const zoeInstanceAdminForZcf = Far('zoeInstanceAdminForZcf', {
        makeInvitation: (invitationHandle, description) => {
          const invitationAmount = invitationAmountMath.make(
            harden([
              {
                description,
                handle: invitationHandle,
                instance,
                installation,
              },
            ]),
          );
          return invitationMint.mintPayment(invitationAmount);
        },
      });

      const {
        publicFacet = Far('emptyPublicFacet', {}),
        creatorInvitation: creatorInvitationP,
        addSeatObj,
      } = await E(zcfRoot).executeContract(bundle, zoeInstanceAdminForZcf);

      addSeatObjPromiseKit.resolve(addSeatObj);
      publicFacetPromiseKit.resolve(publicFacet);

      return Promise.allSettled([
        creatorInvitationP,
        invitationIssuer.isLive(creatorInvitationP),
      ]).then(([invitationResult, _isLiveResult]) => {
        let creatorInvitation;
        if (invitationResult.status === 'fulfilled') {
          creatorInvitation = invitationResult.value;
        }

        // Actually returned to the user.
        return {
          creatorInvitation,
          publicFacet,
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

      const doExit = zoeSeatAdmin => {
        instanceAdmin.removeZoeSeatAdmin(zoeSeatAdmin);
      };

      const zoeSeatAdmin = Far('zoeSeatAdmin', {
        exit: _reason => {
          doExit(zoeSeatAdmin);
        },
      });

      const userSeat = Far('userSeat', {
        getOfferResult: async () => offerResultPromiseKit.promise,
      });

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
