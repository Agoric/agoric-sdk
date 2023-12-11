/**
 * @file core eval script* to start the postalSvc contract.
 *
 * * see test-gimix-proposal.js to make a script from this file.
 *
 * The `permit` export specifies the corresponding permit.
 */
// @ts-check

import { E, Far } from '@endo/far';

export const oneScript = (p0, c0) => {
  const { Fail } = assert;

  const trace = (...args) => console.log('-- start-postalSvc:', ...args);
  trace('defining functions');

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
   * @param {{options?: { postalSvc?: { bundleID?: string} }}} [config]
   */
  const installPostalSvc = async (powers, { options } = {}) => {
    trace('installPostalSvc()...');
    const {
      consume: { zoe },
      installation: {
        produce: { postalSvc: produceInstallation },
      },
    } = powers;
    const {
      // rendering this template requires not re-flowing the next line
      bundleID = Fail(`bundleID required`),
    } = options?.postalSvc || {};

    trace('bundleID', bundleID);

    const installation = await E(zoe).installBundleID(bundleID);
    produceInstallation.reset();
    produceInstallation.resolve(installation);
    trace('postalSvc installed');
  };

  /**
   * @param {BootstrapPowers} powers
   * @param {{ options?: { postalSvc: {
   *   bundleID: string;
   * }}}} [_config]
   */
  const startPostalSvc = async (powers, _config) => {
    trace('startPostalSvc()...');
    const {
      consume: { zoe, namesByAddressAdmin },
      produce: { postalSvcStartResult },
      installation: {
        // @ts-expect-error not statically known at genesis
        consume: { postalSvc: consumeInstallation },
      },
      instance: {
        // @ts-expect-error not statically known at genesis
        produce: { postalSvc: produceInstance },
      },
    } = powers;

    /** @type {Installation<import('./postalSvc').start>} */
    const installation = await consumeInstallation;

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

  /**
   * @param {BootstrapPowers} powers
   * @param {{options?: { postalSvc?: { shutdown?: boolean} }}} [config]
   */
  const shutdownPostalSvc = async (
    { consume: { postalSvcStartResult }, produce: { postalSvcShutdown } },
    { options } = {},
  ) => {
    const {
      // rendering this template requires not re-flowing the next line
      shutdown = false,
    } = options?.postalSvc || {};
    if (!shutdown) return;
    trace('awaiting shutdown');
    const kit = await postalSvcStartResult;
    const reason = await E(kit.adminFacet).getVatShutdownPromise();
    trace('shutdown reason', reason);
    postalSvcShutdown.resolve(reason);
  };

  trace('core eval function called');
  return Promise.all([
    installPostalSvc(p0, c0),
    startPostalSvc(p0, c0),
    // shutdownPostalSvc(p, c),
  ]);
};

export const startPostalSvc = oneScript;

export const manifest = /** @type {const} */ ({
  startPostalSvc: {
    consume: {
      agoricNames: true,
      namesByAddress: true,
      namesByAddressAdmin: true,
      zoe: true,
    },
    produce: { postalSvcStartResult: true, postalSvcShutdown: true },
    installation: {
      produce: { postalSvc: true },
      consume: { postalSvc: true },
    },
    instance: {
      produce: { postalSvc: true },
    },
  },
});

export const permit = JSON.stringify(Object.values(manifest)[0]);

// script completion value
startPostalSvc;
