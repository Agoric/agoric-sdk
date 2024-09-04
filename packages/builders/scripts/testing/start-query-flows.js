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
 * @import {QueryFlowsSF as StartFn} from '@agoric/orchestration/src/fixtures/query-flows.contract.js';
 */

const contractName = 'queryFlows';
const trace = makeTracer(contractName, true);

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
 */
export const startQueryFlows = async ({
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
}) => {
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
  { installKeys, ...options },
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
export const defaultProposalBuilder = async ({ publishRef, install }) => {
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
      },
    ],
  });
};

export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startQueryFlows.name, defaultProposalBuilder);
};
