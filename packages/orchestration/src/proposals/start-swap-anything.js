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

const trace = makeTracer('StartSA', true);

/**
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       swapAnything: Installation<StartFn>;
 *     };
 *   };
 *   instance: {
 *     produce: {
 *       swapAnything: Producer<Instance>;
 *     };
 *   };
 *   issuer: {
 *     consume: {
 *       BLD: Issuer<'nat'>;
 *       IST: Issuer<'nat'>;
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
export const startSwapAnything = async (
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
      consume: { swapAnything },
    },
    instance: {
      produce: { swapAnything: produceInstance },
    },
    issuer: {
      consume: { BLD, IST },
    },
  },
  { options: { chainInfo, assetInfo } },
) => {
  trace(startSwapAnything.name);

  const marshaller = await E(board).getReadonlyMarshaller();

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      localchain,
      marshaller,
      orchestrationService: cosmosInterchainService,
      storageNode: E(NonNullish(await chainStorage)).makeChildNode(
        'send-anywhere',
      ),
      timerService: chainTimerService,
      chainInfo,
      assetInfo,
    }),
  );

  const issuerKeywordRecord = harden({
    BLD: await BLD,
    IST: await IST,
  });
  trace('issuerKeywordRecord', issuerKeywordRecord);

  const { instance } = await E(startUpgradable)({
    label: 'swap-anything',
    installation: swapAnything,
    issuerKeywordRecord,
    privateArgs,
  });
  produceInstance.resolve(instance);
  trace('done');
};
harden(startSwapAnything);

export const getManifest = ({ restoreRef }, { installationRef, options }) => {
  return {
    manifest: {
      [startSwapAnything.name]: {
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
          consume: { swapAnything: true },
        },
        instance: {
          produce: { swapAnything: true },
        },
        issuer: {
          consume: { BLD: true, IST: true },
        },
      },
    },
    installations: {
      swapAnything: restoreRef(installationRef),
    },
    options,
  };
};
