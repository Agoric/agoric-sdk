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
  const instanceToCallOfferHandlerPromise = nonVOMakeWeakStore('instance');

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
      const callOfferHandlerPromiseKit = makePromiseKit();
      instanceToCallOfferHandlerPromise.init(
        instance,
        callOfferHandlerPromiseKit.promise,
      );

      const publicFacetPromiseKit = makePromiseKit();

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
        callOfferHandlerObj,
      } = await E(zcfRoot).executeContract(bundle, zoeInstanceAdminForZcf);

      callOfferHandlerPromiseKit.resolve(callOfferHandlerObj);
      publicFacetPromiseKit.resolve(publicFacet);

      return {
        creatorInvitation: creatorInvitationP,
        publicFacet,
      };
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

      const callOfferHandlerPromise = instanceToCallOfferHandlerPromise.get(
        instance,
      );
      E(callOfferHandlerPromise)
        .callOfferHandler(invitationHandle)
        .then(offerResult => offerResultPromiseKit.resolve(offerResult))
        .catch(() => {});

      return userSeat;
    },
  });

  return zoeService;
}

export { makeZoe };
