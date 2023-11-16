/**
 * @file core eval script* to start the GIMiX contract.
 *
 * * to turn this module into a script:
 *   - remove `import` declarations entirely
 *   - remove `export` keyword from declarations
 *
 * The `permit` export specifies the corresponding permit.
 */
// @ts-check

import { E, Far } from '@endo/far';

const trace = (...args) => console.log('start-gimix', ...args);

const fail = msg => {
  throw Error(msg);
};

/**
 * ref https://github.com/Agoric/agoric-sdk/issues/8408#issuecomment-1741445458
 *
 * @param {ERef<import('@agoric/vats').NameAdmin>} namesByAddressAdmin
 * @param namesByAddressAdminP
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
 * @param {{ options?: { GiMiX: {
 *   bundleID: string;
 *   oracleAddress: string;
 * }}}} config
 */
export const startGiMiX = async (powers, config = {}) => {
  const {
    consume: {
      agoricNames,
      board,
      chainTimerService,
      namesByAddressAdmin,
      zoe,
    },
    instance: {
      // @ts-expect-error going beyond WellKnownName
      produce: { GiMiX: produceInstance },
    },
    issuer: {
      // @ts-expect-error going beyond WellKnownName
      produce: { GimixOracle: produceIssuer },
    },
    brand: {
      // @ts-expect-error going beyond WellKnownName
      produce: { GimixOracle: produceBrand },
    },
  } = powers;
  const {
    bundleID = fail('GiMiX bundleID not provided'),
    oracleAddress = fail('GiMiX oracleAddress not provided'),
  } = config.options?.GiMiX ?? {};

  const timerId = await E(board).getId(await chainTimerService);
  trace('timer', timerId);

  /** @type {Installation<import('./gimix').prepare>} */
  const installation = await E(zoe).installBundleID(bundleID);

  const namesByAddress = await fixHub(namesByAddressAdmin);

  const { creatorFacet, instance: gimixInstance } = await E(zoe).startInstance(
    installation,
    { Stable: await E(agoricNames).lookup('issuer', 'IST') },
    { namesByAddress, timer: await chainTimerService },
  );
  const { brands, issuers } = await E(zoe).getTerms(gimixInstance);

  const oracleInvitation = await E(creatorFacet).makeOracleInvitation();
  const oracleDepositFacet = await E(namesByAddress).lookup(
    oracleAddress,
    'depositFacet',
  );
  await E(oracleDepositFacet).receive(oracleInvitation);

  produceInstance.resolve(gimixInstance);
  produceIssuer.resolve(issuers.GimixOracle);
  produceBrand.resolve(brands.GimixOracle);

  trace('gimix started!');
};

export const manifest = /** @type {const} */ ({
  [startGiMiX.name]: {
    consume: {
      agoricNames: true,
      board: true,
      chainTimerService: true,
      namesByAddress: true,
      namesByAddressAdmin: true,
      zoe: true,
    },
    instance: {
      produce: { GiMiX: true },
    },
    issuer: {
      produce: { GimixOracle: true },
    },
    brand: {
      produce: { GimixOracle: true },
    },
  },
});

export const permit = JSON.stringify(Object.values(manifest)[0]);

// script completion value
startGiMiX;
