import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('StartQuickSend', true);
const { Fail } = assert;

/**
 * @import {Instance} from '@agoric/zoe/src/zoeService/utils';
 * @import {Board} from '@agoric/vats';
 * @import {QuickSendContractFn} from '../examples/quickSend.contract.js';
 * @import {ManifestBundleRef} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js';
 */

/**
 * @param {string} path
 * @param {{
 *   chainStorage: ERef<StorageNode | null>;
 *   board: ERef<Board>;
 * }} io
 */
const makePublishingStorageKit = async (path, { chainStorage, board }) => {
  const root = await chainStorage;
  root || Fail`chainStorage null case is vestigial`;
  const storageNode = await E(chainStorage)?.makeChildNode(path);

  const marshaller = await E(board).getPublishingMarshaller();
  return { storageNode, marshaller };
};

/**
 * @typedef {{ watcherAddress: string }} QuickSendConfig
 */

/**
 * @param {BootstrapPowers & {
 *   installation: PromiseSpaceOf<{
 *     quickSend: Installation<QuickSendContractFn>;
 *   }>;
 *   instance: PromiseSpaceOf<{
 *     quickSend: Instance<QuickSendContractFn>;
 *   }>;
 *   brand: PromiseSpaceOf<{ USDC: Brand<'nat'> }>;
 * }} powers
 * @param {{ options?: { quickSend?: QuickSendConfig } }} config
 */
export const startQuickSend = async (
  {
    consume: {
      agoricNames,
      namesByAddress,
      board,
      chainStorage,
      chainTimerService: timerService,
      localchain,
      cosmosInterchainService,
      startUpgradable,
    },
    installation: {
      consume: { quickSend },
    },
    instance: {
      produce: { quickSend: produceInstance },
    },
    brand,
    issuer,
  },
  config = {},
) => {
  trace('startQuickSend');
  const { watcherAddress = 'agoric1watcher' } = config.options?.quickSend || {};

  await null;
  const USDC = {
    brand: await brand.consume.IST, // TODO: USDC interchain asset
    issuer: await issuer.consume.IST,
  };
  const terms = {
    makerFee: AmountMath.make(USDC.brand, 100n), // TODO: parameterize
    contractFee: AmountMath.make(USDC.brand, 30n),
  };
  const { storageNode, marshaller } = await makePublishingStorageKit(
    'quickSend',
    { board, chainStorage },
  );
  assert(storageNode);

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      localchain,
      orchestrationService: cosmosInterchainService,
      storageNode,
      timerService,
      marshaller,
    }),
  );

  /**
   * @type {StartUpgradableOpts<QuickSendContractFn>}
   */
  const startOpts = {
    label: 'quickSend',
    installation: quickSend,
    issuerKeywordRecord: harden({ Fee: USDC.issuer }),
    terms,
    privateArgs,
  };

  const { instance, creatorFacet } = await E(startUpgradable)(startOpts);
  trace('CF', creatorFacet);
  const toWatch = await E(creatorFacet).getWatcherInvitation();
  /** @type {ERef<import('@agoric/ertp/src/types.js').DepositFacet>} */
  const wdf = E(namesByAddress).lookup(watcherAddress, 'depositFacet');
  await E(wdf).receive(toWatch);

  produceInstance.resolve(instance);
  trace('done');
};
harden(startQuickSend);

/**
 * @param {{
 *   restoreRef: (b: ERef<ManifestBundleRef>) => Promise<Installation>;
 * }} utils
 * @param {{
 *   installKeys: { quickSend: ERef<ManifestBundleRef> };
 *   options?: { quickSend?: QuickSendConfig };
 * }} param1
 */
export const getManifestForQuickSend = (
  { restoreRef },
  { installKeys, options },
) => {
  return {
    /** @type {BootstrapManifest} */
    manifest: {
      [startQuickSend.name]: {
        consume: {
          chainStorage: true,
          chainTimerService: true,
          localchain: true,
          cosmosInterchainService: true,

          // limited distribution durin MN2: contract installation
          startUpgradable: true,

          // widely shared: name services
          agoricNames: true,
          namesByAddress: true,
          board: true,
        },
        installation: {
          consume: { quickSend: true },
        },
        instance: {
          produce: { quickSend: true },
        },
        brand: {
          consume: {
            // TODO USDC
            IST: true,
          },
        },
        issuer: {
          consume: {
            // TODO USDC
            IST: true,
          },
        },
      },
    },
    installations: {
      quickSend: restoreRef(installKeys.quickSend),
    },
    options,
  };
};
