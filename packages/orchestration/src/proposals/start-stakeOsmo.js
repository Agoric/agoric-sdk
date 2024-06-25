import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { heapVowE as E } from '@agoric/vow/vat.js';
import { makeChainHub } from '../exos/chain-hub.js';

/**
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {StakeIcaSF} from '../examples/stakeIca.contract';
 */

const trace = makeTracer('StartStakeOsmo', true);

/**
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       stakeIca: Installation<
 *         import('../examples/stakeIca.contract.js').start
 *       >;
 *     };
 *   };
 * }} powers
 */
export const startStakeOsmo = async ({
  consume: {
    agoricNames,
    board,
    chainStorage,
    chainTimerService,
    orchestration,
    startUpgradable,
  },
  installation: {
    consume: { stakeIca },
  },
  instance: {
    // @ts-expect-error stakeOsmo not typed
    produce: { stakeOsmo: produceInstance },
  },
}) => {
  const VSTORAGE_PATH = 'stakeOsmo';
  trace('startStakeOsmo');
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, VSTORAGE_PATH);
  const marshaller = await E(board).getPublishingMarshaller();

  const chainHub = makeChainHub(await agoricNames);

  const [_, osmosis, connectionInfo] = await E.when(
    chainHub.getChainsAndConnection('agoric', 'osmosis'),
  );

  /** @type {StartUpgradableOpts<StakeIcaSF>} */
  const startOpts = {
    label: 'stakeOsmo',
    installation: stakeIca,
    terms: {
      chainId: osmosis.chainId,
      hostConnectionId: connectionInfo.id,
      controllerConnectionId: connectionInfo.counterparty.connection_id,
      bondDenom: osmosis.stakingTokens[0].denom,
      icqEnabled: osmosis.icqEnabled,
    },
    privateArgs: {
      orchestration: await orchestration,
      storageNode,
      marshaller,
      timer: await chainTimerService,
    },
  };

  const { instance } = await E(startUpgradable)(startOpts);
  produceInstance.resolve(instance);
};
harden(startStakeOsmo);

export const getManifestForStakeOsmo = (
  { restoreRef },
  { installKeys, ...options },
) => {
  return {
    manifest: {
      [startStakeOsmo.name]: {
        consume: {
          agoricNames: true,
          board: true,
          chainStorage: true,
          chainTimerService: true,
          orchestration: true,
          startUpgradable: true,
        },
        installation: {
          consume: { stakeIca: true },
        },
        instance: {
          produce: { stakeOsmo: true },
        },
      },
    },
    installations: {
      stakeIca: restoreRef(installKeys.stakeIca),
    },
    options,
  };
};
