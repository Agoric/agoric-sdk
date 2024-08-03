/**
 * @file A proposal to start the auto-stake-it contract.
 *
 *   AutoStakeIt allows users to to create an auto-forwarding address that
 *   transfers and stakes tokens on a remote chain when received.
 */
import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';

/**
 * @import {AutoStakeItSF} from '@agoric/orchestration/src/examples/auto-stake-it.contract.js';
 */

const contractName = 'autoAutoStakeIt';
const trace = makeTracer(contractName, true);

/**
 * @param {BootstrapPowers} powers
 */
export const startAutoStakeIt = async ({
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
    // @ts-expect-error not a WellKnownName
    consume: { [contractName]: installation },
  },
  instance: {
    // @ts-expect-error not a WellKnownName
    produce: { [contractName]: produceInstance },
  },
}) => {
  trace(`start ${contractName}`);
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, contractName);
  const marshaller = await E(board).getPublishingMarshaller();

  /** @type {StartUpgradableOpts<AutoStakeItSF>} */
  const startOpts = {
    label: 'autoAutoStakeIt',
    installation,
    terms: undefined,
    privateArgs: await deeplyFulfilled(
      // @ts-expect-error
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
harden(startAutoStakeIt);

export const getManifestForContract = (
  { restoreRef },
  { installKeys, ...options },
) => {
  return {
    manifest: {
      [startAutoStakeIt.name]: {
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
    sourceSpec: '@agoric/builders/scripts/testing/start-auto-stake-it.js',
    getManifestCall: [
      'getManifestForContract',
      {
        installKeys: {
          autoAutoStakeIt: publishRef(
            install(
              '@agoric/orchestration/src/examples/auto-stake-it.contract.js',
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
  await writeCoreEval(startAutoStakeIt.name, defaultProposalBuilder);
};
