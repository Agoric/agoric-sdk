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
 */

const trace = makeTracer('StartSA', true);

/**
 * @import {start as StartFn} from '@agoric/orchestration/src/examples/send-anywhere.contract.js';
 */

/**
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       sendAnywhere: Installation<StartFn>;
 *     };
 *   };
 *   issuer: {
 *     consume: {
 *       BLD: Issuer<'nat'>;
 *       IST: Issuer<'nat'>;
 *       USDC: Issuer<'nat'>;
 *     };
 *   };
 * }} powers
 * @param {{
 *   options: {
 *     chainInfo: Record<string, CosmosChainInfo>;
 *     assetInfo: Record<Denom, DenomDetail & { brandKey?: string }>;
 *   };
 * }} config
 */
export const startSendAnywhere = async (
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
      consume: { sendAnywhere },
    },
    instance: {
      // @ts-expect-error unknown instance
      produce: { sendAnywhere: produceInstance },
    },
    issuer: {
      consume: { BLD, IST },
    },
  },
  { options: { chainInfo, assetInfo } },
) => {
  trace(startSendAnywhere.name);

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

  const { instance } = await E(startUpgradable)({
    label: 'send-anywhere',
    installation: sendAnywhere,
    issuerKeywordRecord: {
      Stable: await IST,
      Stake: await BLD,
    },
    privateArgs,
  });
  produceInstance.resolve(instance);
  trace('done');
};
harden(startSendAnywhere);

export const getManifest = ({ restoreRef }, { installationRef, options }) => {
  return {
    manifest: {
      [startSendAnywhere.name]: {
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
          consume: { sendAnywhere: true },
        },
        instance: {
          produce: { sendAnywhere: true },
        },
        issuer: {
          consume: { BLD: true, IST: true },
        },
      },
    },
    installations: {
      sendAnywhere: restoreRef(installationRef),
    },
    options,
  };
};
