// import { meta } from '@aglocal/portfolio-contract/src/portfolio.contract.meta.js';
import { makeTracer } from '@agoric/internal';
import { M } from '@endo/patterns';
import { getAxelarChainsMap } from './axelar-configs.js';
import {
  lookupInterchainInfo,
  makeGetManifest,
  startOrchContract,
} from './orch.start.js';
import { name, permit } from './portfolio.contract.permit.js';

/**
 * @import { start } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
 * @import { Marshaller } from '@agoric/internal/src/lib-chainStorage.js';
 * @import { CopyRecord } from '@endo/pass-style';
 * @import { LegibleCapData } from './config-marshal.js';
 * @import { OrchestrationPowersWithStorage } from './orch.start.types.ts';
 * @import {PortfolioBootPowers} from './portfolio-start.type.ts';
 */

// TODO: use assetInfo, chainInfo from config too?
const deployConfigShape = M.splitRecord({});

const trace = makeTracer(`YMX-Start`, true);

const isValidEVMAddress = address => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * @param {OrchestrationPowersWithStorage} orchestrationPowers
 * @param {Marshaller} marshaller
 * @param {CopyRecord} config
 */
export const makePrivateArgs = async (
  orchestrationPowers,
  marshaller,
  config,
) => {
  trace('@@@config', JSON.stringify(config));
  const { agoricNames } = orchestrationPowers;
  const { chainInfo, assetInfo } = await lookupInterchainInfo(agoricNames, {
    agoric: ['ubld'],
    noble: ['uusdc'],
    axelar: ['uaxl'],
  });
  trace('@@@@assetInfo', JSON.stringify(assetInfo, null, 2));

  const axelarChainsMap = getAxelarChainsMap(config.net);
  if (!axelarChainsMap) {
    throw new Error(
      `axelarChainsMap is undefined for environment: ${config.net}`,
    );
  }

  // TODO: temporarily comment this section
  // for (const [_chain, { contractAddresses }] of Object.entries(
  //   axelarChainsMap,
  // )) {
  //   for (const [_name, address] of Object.entries(contractAddresses)) {
  //     if (!isValidEVMAddress(address)) {
  //       throw new Error(`Invalid EVM address: ${address}`);
  //     }
  //   }
  // }

  /** @type {Parameters<typeof start>[1]} */
  const it = harden({
    ...orchestrationPowers,
    marshaller,
    chainInfo,
    assetInfo,
    axelarChainsMap,
  });
  return it;
};
harden(makePrivateArgs);

/**
 * @param {BootstrapPowers & PortfolioBootPowers} permitted
 * @param {{ options: LegibleCapData<CopyRecord> }} configStruct
 * @returns {Promise<void>}
 */
export const startPortfolio = async (permitted, configStruct) => {
  trace('startPortfolio');
  const { issuer } = permitted;
  const [USDC, PoC26] = await Promise.all([
    issuer.consume.USDC,
    issuer.consume.PoC26,
  ]);
  const issuerKeywordRecord = { USDC, Access: PoC26 };
  await startOrchContract(
    name,
    deployConfigShape,
    permit,
    makePrivateArgs,
    permitted,
    configStruct,
    issuerKeywordRecord,
  );

  trace('startPortfolio done');
};

// XXX hm... we need to preserve the function name.
export const getManifestForPortfolio = (u, d) =>
  makeGetManifest(startPortfolio, permit, name)(u, d);
