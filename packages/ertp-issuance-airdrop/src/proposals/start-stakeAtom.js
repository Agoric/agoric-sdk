import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { prepareVowTools } from '@agoric/vow';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';
import { makeChainHub } from '../exos/chain-hub.js';

/**
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {StakeIcaSF,  StakeIcaTerms} from '../examples/stake-ica.contract';
 */

const trace = makeTracer('StartStakeAtom', true);

/**
 * @param {BootstrapPowers & {
 *   installation: {
 *     consume: {
 *       stakeIca: Installation<
 *         import('../examples/stake-ica.contract.js').start
 *       >;
 *     };
 *   };
 * }} powers
 */
export const startStakeAtom = async ({
  consume: {
    agoricNames,
    board,
    chainStorage,
    chainTimerService: timer,
    cosmosInterchainService,
    startUpgradable,
  },
  installation: {
    consume: { stakeIca },
  },
  instance: {
    produce: { stakeAtom: produceInstance },
  },
}) => {
  const VSTORAGE_PATH = 'stakeAtom';
  trace('startStakeAtom');
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, VSTORAGE_PATH);
  const marshaller = await E(board).getPublishingMarshaller();

  const zone = makeHeapZone();
  const vt = prepareVowTools(zone.subZone('vows'));
  const chainHub = makeChainHub(
    zone.subZone('chainHub'),
    await agoricNames,
    vt,
  );

  const [_, cosmoshub, connectionInfo] = await vt.when(
    chainHub.getChainsAndConnection('agoric', 'cosmoshub'),
  );

  /** @type {StartUpgradableOpts<StakeIcaSF>} */
  const startOpts = {
    label: 'stakeAtom',
    installation: stakeIca,
    terms: {
      chainId: cosmoshub.chainId,
      hostConnectionId: connectionInfo.counterparty.connection_id,
      controllerConnectionId: connectionInfo.id,
      icqEnabled: cosmoshub.icqEnabled,
    },
    privateArgs: await deeplyFulfilledObject(
      harden({
        agoricNames,
        cosmosInterchainService,
        storageNode,
        marshaller,
        timer,
      }),
    ),
  };

  const { instance } = await E(startUpgradable)(startOpts);
  produceInstance.resolve(instance);
};
harden(startStakeAtom);

export const getManifestForStakeAtom = (
  { restoreRef },
  { installKeys, ...options },
) => {
  return {
    manifest: {
      [startStakeAtom.name]: {
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
          produce: { stakeAtom: true },
        },
      },
    },
    installations: {
      stakeIca: restoreRef(installKeys.stakeIca),
    },
    options,
  };
};
