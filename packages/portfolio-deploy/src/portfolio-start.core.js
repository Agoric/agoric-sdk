import { makeTracer } from '@agoric/internal';
import { M } from '@endo/patterns';
import {
  lookupInterchainInfo,
  makeGetManifest,
  startOrchContract,
} from './orch.start.js';
import { name, permit } from './portfolio.contract.permit.js';
import { E } from '@endo/far';

/**
 * @import { AxelarId, start } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
 * @import { Marshaller } from '@agoric/internal/src/lib-chainStorage.js';
 * @import { CopyRecord } from '@endo/pass-style';
 * @import { LegibleCapData } from './config-marshal.js';
 * @import { OrchestrationPowersWithStorage } from './orch.start.types.ts';
 * @import {PortfolioBootPowers} from './portfolio-start.type.ts';
 * @import {AxelarChainConfigMap} from './axelar-configs.js';
 * @import {EVMContractAddressesMap} from '@aglocal/portfolio-contract/src/type-guards.ts';
 * @import {TypedPattern} from '@agoric/internal';
 * @import { ChainInfoPowers } from './chain-info.core.js';
 */

const trace = makeTracer(`YMX-Start`, true);

/**
 * @typedef {{
 *   axelarConfig: AxelarChainConfigMap;
 * } & CopyRecord} PortfolioDeployConfig
 */

/** @type {TypedPattern<PortfolioDeployConfig>} */
export const portfolioDeployConfigShape = harden({
  // XXX more precise shape
  axelarConfig: M.record(),
});

/**
 * @param {OrchestrationPowersWithStorage} orchestrationPowers
 * @param {Marshaller} marshaller
 * @param {PortfolioDeployConfig} config
 */
export const makePrivateArgs = async (
  orchestrationPowers,
  marshaller,
  config,
) => {
  const { axelarConfig } = config;
  const { agoricNames } = orchestrationPowers;
  const { chainInfo: cosmosChainInfo, assetInfo } = await lookupInterchainInfo(
    agoricNames,
    {
      agoric: ['ubld'],
      noble: ['uusdc'],
      axelar: ['uaxl'],
    },
  );

  const chainInfo = {
    ...cosmosChainInfo,
    ...Object.fromEntries(
      Object.entries(axelarConfig).map(([chain, info]) => [
        chain,
        info.chainInfo,
      ]),
    ),
  };

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

  /** @type {EVMContractAddressesMap} */
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
 * @param {BootstrapPowers & PortfolioBootPowers & ChainInfoPowers} permitted
 * @param {{ options: LegibleCapData<PortfolioDeployConfig> }} configStruct
 * @returns {Promise<void>}
 */
export const startPortfolio = async (permitted, configStruct) => {
  trace('startPortfolio', configStruct);

  await permitted.consume.chainInfoPublished;

  const {
    issuer,
    consume: { agoricNames },
  } = permitted;

  const PoC26 = await issuer.consume.PoC26;
  trace('startPortfolio: settled PoC26');
  const USDC = await E(agoricNames).lookup('issuer', 'USDC');
  trace('startPortfolio: settled USDC');
  const BLD = await E(agoricNames).lookup('issuer', 'BLD');
  trace('startPortfolio: settled BLD');

  // Include BLD: BLD for use with assetInfo.brandKey
  const issuerKeywordRecord = {
    USDC,
    Access: PoC26,
    Fee: BLD,
    BLD,
  };
  await startOrchContract(
    name,
    portfolioDeployConfigShape,
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
