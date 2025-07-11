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
 * @import { AxelarId, start } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
 * @import { Marshaller } from '@agoric/internal/src/lib-chainStorage.js';
 * @import { CopyRecord } from '@endo/pass-style';
 * @import { LegibleCapData } from './config-marshal.js';
 * @import { OrchestrationPowersWithStorage } from './orch.start.types.ts';
 * @import {PortfolioBootPowers} from './portfolio-start.type.ts';
 */

// TODO: use assetInfo, chainInfo from config too?
const deployConfigShape = M.splitRecord({});

const trace = makeTracer(`YMX-Start`, true);

/**
 * @param {OrchestrationPowersWithStorage} orchestrationPowers
 * @param {Marshaller} marshaller
 * @param {CopyRecord} _config
 * @param {import('./axelar-configs.js').AxelarChainConfigMap} axelarConfig
 */
export const makePrivateArgs = async (
  orchestrationPowers,
  marshaller,
  _config,
  axelarConfig,
) => {
  const { agoricNames } = orchestrationPowers;
  const { chainInfo: cosmosChainInfo, assetInfo } = await lookupInterchainInfo(
    agoricNames,
    {
      agoric: ['ubld'],
      noble: ['uusdc'],
      axelar: ['uaxl'],
    },
  );
  /** @type {Record<string, import('@agoric/orchestration').ChainInfo>} */
  const chainInfo = { ...cosmosChainInfo };

  /** @type {AxelarId} */
  const axelarIds = {
    Ethereum: axelarConfig.Ethereum.axelarId,
    Avalanche: axelarConfig.Avalanche.axelarId,
    Arbitrum: axelarConfig.Arbitrum.axelarId,
    Optimism: axelarConfig.Optimism.axelarId,
    Binance: axelarConfig.Binance.axelarId,
    Polygon: axelarConfig.Polygon.axelarId,
    Fantom: axelarConfig.Fantom.axelarId,
  };

  /** @type {import('@aglocal/portfolio-contract/src/type-guards.ts').EVMContractAddressesMap} */
  const contracts = {
    Ethereum: { ...axelarConfig.Ethereum.contracts },
    Avalanche: { ...axelarConfig.Avalanche.contracts },
    Arbitrum: { ...axelarConfig.Arbitrum.contracts },
    Optimism: { ...axelarConfig.Optimism.contracts },
    Binance: { ...axelarConfig.Binance.contracts },
    Polygon: { ...axelarConfig.Polygon.contracts },
    Fantom: { ...axelarConfig.Fantom.contracts },
  };

  /** @type {Parameters<typeof start>[1]} */
  const it = harden({
    ...orchestrationPowers,
    marshaller,
    chainInfo,
    assetInfo,
    axelarIds,
    contracts,
  });
  return it;
};
harden(makePrivateArgs);

/**
 * @param {BootstrapPowers & PortfolioBootPowers} permitted
 * @param {{ options: LegibleCapData<CopyRecord> }} configStruct
 * @param {import('./axelar-configs.js').AxelarChainConfigMap} axelarConfig
 * @returns {Promise<void>}
 */
export const startPortfolio = async (permitted, configStruct, axelarConfig) => {
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
    axelarConfig,
    configStruct,
    issuerKeywordRecord,
  );

  trace('startPortfolio done');
};

// XXX hm... we need to preserve the function name.
export const getManifestForPortfolio = (u, d) =>
  makeGetManifest(startPortfolio, permit, name)(u, d);
