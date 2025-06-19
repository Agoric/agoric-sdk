// import { meta } from '@aglocal/portfolio-contract/src/portfolio.contract.meta.js';
import { makeTracer, objectMap } from '@agoric/internal';
import { passStyleOf } from '@endo/pass-style';
import { M } from '@endo/patterns';
import {
  lookupInterchainInfo,
  makeGetManifest,
  startOrchContract,
} from './orch.start.js';
import { name, permit } from './portfolio.contract.permit.js';

/**
 * @import { start } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
 * @import { EVMContractAddresses } from '@aglocal/portfolio-contract/src/type-guards.js';
 * @import { Marshaller } from '@agoric/internal/src/lib-chainStorage.js';
 * @import { OrchestrationPowers } from '@agoric/orchestration';
 * @import { CopyRecord } from '@endo/pass-style';
 * @import { LegibleCapData } from './config-marshal.js';
 * @import { CorePowersG } from './orch.start.types.ts';
 */

// TODO: use assetInfo, chainInfo from config too?
const deployConfigShape = M.splitRecord({});

const trace = makeTracer(`YMX-Start`, true);

// TODO: where do we get these contract addresses in production? in devnet? in multichain-testing?
/** @type {EVMContractAddresses} */
const contract = {
  aavePool: '0x87870Bca3F0fD6335C3F4ce8392D69350B4fA4E2', // Aave V3 Pool
  compound: '0xA0b86a33E6A3E81E27Da9c18c4A77c9Cd4e08D57', // Compound USDC
  factory: '0xef8651dD30cF990A1e831224f2E0996023163A81', // Factory contract
};

/**
 * @param {OrchestrationPowers} orchestrationPowers
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
    contract,
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
  const { config, kit } = await startOrchContract(
    name,
    deployConfigShape,
    permit,
    makePrivateArgs,
    permitted,
    configStruct,
  );

  trace('startPortfolio done', {
    config: objectMap(config, v => passStyleOf(v)),
    kit: objectMap(kit, v => passStyleOf(v)),
  });
};

// XXX hm... we need to preserve the function name.
export const getManifestForPortfolio = (u, d) =>
  makeGetManifest(startPortfolio, permit, name)(u, d);
