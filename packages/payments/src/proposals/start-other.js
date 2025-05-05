import {
  deeplyFulfilledObject,
  makeTracer,
  NonNullish,
} from '@agoric/internal';
import { E } from '@endo/far';

/// <reference types="@agoric/vats/src/core/types-ambient"/>

/**
 * @import {Installation} from '@agoric/zoe/src/zoeService/utils.js';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {start as StartFn} from '@agoric/orchestration/src/examples/send-anywhere.contract.js';
 */

const trace = makeTracer('StartOther', true);

/**
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       otherContract: Installation<StartFn>;
 *     };
 *   };
 *   instance: {
 *     produce: {
 *       otherContract: Producer<Instance>;
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
export const startOther = async (
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
      consume: { otherContract },
    },
    instance: {
      produce: { otherContract: produceInstance },
    },
  },
  { options: { chainInfo, assetInfo } },
) => {
  trace(startOther.name);

  const marshaller = await E(board).getReadonlyMarshaller();

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      localchain,
      marshaller,
      orchestrationService: cosmosInterchainService,
      storageNode: E(NonNullish(await chainStorage)).makeChildNode(
        'otherContract',
      ),
      timerService: chainTimerService,
      chainInfo,
      assetInfo,
    }),
  );

  const { instance } = await E(startUpgradable)({
    label: 'otherContract',
    installation: otherContract,
    issuerKeywordRecord: {},
    privateArgs,
  });
  produceInstance.resolve(instance);
  trace('done');
};
harden(startOther);

export const getManifest = ({ restoreRef }, { installationRef, options }) => {
  return {
    manifest: {
      [startOther.name]: {
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
          consume: { otherContract: true },
        },
        instance: {
          produce: { otherContract: true },
        },
      },
    },
    installations: {
      otherContract: restoreRef(installationRef),
    },
    options,
  };
};
