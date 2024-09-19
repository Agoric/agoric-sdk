import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { Stake } from '@agoric/internal/src/tokens.js';
import { E } from '@endo/far';

const trace = makeTracer('StartQuickSend', true);

/** @import {Instance} from '@agoric/zoe/src/zoeService/utils'; */

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
    agoricNames: agoricNamesP,
    board,
    chainStorage,
    chainTimerService: chainTimerServiceP,
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
  const VSTORAGE_PATH = 'quickSend';
  trace('startQuickSend');

  const storageNode = await makeStorageNodeChild(chainStorage, VSTORAGE_PATH);

  // NB: only publish what is intended to be public
  const marshaller = await E(board).getPublishingMarshaller();

  const [agoricNames, timerService] = await Promise.all([
    agoricNamesP,
    chainTimerServiceP,
  ]);

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
    privateArgs: {
      agoricNames,
      localchain: await localchain,
      timerService,
      storageNode,
      marshaller,
    },
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
