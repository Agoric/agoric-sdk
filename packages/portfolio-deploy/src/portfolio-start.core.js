// import { meta } from '@aglocal/portfolio-contract/src/portfolio.contract.meta.js';
import { makeTracer } from '@agoric/internal';
import { M } from '@endo/patterns';
import {
  lookupInterchainInfo,
  makeGetManifest,
  startOrchContract,
} from './orch.start.js';
import { name, permit } from './portfolio.contract.permit.js';

/**
 * @import { start } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
 * @import {AxelarChainsMap, EVMContractAddresses } from '@aglocal/portfolio-contract/src/type-guards.js';
 * @import { Marshaller } from '@agoric/internal/src/lib-chainStorage.js';
 * @import { OrchestrationPowers } from '@agoric/orchestration';
 * @import { CopyRecord } from '@endo/pass-style';
 * @import { LegibleCapData } from './config-marshal.js';
 * @import { CorePowersG, OrchestrationPowersWithStorage } from './orch.start.types.ts';
 */

// TODO: use assetInfo, chainInfo from config too?
const deployConfigShape = M.splitRecord({});

const trace = makeTracer(`YMX-Start`, true);

// TODO: where do we get these contract addresses in production? in devnet? in multichain-testing?
/** @type {EVMContractAddresses} */
const contractAddresses = {
  aavePool: '0x1111111111111111111111111111111111111111',
  compound: '0xA0b86a33E6A3E81E27Da9c18c4A77c9Cd4e08D57',
  factory: '0xef8651dD30cF990A1e831224f2E0996023163A81',
  usdc: '0xCaC7Ffa82c0f43EBB0FC11FCd32123EcA46626cf',
};

// TODO: sort out the values for this map for production and testnet
/** @type {AxelarChainsMap} */
const axelarChainsMap = {
  Ethereum: {
    caip: 'eip155:1',
    axelarId: 'ethereum',
  },
  Avalanche: {
    caip: 'eip155:43114',
    axelarId: 'avalanche',
  },
  Base: {
    caip: 'eip155:8453',
    axelarId: 'base',
  },
};

/**
 * @param {OrchestrationPowersWithStorage} orchestrationPowers
 * @param {Marshaller} marshaller
 * @param {unknown} _config
 */
export const makePrivateArgs = async (
  orchestrationPowers,
  marshaller,
  _config,
) => {
  const { agoricNames } = orchestrationPowers;
  const { chainInfo, assetInfo } = await lookupInterchainInfo(agoricNames, {
    agoric: ['ubld'],
    noble: ['uusdc'],
    axelar: ['uaxl'],
  });
  trace('@@@@assetInfo', JSON.stringify(assetInfo, null, 2));

  /** @type {Parameters<typeof start>[1]} */
  const it = harden({
    ...orchestrationPowers,
    marshaller,
    chainInfo,
    assetInfo,
    contractAddresses,
    axelarChainsMap,
  });
  return it;
};
harden(makePrivateArgs);

/**
 * @param {BootstrapPowers & CorePowersG<name, typeof start, typeof permit>} permitted
 * @param {{ options: LegibleCapData<CopyRecord> }} configStruct
 * @returns {Promise<void>}
 */
export const startPortfolio = async (permitted, configStruct) => {
  trace('startPortfolio');
  await startOrchContract(
    name,
    deployConfigShape,
    permit,
    makePrivateArgs,
    permitted,
    configStruct,
  );

  trace('startPortfolio done');
};

// XXX hm... we need to preserve the function name.
export const getManifestForPortfolio = (u, d) =>
  makeGetManifest(startPortfolio, permit, name)(u, d);
