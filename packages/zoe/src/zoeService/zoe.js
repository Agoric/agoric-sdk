import { makeWeakStore as nonVOMakeWeakStore } from '@agoric/store';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import { makeIssuerKit, MathKind } from '@agoric/ertp';

import { Far } from '@agoric/marshal';
import zcfContractBundle from '../../bundles/bundle-contractFacet';

function makeZoe(vatAdminSvc) {
  const {
    issuer: invitationIssuer,
    mint: invitationMint,
    amountMath: invitationAmountMath,
  } = makeIssuerKit('Zoe Invitation', MathKind.SET);

  const installations = new WeakSet();
  const instanceToAddSeatPromise = nonVOMakeWeakStore('instance');

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

      const instance = Far('instance', {});

      const createVatResultP = E(vatAdminSvc).createVat(zcfContractBundle);
      const { root: zcfRoot } = await createVatResultP;

      const bundle = installation.getBundle();
      const addSeatObjPromiseKit = makePromiseKit();
      instanceToAddSeatPromise.init(instance, addSeatObjPromiseKit.promise);

      addSeatObjPromiseKit.promise.catch(_ => {});
      const publicFacetPromiseKit = makePromiseKit();

      publicFacetPromiseKit.promise.catch(_ => {});

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

      const offerResultPromiseKit = makePromiseKit();

      offerResultPromiseKit.promise.catch(_ => {});

      const userSeat = Far('userSeat', {
        getOfferResult: async () => offerResultPromiseKit.promise,
      });

      const addSeatPromise = instanceToAddSeatPromise.get(instance);
      E(addSeatPromise)
        .addSeat(invitationHandle)
        .then(({ offerResultP }) => {
          offerResultPromiseKit.resolve(offerResultP);
        })
        .catch(() => {});

      return userSeat;
    },
  });

  return zoeService;
}

export { makeZoe };
