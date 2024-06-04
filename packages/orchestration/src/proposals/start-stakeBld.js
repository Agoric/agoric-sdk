import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { Stake } from '@agoric/internal/src/tokens.js';
import { E } from '@endo/far';

const trace = makeTracer('StartStakeBld', true);

/**
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       stakeBld: Installation<
 *         import('../../src/examples/stakeBld.contract.js').start
 *       >;
 *     };
 *   };
 * }} powers
 */
export const startStakeBld = async ({
  consume: {
    board,
    chainStorage,
    chainTimerService: chainTimerServiceP,
    localchain,
    startUpgradable,
  },
  installation: {
    consume: { stakeBld },
  },
  instance: {
    produce: { stakeBld: produceInstance },
  },
  issuer: {
    consume: { [Stake.symbol]: stakeIssuer },
  },
}) => {
  const VSTORAGE_PATH = 'stakeBld';
  trace('startStakeBld');

  const storageNode = await makeStorageNodeChild(chainStorage, VSTORAGE_PATH);

  // NB: committee must only publish what it intended to be public
  const marshaller = await E(board).getPublishingMarshaller();

  const [timerService, timerBrand] = await Promise.all([
    chainTimerServiceP,
    chainTimerServiceP.then(ts => E(ts).getTimerBrand()),
  ]);

  /**
   * @type {StartUpgradableOpts<
   *   import('../../src/examples/stakeBld.contract.js').start
   * >}
   */
  const startOpts = {
    label: 'stakeBld',
    installation: stakeBld,
    issuerKeywordRecord: harden({ In: await stakeIssuer }),
    terms: {},
    privateArgs: {
      localchain: await localchain,
      timerService,
      timerBrand,
      storageNode,
      marshaller,
    },
  };

  const { instance } = await E(startUpgradable)(startOpts);
  produceInstance.resolve(instance);
};
harden(startStakeBld);

export const getManifestForStakeBld = ({ restoreRef }, { installKeys }) => {
  return {
    manifest: {
      [startStakeBld.name]: {
        consume: {
          board: true,
          chainStorage: true,
          chainTimerService: true,
          localchain: true,
          startUpgradable: true,
        },
        installation: {
          consume: { stakeBld: true },
        },
        instance: {
          produce: { stakeBld: true },
        },
        issuer: {
          consume: { [Stake.symbol]: true },
        },
      },
    },
    installations: {
      stakeBld: restoreRef(installKeys.stakeBld),
    },
  };
};
