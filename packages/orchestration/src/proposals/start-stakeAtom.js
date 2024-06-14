import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';
import { makeChainHub } from '../utils/chainHub.js';

/**
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {StakeAtomSF,  StakeIcaTerms} from '../examples/stakeIca.contract';
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
    orchestration,
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
  const atomIssuer = await E(agoricNames).lookup('issuer', 'ATOM');
  trace('ATOM Issuer', atomIssuer);

  const chainHub = makeChainHub(await agoricNames);

  const agoric = await chainHub.getChainInfo('agoric');
  const cosmoshub = await chainHub.getChainInfo('cosmoshub');
  const connectionInfo = await chainHub.getConnectionInfo(
    agoric.chainId,
    cosmoshub.chainId,
  );

  /** @type {StartUpgradableOpts<StakeAtomSF>} */
  const startOpts = {
    label: 'stakeAtom',
    installation: stakeIca,
    issuerKeywordRecord: harden({ ATOM: atomIssuer }),
    terms: {
      chainId: cosmoshub.chainId,
      hostConnectionId: connectionInfo.id,
      controllerConnectionId: connectionInfo.counterparty.connection_id,
      bondDenom: cosmoshub.stakingTokens[0].denom,
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
          orchestration: true,
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
