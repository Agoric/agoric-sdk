import { E } from '@endo/far';
import { makeTracer } from '@agoric/internal';

/// <reference types="@agoric/vats/src/core/types-ambient"/>
/// <reference types="@agoric/zoe/src/contractFacet/types-ambient"/>

const trace = makeTracer('OmniflixTipProposal');
const { entries, fromEntries } = Object;

trace('Starting proposal module evaluation');

const contractName = 'omniflixTip';

/** @type {import('@agoric/orchestration').IBCConnectionInfo} */
const osmosisToOmniflixConnection = harden({
  id: 'connection-0',
  client_id: 'client-0',
  state: 3, // OPEN
  counterparty: {
    client_id: 'client-0',
    connection_id: 'connection-0',
    prefix: { key_prefix: 'key-prefix-0' },
  },
  transferChannel: {
    portId: 'transfer',
    channelId: 'channel-0',
    counterPartyPortId: 'transfer',
    counterPartyChannelId: 'channel-1',
    ordering: 2, // ORDERED
    version: '1',
    state: 3, // OPEN
  },
});

/** @type {Record<string, import('@agoric/orchestration').ChainInfo>} */
export const chainDetails = harden({
  agoric: {
    chainId: 'agoriclocal',
    stakingTokens: [{ denom: 'ubld' }],
    connections: { osmosislocal: osmosisToOmniflixConnection },
  },
  osmosis: {
    chainId: 'osmosislocal',
    stakingTokens: [{ denom: 'uosmo' }],
    connections: { omniflixlocal: osmosisToOmniflixConnection },
  },
  omniflix: {
    chainId: 'omniflixlocal',
    stakingTokens: [{ denom: 'uflix' }],
  },
});

/**
 * Resolves all promise values in a record.
 * @type {<T extends Record<string, import('@endo/far').ERef<any>>>(obj: T) => Promise<{ [K in keyof T]: Awaited<T[K]>}>}
 */
export const allValues = async obj => {
  const es = await Promise.all(
    entries(obj).map(([k, vp]) => E.when(vp, v => [k, v])),
  );
  return fromEntries(es);
};

/**
 * Starts the OmniflixTip contract.
 * @param {import('@agoric/vats/src/core/lib-boot.js').BootstrapPowers & { installation: { consume: { omniflixTip: import('@agoric/zoe/src/zoeService/utils.js').Installation<any> }}}} permittedPowers
 * @param {{ options: { [contractName]: { bundleID: string; chainDetails: Record<string, import('@agoric/orchestration').ChainInfo> }}}} config
 */
export const startOmniflixTipContract = async (permittedPowers, config) => {
  trace('Starting startOmniflixTipContract', config);

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
    installation: {
      consume: { omniflixTip: omniflixTipInstallation },
    },
    instance: {
      produce: { omniflixTip: produceInstance },
    },
  } = permittedPowers;

  const installation = await omniflixTipInstallation;

  const storageNode = await E(chainStorage).makeChildNode('omniflixTip');
  const marshaller = await E(board).getPublishingMarshaller();

  const { chainDetails: nameToInfo = chainDetails } =
    config.options[contractName];

  /** @type {import('@agoric/zoe/src/zoeService/utils.js').StartUpgradableOpts<any>} */
  const startOpts = {
    label: 'omniflixTip',
    installation,
    terms: { chainDetails: nameToInfo },
    privateArgs: {
      localchain: await localchain,
      orchestrationService: await cosmosInterchainService,
      storageNode,
      timerService: await chainTimerService,
      agoricNames: await agoricNames,
      marshaller,
    },
  };

  trace('startOpts', startOpts);
  const { instance } = await E(startUpgradable)(startOpts);

  trace(contractName, '(re)started WITH RESET');
  produceInstance.reset();
  produceInstance.resolve(instance);
};

/** @type {import('@agoric/vats/src/core/lib-boot.js').BootstrapManifest} */
const omniflixTipManifest = harden({
  [startOmniflixTipContract.name]: {
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
      produce: { omniflixTip: true },
      consume: { omniflixTip: true },
    },
    instance: {
      produce: { omniflixTip: true },
    },
  },
});

/**
 * Returns the manifest for deploying the OmniflixTip contract.
 * @param {{ restoreRef: (ref: string) => any }} options
 * @param {{ installKeys: Record<string, string>, chainDetails: Record<string, import('@agoric/orchestration').ChainInfo> }} config
 */
export const getManifestForOmniflixTip = (
  { restoreRef },
  { installKeys, chainDetails },
) => {
  trace('getManifestForOmniflixTip', installKeys);
  return harden({
    manifest: omniflixTipManifest,
    installations: {
      [contractName]: restoreRef(installKeys[contractName]),
    },
    options: {
      [contractName]: { chainDetails },
    },
  });
};

/** Permissions required for the OmniflixTip contract */
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
    consume: { omniflixTip: true },
    produce: { omniflixTip: true },
  },
  instance: { produce: { omniflixTip: true } },
  brand: { consume: {}, produce: {} },
  issuer: { consume: {}, produce: {} },
});

export const main = startOmniflixTipContract;