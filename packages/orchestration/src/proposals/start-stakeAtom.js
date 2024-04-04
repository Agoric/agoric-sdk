// @ts-check
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('StartStakeAtom', true);

/**
 * @param {BootstrapPowers & { installation: {consume: {stakeAtom: Installation<import('../contracts/stakeAtom.contract.js').start>}}}} powers
 * @param {{options: import('../contracts/stakeAtom.contract.js').StakeAtomTerms}} options
 */
export const startStakeAtom = async (
  {
    consume: { orchestration, startUpgradable },
    installation: {
      consume: { stakeAtom },
    },
    instance: {
      produce: { stakeAtom: produceInstance },
    },
  },
  { options: { hostConnectionId, controllerConnectionId } },
) => {
  trace('startStakeAtom', { hostConnectionId, controllerConnectionId });
  await null;

  /** @type {StartUpgradableOpts<import('../contracts/stakeAtom.contract.js').start>} */
  const startOpts = {
    label: 'stakeAtom',
    installation: stakeAtom,
    terms: {
      hostConnectionId,
      controllerConnectionId,
    },
    privateArgs: {
      orchestration: await orchestration,
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
