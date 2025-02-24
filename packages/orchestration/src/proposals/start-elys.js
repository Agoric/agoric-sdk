/**
 * @file A proposal to start the elys contract.
 *
 *   ElysContract allows users to liquid stake their tokens on stride and receive
 *   the stTokens on elys, in one click.
 */
import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';

/**
 * @import {ElysContract} from '@agoric/orchestration/src/examples/elys.contract.js';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 */

const contractName = 'ElysContract';
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
export const startElys = async (
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

  const feeConfig = {
    feeCollector: 'agoric1feeCollectorAddress',
    onBoardRate: {
      nominator: BigInt(20),
      denominator: BigInt(100),
    }, // 20%
    offBoardRate: {
      nominator: BigInt(10),
      denominator: BigInt(100),
    }, // 10%
  }
  const allowedChains = ['cosmoshub'];

  /** @type {StartUpgradableOpts<ElysContract>} */
  const startOpts = {
    label: 'ElysStrideContract',
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
        feeConfig,
        allowedChains
      }),
    ),
  };

  const { instance } = await E(startUpgradable)(startOpts);
  produceInstance.resolve(instance);
};
harden(startElys);

export const getManifest = ({ restoreRef }, { installKeys, options }) => {
  return {
    manifest: {
      [startElys.name]: {
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