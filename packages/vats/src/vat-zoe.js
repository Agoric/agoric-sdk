/* global HandledPromise */
import { Far } from '@agoric/far';
import { makeZoeKit } from '@agoric/zoe';

export function buildRootObject(vatPowers, vatParameters) {
  return Far('root', {
    buildZoe: async (adminVat, feeIssuerConfig) => {
      const shutdownZoeVat = vatPowers.exitVatWithFailure;
      const { zoeService, feeMintAccess } = makeZoeKit(
        adminVat,
        shutdownZoeVat,
        feeIssuerConfig,
        vatParameters.zcfBundleName,
      );

      const zoeWithoutInstallation = Far('zoe without install/startInstance', {
        ...zoeService,
        install: (..._args) => assert.fail('contract installation prohibited'),
        startInstance: (..._args) =>
          assert.fail('contract instantiation prohibited'),
      });

      // Start off with attenuated Zoe service for most users.
      let currentUserZoe = zoeWithoutInstallation;

      const userZoeForwarder = await new HandledPromise(
        (_resolve, _reject, resolveWithPresence) => {
          const forwardToCurrentUserZoe = method => (_target, ...args) =>
            HandledPromise[method](currentUserZoe, ...args);
          // Return a fresh presence that forwards E(x)... to the current zoe.
          resolveWithPresence({
            applyFunction: forwardToCurrentUserZoe('applyFunction'),
            applyMethod: forwardToCurrentUserZoe('applyMethod'),
            get: forwardToCurrentUserZoe('get'),
          });
        },
      );

      const zoeAdmin = Far('zoeAdmin', {
        setUserZoe: newZoe => {
          currentUserZoe = newZoe;
          return userZoeForwarder;
        },
        getUserZoe: () => currentUserZoe,
        getZoeWithoutInstallation: () => zoeWithoutInstallation,
      });

      return harden({
        zoeAdmin,
        zoeService,
        feeMintAccess,
      });
    },
  });
}
