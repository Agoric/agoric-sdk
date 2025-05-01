// eslint-disable-next-line import/no-extraneous-dependencies
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

const trace = makeTracer('StartPayments', true);

/**
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       payments: Installation<StartFn>;
 *     };
 *   };
 *   instance: {
 *     produce: {
 *       payments: Producer<Instance>;
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
export const startPayments = async (
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
      consume: { payments },
    },
    instance: {
      produce: { payments: produceInstance },
    },
  },
  { options: { chainInfo, assetInfo } },
) => {
  trace(startPayments.name);

  const marshaller = await E(board).getReadonlyMarshaller();

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      localchain,
      marshaller,
      orchestrationService: cosmosInterchainService,
      storageNode: E(NonNullish(await chainStorage)).makeChildNode(
        'spikePayments',
      ),
      timerService: chainTimerService,
      chainInfo,
      assetInfo,
    }),
  );

  const { instance } = await E(startUpgradable)({
    label: 'payments',
    installation: payments,
    issuerKeywordRecord: {},
    privateArgs,
  });
  produceInstance.resolve(instance);
  trace('done');
};
harden(startPayments);

export const getManifest = ({ restoreRef }, { installationRef, options }) => {
  return {
    manifest: {
      [startPayments.name]: {
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
          consume: { payments: true },
        },
        instance: {
          produce: { payments: true },
        },
      },
    },
    installations: {
      payments: restoreRef(installationRef),
    },
    options,
  };
};
