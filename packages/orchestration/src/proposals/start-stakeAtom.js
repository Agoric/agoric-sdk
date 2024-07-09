import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { prepareVowTools } from '@agoric/vow';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';
import { makeChainHub } from '../exos/chain-hub.js';

/**
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {StakeIcaSF,  StakeIcaTerms} from '../examples/stakeIca.contract';
 */

const trace = makeTracer('StartStakeAtom', true);

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
export const startStakeAtom = async ({
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
    produce: { stakeAtom: produceInstance },
  },
}) => {
  const VSTORAGE_PATH = 'stakeAtom';
  trace('startStakeAtom');
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, VSTORAGE_PATH);
  const marshaller = await E(board).getPublishingMarshaller();

  const vt = prepareVowTools(makeHeapZone());
  const chainHub = makeChainHub(await agoricNames, vt);

  const [_, cosmoshub, connectionInfo] = await vt.when(
    chainHub.getChainsAndConnection('agoric', 'cosmoshub'),
  );

  /** @type {StartUpgradableOpts<StakeIcaSF>} */
  const startOpts = {
    label: 'stakeAtom',
    installation: stakeIca,
    terms: {
      chainId: cosmoshub.chainId,
      hostConnectionId: connectionInfo.id,
      controllerConnectionId: connectionInfo.counterparty.connection_id,
      bondDenom: cosmoshub.stakingTokens[0].denom,
      icqEnabled: cosmoshub.icqEnabled,
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
