import { E } from '@endo/far';
import { makeTracer } from '@agoric/internal';

const trace = makeTracer('OrCE');
const { entries, fromEntries } = Object;

trace('start proposal module evaluating');

const { Fail } = assert;

const contractName = 'orca';

/**
 * Given a bundleID and a permitted name, install a bundle and "produce" the
 * installation, which also publishes it via agoricNames.
 *
 * @param {BootstrapPowers} powers - zoe, installation.produce[name]
 * @param {{ name: string; bundleID: string }} opts
 */
export const installContract = async (
  { consume: { zoe }, installation: { produce: produceInstallation } },
  { name, bundleID },
) => {
  const installation = await E(zoe).installBundleID(bundleID);
  produceInstallation[name].reset();
  produceInstallation[name].resolve(installation);
  console.log(name, '(re-)installed as', bundleID.slice(0, 8));
  return installation;
};

/**
 * Given a record whose values may be promise, return a promise for a record
 * with all the values resolved.
 *
 * @type {<T extends Record<string, ERef<any>>>(
 *   obj: T,
 * ) => Promise<{ [K in keyof T]: Awaited<T[K]> }>}
 */
export const allValues = async obj => {
  const es = await Promise.all(
    entries(obj).map(([k, vp]) => E.when(vp, v => [k, v])),
  );
  return fromEntries(es);
};

/**
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       orca: Installation<import('../examples/orca.contract.js').start>;
 *     };
 *   };
 * }} permittedPowers
 * @param config
 */
export const startOrcaContract = async (permittedPowers, config) => {
  trace('startOrcaContract()... 0.0.93');
  console.log(permittedPowers);

  const {
    consume: {
      agoricNames,
      board,
      chainTimerService,
      localchain,
      chainStorage,
      cosmosInterchainService,
      startUpgradable,
    },
    instance: {
      // @ts-expect-error not a WellKnownName
      produce: { orca: produceInstance },
    },
  } = permittedPowers;

  trace('config', config);
  trace('permittedPowers', permittedPowers);
  const {
    // must be supplied by caller or template-replaced
    bundleID = Fail`no bundleID`,
  } = config?.options?.[contractName] ?? {};

  // agoricNames gets updated each time; the promise space only once XXXXXXX

  const installation = await installContract(permittedPowers, {
    name: contractName,
    bundleID,
  });

  console.log('permittedPowers');
  console.log(permittedPowers);
  console.log('from inside startOrcaContract:', installation);

  console.log(cosmosInterchainService);
  console.log(agoricNames); // make storage node
  console.log('chainStorage');
  console.log(chainStorage);
  const storageNode = await E(chainStorage).makeChildNode('orca');

  console.log(storageNode);
  console.log('DONE MAKING NODES v0.3');
  const marshaller = await E(board).getPublishingMarshaller();
  console.log(marshaller);

  /** @type {StartUpgradableOpts<OrcaSF>} */
  const startOpts = {
    label: 'orca',
    installation,
    terms: undefined,
    privateArgs: {
      storageNode,
      marshaller,
      orchestrationService: await cosmosInterchainService,
      timerService: await chainTimerService,
      localchain: await localchain,
      agoricNames: await agoricNames,
    },
  };

  trace('startOpts', startOpts);
  const { instance } = await E(startUpgradable)(startOpts);

  trace(contractName, '(re)started WITH RESET');
  produceInstance.reset();
  produceInstance.resolve(instance);
};

/** @type {import('@agoric/vats/src/core/lib-boot').BootstrapManifest} */
const orcaManifest = {
  [startOrcaContract.name]: {
    consume: {
      agoricNames: true,
      // brandAuxPublisher: true,
      board: true,
      chainStorage: true,
      startUpgradable: true,
      zoe: true,
      localchain: true,
      chainTimerService: true,
      cosmosInterchainService: true,
    },
    installation: {
      produce: { orca: true },
      consume: { orca: true },
    },
    instance: {
      produce: { orca: true },
    },
  },
};
harden(orcaManifest);

export const getManifestForOrca = ({ restoreRef }, { installKeys }) => {
  trace('getting manifest for orca');
  trace('installKeys');
  trace(installKeys);
  return harden({
    manifest: orcaManifest,
    installations: {
      orca: restoreRef(installKeys),
    },
  });
};

export const permit = harden({
  consume: {
    agoricNames: true,
    board: true,
    chainStorage: true,
    startUpgradable: true,
    zoe: true,
    localchain: true,
    chainTimerService: true,
    cosmosInterchainService: true,
  },
  installation: {
    consume: { orca: true },
    produce: { orca: true },
  },
  instance: { produce: { orca: true } },
  brand: { consume: { BLD: true, IST: true }, produce: {} },
  issuer: { consume: { BLD: true, IST: true }, produce: {} },
});

export const main = startOrcaContract;
