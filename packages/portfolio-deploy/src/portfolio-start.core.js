import { makeTracer } from '@agoric/internal';
import { M } from '@endo/patterns';
import { E } from '@endo/far';
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
 * @import {AxelarChainConfigMap} from './axelar-configs.js';
 * @import {EVMContractAddressesMap} from '@aglocal/portfolio-contract/src/type-guards.ts';
 * @import {TypedPattern} from '@agoric/internal';
 * @import { ChainInfoPowers } from './chain-info.core.js';
 */

const trace = makeTracer(`YMX-Start`, true);

/**
 * @typedef {{
 *   axelarConfig: AxelarChainConfigMap;
 *   oldBoardId?: string;
 * } & CopyRecord} PortfolioDeployConfig
 */

/** @type {TypedPattern<PortfolioDeployConfig>} */
export const portfolioDeployConfigShape = M.splitRecord(
  {
    // XXX more precise shape
    axelarConfig: M.record(),
  },
  {
    oldBoardId: M.string(),
  },
);

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
    Avalanche: axelarConfig.Avalanche.axelarId,
    Arbitrum: axelarConfig.Arbitrum.axelarId,
    Optimism: axelarConfig.Optimism.axelarId,
    Polygon: axelarConfig.Polygon.axelarId,
  };

  /** @type {EVMContractAddressesMap} */
  const contracts = {
    Avalanche: { ...axelarConfig.Avalanche.contracts },
    Arbitrum: { ...axelarConfig.Arbitrum.contracts },
    Optimism: { ...axelarConfig.Optimism.contracts },
    Polygon: { ...axelarConfig.Polygon.contracts },
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
  await null;
  trace('startPortfolio', configStruct);
  /** @type {{ structure: { oldBoardId?: string } }} */
  const options = /** @type any */ (configStruct.options);
  const oldBoardId = options?.structure?.oldBoardId;

  if (oldBoardId) {
    const instance = await E(permitted.consume.board).getValue(oldBoardId);
    const kit = await permitted.consume.ymax0Kit;
    assert.equal(instance, kit.instance);
    await E(kit.adminFacet).terminateContract(
      Error('shutting down for replacement'),
    );
  }

  await permitted.consume.chainInfoPublished;

  const { issuer } = permitted;
  const [BLD, USDC, PoC26] = await Promise.all([
    issuer.consume.BLD,
    issuer.consume.USDC,
    issuer.consume.PoC26,
  ]);
  // Include BLD: BLD for use with assetInfo.brandKey
  const issuerKeywordRecord = { USDC, Access: PoC26, Fee: BLD, BLD };
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
