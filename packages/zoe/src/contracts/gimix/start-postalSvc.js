/**
 * @file core eval script* to start the postalSvc contract.
 *
 * * see test-gimix-proposal.js to make a script from this file.
 *
 * The `permit` export specifies the corresponding permit.
 */
// @ts-check

import { E, Far } from '@endo/far';

export const oneScript = () => {
  const { Fail } = assert;

  const trace = (...args) => console.log('start-postalSvc', ...args);

  const fail = msg => {
    throw Error(msg);
  };

  /**
   * ref https://github.com/Agoric/agoric-sdk/issues/8408#issuecomment-1741445458
   *
   * @param {ERef<import('@agoric/vats').NameAdmin>} namesByAddressAdmin
   */
  const fixHub = async namesByAddressAdmin => {
    /** @type {import('@agoric/vats').NameHub} */
    const hub = Far('Hub work-around', {
      lookup: async (addr, ...rest) => {
        await E(namesByAddressAdmin).reserve(addr);
        const addressAdmin = await E(namesByAddressAdmin).lookupAdmin(addr);
        assert(addressAdmin, 'no admin???');
        const addressHub = E(addressAdmin).readonly();
        if (rest.length === 0) return addressHub;
        await E(addressAdmin).reserve(rest[0]);
        return E(addressHub).lookup(...rest);
      },
      has: _key => Fail`key space not well defined`,
      entries: () => Fail`enumeration not supported`,
      values: () => Fail`enumeration not supported`,
      keys: () => Fail`enumeration not supported`,
    });
    return hub;
  };

  /**
   * @param {BootstrapPowers} powers
   * @param {{ options?: { postalSvc: {
   *   bundleID: string;
   * }}}} config
   */
  const startPostalSvc = async (powers, { options } = {}) => {
    const {
      consume: { zoe, namesByAddressAdmin },
      produce: { postalSvcStartResult },
      installation: {
        // @ts-expect-error not statically known at genesis
        produce: { postalSvc: produceInstallation },
      },
      instance: {
        // @ts-expect-error not statically known at genesis
        produce: { postalSvc: produceInstance },
      },
    } = powers;
    const {
      // rendering this template requires not re-flowing the next line
      bundleID = fail(`bundleID required`),
    } = options?.postalSvc ?? {};

    /** @type {Installation<import('./postalSvc').start>} */
    const installation = await E(zoe).installBundleID(bundleID);
    produceInstallation.resolve(installation);

    const namesByAddress = await fixHub(namesByAddressAdmin);

    const [IST, Invitation] = await Promise.all([
      E(zoe).getFeeIssuer(),
      E(zoe).getInvitationIssuer(),
    ]);
    const startResult = await E(zoe).startInstance(
      installation,
      { IST, Invitation },
      { namesByAddress },
    );
    postalSvcStartResult.resolve(startResult);
    const { instance } = startResult;
    produceInstance.resolve(instance);

    trace('postalSvc started');
  };
  return startPostalSvc;
};

export const startPostalSvc = oneScript();

export const manifest = /** @type {const} */ ({
  startPostalSvc: {
    consume: {
      agoricNames: true,
      namesByAddress: true,
      namesByAddressAdmin: true,
      zoe: true,
    },
    produce: { postalSvcStartResult: true },
    installation: {
      produce: { postalSvc: true },
    },
    instance: {
      produce: { postalSvc: true },
    },
  },
});

export const permit = JSON.stringify(Object.values(manifest)[0]);

// script completion value
startPostalSvc;
