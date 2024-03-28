// @ts-check
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('StartStakeAtom', true);

/**
 * @param {BootstrapPowers & { installation: {consume: {stakeAtom: Installation<import('../contracts/stakeAtom.contract.js').start>}}}} powers
 */
export const startStakeAtom = async ({
  consume: { orchestration, startUpgradable },
  installation: {
    consume: { stakeAtom },
  },
  instance: {
    produce: { stakeAtom: produceInstance },
  },
}) => {
  trace('startStakeAtom');
  await null;

  /** @type {StartUpgradableOpts<import('../contracts/stakeAtom.contract.js').start>} */
  const startOpts = {
    label: 'stakeAtom',
    installation: stakeAtom,
    terms: {
      // XXX parameterize these via decentral-devnet-config.json
      hostConnectionId: 'connection-1',
      controllerConnectionId: 'connection-0',
    },
    privateArgs: {
      orchestration: await orchestration,
    },
  };

  const { instance } = await E(startUpgradable)(startOpts);
  trace('instance', instance);
  produceInstance.resolve(instance);
};
harden(startStakeAtom);

export const getManifestForStakeAtom = ({ restoreRef }, { installKeys }) => {
  return {
    manifest: {
      [startStakeAtom.name]: {
        consume: {
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
        produce: {
          stakeAtom: true,
        },
      },
    },
    installations: {
      stakeAtom: restoreRef(installKeys.stakeAtom),
    },
  };
};
