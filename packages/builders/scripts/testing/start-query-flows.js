/**
 * @file A proposal to start the query-flows contract.
 *
 * QueryFlows is a testing fixture that publishes query results to vstorage.
 * It's purpose is to support E2E testing.
 */
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';

/**
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {QueryFlowsSF as StartFn} from '@agoric/orchestration/src/fixtures/query-flows.contract.js';
 * @import {ParseArgsConfig} from 'node:util'
 */

const contractName = 'queryFlows';
const trace = makeTracer(contractName, true);

/** @type {ParseArgsConfig['options']} */
const parserOpts = {
  chainInfo: { type: 'string' },
  assetInfo: { type: 'string' },
};

/**
 * See `@agoric/builders/builders/scripts/orchestration/init-query-flows.js` for
 * the accompanying proposal builder. Run `agoric run
 * packages/builders/scripts/orchestration/init-query-flows.js` to build the
 * contract and proposal files.
 *
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       queryFlows: Installation<StartFn>;
 *     };
 *   };
 * }} powers
 * @param {{
 *   options: {
 *     chainInfo: Record<string, CosmosChainInfo>;
 *     assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
 *   };
 * }} config
 */
export const startQueryFlows = async (
  {
    consume: {
      agoricNames,
      board,
      chainStorage,
      chainTimerService,
      cosmosInterchainService,
      localchain,
      startUpgradable,
    },
    installation: {
      consume: { [contractName]: installation },
    },
    instance: {
      // @ts-expect-error unknown instance
      produce: { [contractName]: produceInstance },
    },
  },
  { options: { chainInfo, assetInfo } },
) => {
  trace(`start ${contractName}`);

  const storageNode = await makeStorageNodeChild(chainStorage, contractName);
  const marshaller = await E(board).getPublishingMarshaller();

  /** @type {StartUpgradableOpts<StartFn>} */
  const startOpts = {
    label: 'queryFlows',
    installation,
    terms: undefined,
    privateArgs: await deeplyFulfilledObject(
      harden({
        agoricNames,
        assetInfo,
        chainInfo,
        orchestrationService: cosmosInterchainService,
        localchain,
        storageNode,
        marshaller,
        timerService: chainTimerService,
      }),
    ),
  };

  const { instance } = await E(startUpgradable)(startOpts);
  produceInstance.resolve(instance);
};
harden(startQueryFlows);

export const getManifestForContract = (
  { restoreRef },
  { installKeys, options },
) => {
  return {
    manifest: {
      [startQueryFlows.name]: {
        consume: {
          agoricNames: true,
          board: true,
          chainStorage: true,
          chainTimerService: true,
          cosmosInterchainService: true,
          localchain: true,
          startUpgradable: true,
        },
        installation: {
          consume: { [contractName]: true },
        },
        instance: {
          produce: { [contractName]: true },
        },
      },
    },
    installations: {
      [contractName]: restoreRef(installKeys[contractName]),
    },
    options,
  };
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) => {
  return harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@agoric/builders/scripts/testing/start-query-flows.js',
    getManifestCall: [
      'getManifestForContract',
      {
        installKeys: {
          queryFlows: publishRef(
            install(
              '@agoric/orchestration/src/fixtures/query-flows.contract.js',
            ),
          ),
        },
        options,
      },
    ],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  // import dynamically so the modules can work in CoreEval environment
  const { makeHelpers } = await import('@agoric/deploy-script-support');
  const { parseArgs } = await import('node:util');
  const { scriptArgs } = endowments;

  const {
    values: { chainInfo, assetInfo },
  } = parseArgs({
    args: scriptArgs,
    options: parserOpts,
  });

  const parseChainInfo = () => {
    if (typeof chainInfo !== 'string') return undefined;
    return JSON.parse(chainInfo);
  };
  const parseAssetInfo = () => {
    if (typeof assetInfo !== 'string') return undefined;
    return JSON.parse(assetInfo);
  };
  const opts = harden({
    chainInfo: parseChainInfo(),
    assetInfo: parseAssetInfo(),
  });
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startQueryFlows.name, utils =>
    defaultProposalBuilder(utils, opts),
  );
};
