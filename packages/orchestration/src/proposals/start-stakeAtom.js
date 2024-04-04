// @ts-check
import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';

/** @import { StakeAtomSF,  StakeAtomTerms} from '../contracts/stakeAtom.contract' */

const trace = makeTracer('StartStakeAtom', true);

/**
 * @param {BootstrapPowers & { installation: {consume: {stakeAtom: Installation<import('../contracts/stakeAtom.contract.js').start>}}}} powers
 * @param {{options: StakeAtomTerms }} options
 */
export const startStakeAtom = async (
  {
    consume: {
      agoricNames,
      board,
      chainStorage,
      orchestration,
      startUpgradable,
    },
    installation: {
      consume: { stakeAtom },
    },
    instance: {
      produce: { stakeAtom: produceInstance },
    },
  },
  { options: { hostConnectionId, controllerConnectionId } },
) => {
  const VSTORAGE_PATH = 'stakeAtom';
  trace('startStakeAtom', { hostConnectionId, controllerConnectionId });
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, VSTORAGE_PATH);
  // NB: committee must only publish what it intended to be public
  const marshaller = await E(board).getPublishingMarshaller();

  const atomIssuer = await E(agoricNames).lookup('issuer', 'ATOM');
  trace('ATOM Issuer', atomIssuer);

  /** @type {StartUpgradableOpts<StakeAtomSF>} */
  const startOpts = {
    label: 'stakeAtom',
    installation: stakeAtom,
    issuerKeywordRecord: harden({ ATOM: atomIssuer }),
    terms: {
      hostConnectionId,
      controllerConnectionId,
    },
    privateArgs: {
      orchestration: await orchestration,
      storageNode,
      marshaller,
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
          orchestration: true,
          startUpgradable: true,
        },
        installation: {
          consume: { stakeAtom: true },
        },
        instance: {
          produce: { stakeAtom: true },
        },
      },
    },
    installations: {
      stakeAtom: restoreRef(installKeys.stakeAtom),
    },
    options,
  };
};
