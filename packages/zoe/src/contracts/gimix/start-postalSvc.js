/**
 * @file core eval script* to start the postalSvc contract.
 *
 * * see test-gimix-proposal.js to make a script from this file.
 *
 * The `permit` export specifies the corresponding permit.
 */
// @ts-check

import { E, Far } from '@endo/far';

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
  // @ts-expect-error mock. no has, keys, ...
  const hub = Far('Hub work-around', {
    lookup: async (addr, key, ...rest) => {
      if (!(addr && key && rest.length === 0)) {
        throw Error('unsupported');
      }
      await E(namesByAddressAdmin).reserve(addr);
      const addressAdmin = await E(namesByAddressAdmin).lookupAdmin(addr);
      assert(addressAdmin, 'no admin???');
      await E(addressAdmin).reserve(key);
      const addressHub = E(addressAdmin).readonly();
      return E(addressHub).lookup(key);
    },
  });
  return hub;
};

/**
 * @param {BootstrapPowers} powers
 * @param {{ options?: { postalSvc: {
 *   bundleID: string;
 * }}}} config
 */
export const startPostalSvc = async (powers, config) => {
  const {
    consume: { zoe, namesByAddressAdmin },
    installation: {
      // @ts-expect-error not statically known at genesis
      produce: { postalSvc: produceInstallation },
    },
    instance: {
      // @ts-expect-error not statically known at genesis
      produce: { postalSvc: produceInstance },
    },
  } = powers;
  const { bundleID = fail(`no bundleID; try test-gimix-proposal.js?`) } =
    config.options?.postalSvc ?? {};

  /** @type {Installation<import('./postalSvc').start>} */
  const installation = await E(zoe).installBundleID(bundleID);
  produceInstallation.resolve(installation);

  const namesByAddress = await fixHub(namesByAddressAdmin);

  const [IST, Invitation] = await Promise.all([
    E(zoe).getFeeIssuer(),
    E(zoe).getInvitationIssuer(),
  ]);
  const { instance } = await E(zoe).startInstance(
    installation,
    { IST, Invitation },
    { namesByAddress },
  );
  produceInstance.resolve(instance);

  trace('postalSvc started');
};

export const manifest = /** @type {const} */ ({
  [startPostalSvc.name]: {
    consume: {
      agoricNames: true,
      namesByAddress: true,
      namesByAddressAdmin: true,
      zoe: true,
    },
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
