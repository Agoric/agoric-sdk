import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { prepareVowTools } from '@agoric/vow';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';
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
 *   instance: {
 *     produce: {
 *       stakeOsmo: any;
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
    cosmosInterchainService,
    startUpgradable,
  },
  installation: {
    consume: { stakeIca },
  },
  instance: {
    produce: { stakeOsmo: produceInstance },
  },
}) => {
  const VSTORAGE_PATH = 'stakeOsmo';
  trace('startStakeOsmo');
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, VSTORAGE_PATH);
  const marshaller = await E(board).getPublishingMarshaller();

  const vt = prepareVowTools(makeHeapZone());
  const chainHub = makeChainHub(await agoricNames, vt);

  const [_, osmosis, connectionInfo] = await vt.when(
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
      cosmosInterchainService: await cosmosInterchainService,
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
          cosmosInterchainService: true,
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
