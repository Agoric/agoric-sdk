import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { Stake } from '@agoric/internal/src/tokens.js';
import { E } from '@endo/far';

const trace = makeTracer('StartQuickSend', true);
const { Fail } = assert;

/**
 * @import {Instance} from '@agoric/zoe/src/zoeService/utils';
 * @import {Board} from '@agoric/vats';
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
 * @param {BootstrapPowers & {
 *   installation: PromiseSpaceOf<{
 *     quickSend: Installation<
 *       import('../examples/quickSend.contract.js').start
 *     >;
 *   }>;
 *   instance: PromiseSpaceOf<{
 *     quickSend: Instance<import('../examples/quickSend.contract.js').start>;
 *   }>;
 * }} powers
 */
export const startQuickSend = async ({
  consume: {
    agoricNames,
    board,
    chainStorage,
    chainTimerService: timerService,
    localchain,
    startUpgradable,
  },
  installation: {
    consume: { quickSend },
  },
  instance: {
    produce: { quickSend: produceInstance },
  },
  issuer: {
    consume: { [Stake.symbol]: stakeIssuer },
  },
}) => {
  trace('startQuickSend');
  const { storageNode, marshaller } = await makePublishingStorageKit(
    'quickSend',
    { board, chainStorage },
  );

  const privateArgs = await deeplyFulfilledObject(
    harden({ agoricNames, localchain, timerService, storageNode, marshaller }),
  );

  /**
   * @type {StartUpgradableOpts<
   *   import('../examples/quickSend.contract.js').start
   * >}
   */
  const startOpts = {
    label: 'quickSend',
    installation: quickSend,
    issuerKeywordRecord: harden({ In: await stakeIssuer }),
    terms: {},
    privateArgs,
  };

  const { instance } = await E(startUpgradable)(startOpts);
  produceInstance.resolve(instance);
  trace('done');
};
harden(startQuickSend);

export const getManifestForQuickSend = ({ restoreRef }, { installKeys }) => {
  return {
    manifest: {
      [startQuickSend.name]: {
        consume: {
          agoricNames: true,
          board: true,
          chainStorage: true,
          chainTimerService: true,
          localchain: true,
          startUpgradable: true,
        },
        installation: {
          consume: { quickSend: true },
        },
        instance: {
          produce: { quickSend: true },
        },
        issuer: {
          consume: { [Stake.symbol]: true },
        },
      },
    },
    installations: {
      quickSend: restoreRef(installKeys.quickSend),
    },
  };
};
