import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';

/** @import {StakeAtomSF,  StakeIcaTerms} from '../examples/stakeIca.contract' */

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
 * @param {{ options: StakeIcaTerms }} options
 */
export const startStakeAtom = async (
  {
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
  },
  { options: { hostConnectionId, controllerConnectionId, bondDenom } },
) => {
  const VSTORAGE_PATH = 'stakeAtom';
  trace('startStakeAtom', {
    hostConnectionId,
    controllerConnectionId,
    bondDenom,
  });
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, VSTORAGE_PATH);
  const marshaller = await E(board).getPublishingMarshaller();
  const atomIssuer = await E(agoricNames).lookup('issuer', 'ATOM');
  trace('ATOM Issuer', atomIssuer);

  /** @type {StartUpgradableOpts<StakeAtomSF>} */
  const startOpts = {
    label: 'stakeAtom',
    installation: stakeIca,
    issuerKeywordRecord: harden({ ATOM: atomIssuer }),
    terms: {
      hostConnectionId,
      controllerConnectionId,
      bondDenom,
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
