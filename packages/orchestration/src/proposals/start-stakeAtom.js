// @ts-check
import { makeTracer } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { E } from '@endo/far';

/**
 * @import {Issuer} from '@agoric/ertp/exported.js';
 * @import {StakeAtomSF,  StakeAtomTerms} from '../examples/stakeAtom.contract.js';
 */

const trace = makeTracer('StartStakeAtom', true);

/**
 * @param {BootstrapPowers & { installation: {consume: {stakeAtom: Installation<import('../examples/stakeAtom.contract.js').start>}}}} powers
 * @param {{options: StakeAtomTerms }} options
 */
export const startStakeAtom = async (
  {
    consume: {
      agoricNames,
      board,
      chainStorage,
      chainTimerService: chainTimerServiceP,
      localchain,
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
  {
    options: {
      hostConnectionId,
      controllerConnectionId,
      bondDenom,
      bondDenomLocal,
      transferChannel,
      icqEnabled,
    },
  },
) => {
  const VSTORAGE_PATH = 'stakeAtom';
  trace('startStakeAtom', {
    hostConnectionId,
    controllerConnectionId,
    bondDenom,
    bondDenomLocal,
    transferChannel,
    icqEnabled,
  });
  await null;

  const storageNode = await makeStorageNodeChild(chainStorage, VSTORAGE_PATH);
  const marshaller = await E(board).getPublishingMarshaller();

  /** @type {Issuer[]} */
  const [ATOM, BLD, IST] = await Promise.all([
    E(agoricNames).lookup('issuer', 'ATOM'),
    E(agoricNames).lookup('issuer', 'BLD'),
    E(agoricNames).lookup('issuer', 'IST'),
  ]);

  const chainTimerService = await chainTimerServiceP;
  const chainTimerBrand = await E(chainTimerService).getTimerBrand();

  /** @type {StartUpgradableOpts<StakeAtomSF>} */
  const startOpts = {
    label: 'stakeAtom',
    installation: stakeAtom,
    issuerKeywordRecord: harden({
      ATOM,
      BLD,
      IST,
    }),
    terms: {
      hostConnectionId,
      controllerConnectionId,
      bondDenom,
      bondDenomLocal,
      transferChannel,
      icqEnabled,
      chainTimerBrand,
    },
    privateArgs: {
      chainTimerService,
      localchain: await localchain,
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
          chainTimerService: true,
          localchain: true,
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
