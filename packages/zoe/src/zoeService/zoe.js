import { makeWeakStore as nonVOMakeWeakStore } from '@agoric/store';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import { makeIssuerKit, MathKind } from '@agoric/ertp';

import { Far } from '@agoric/marshal';
import zcfContractBundle from '../../bundles/bundle-contractFacet';
import { makeHandle } from '../makeHandle';

function makeZoe(vatAdminSvc) {
  const {
    issuer: invitationIssuer,
    mint: invitationMint,
    amountMath: invitationAmountMath,
  } = makeIssuerKit('Zoe Invitation', MathKind.SET);

  const installations = new WeakSet();
  const instanceToInstanceAdmin = nonVOMakeWeakStore('instance');

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
          tellZCFToMakeSeat: (invitationHandle, zoeSeatAdmin) => {
            return E(
              /** @type {Promise<AddSeatObj>} */ (addSeatObjPromiseKit.promise),
            ).addSeat(invitationHandle, zoeSeatAdmin);
          },
          hasZoeSeatAdmin: zoeSeatAdmin => zoeSeatAdmins.has(zoeSeatAdmin),
          removeZoeSeatAdmin: zoeSeatAdmin =>
            zoeSeatAdmins.delete(zoeSeatAdmin),
        });
      };

      const instanceAdmin = makeInstanceAdmin();
      instanceToInstanceAdmin.init(instance, instanceAdmin);

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

        return {
          creatorInvitation,
          publicFacet,
        };
      });
    },
    offer: async invitation => {
      const invitationAmount = await invitationIssuer.burn(invitation);
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

      instanceAdmin.addZoeSeatAdmin(zoeSeatAdmin);
      instanceAdmin
        .tellZCFToMakeSeat(invitationHandle, zoeSeatAdmin)
        .then(({ offerResultP, exitObj }) => {
          offerResultPromiseKit.resolve(offerResultP);
          exitObjPromiseKit.resolve(exitObj);
        })
        .catch(() => {});

      return userSeat;
    },
  });

  return zoeService;
}

export { makeZoe };
