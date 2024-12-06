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
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 */

const contractName = 'autoAutoStakeIt';
const trace = makeTracer(contractName, true);

/**
 * @param {BootstrapPowers} powers
 * @param {{
 *   options: {
 *     chainInfo: Record<string, CosmosChainInfo>;
 *     assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
 *   };
 * }} config
 */
export const startAutoStakeIt = async (
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
      // @ts-expect-error not a WellKnownName
      consume: { [contractName]: installation },
    },
    instance: {
      // @ts-expect-error not a WellKnownName
      produce: { [contractName]: produceInstance },
    },
  },
  { options: { chainInfo, assetInfo } },
) => {
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
        chainInfo,
        assetInfo,
      }),
    ),
  };

  const { instance } = await E(startUpgradable)(startOpts);
  produceInstance.resolve(instance);
};
harden(startAutoStakeIt);

export const getManifest = ({ restoreRef }, { installKeys, options }) => {
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
