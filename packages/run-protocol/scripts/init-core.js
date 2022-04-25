/* global process */
// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';

import {
  getManifestForRunProtocol,
  getManifestForEconCommittee,
  getManifestForMain,
  getManifestForRunStake,
  getManifestForPSM,
} from '../src/core-proposal.js';

const { details: X } = assert;

/** @type {Record<string, Record<string, [string, string]>>} */
const installKeyGroups = {
  econCommittee: {
    contractGovernor: [
      '@agoric/governance/src/contractGovernor.js',
      '../bundles/bundle-contractGovernor.js',
    ],
    committee: [
      '@agoric/governance/src/committee.js',
      '../bundles/bundle-committee.js',
    ],
    binaryVoteCounter: [
      '@agoric/governance/src/binaryVoteCounter.js',
      '../bundles/bundle-binaryVoteCounter.js',
    ],
  },
  runStake: {
    runStake: ['../src/runStake/runStake.js', '../bundles/bundle-runStake.js'],
  },
  main: {
    amm: [
      '../src/vpool-xyk-amm/multipoolMarketMaker.js',
      '../bundles/bundle-amm.js',
    ],
    vaultFactory: [
      '../src/vaultFactory/vaultFactory.js',
      '../bundles/bundle-vaultFactory.js',
    ],
    liquidateMinimum: [
      '../src/vaultFactory/liquidateMinimum.js',
      '../bundles/bundle-liquidateMinimum.js',
    ],
    liquidate: [
      '../src/vaultFactory/liquidateIncrementally.js',
      '../bundles/bundle-liquidateIncrementally.js',
    ],
    reserve: ['../src/reserve/assetReserve.js', '../bundles/bundle-reserve.js'],
  },
  psm: {
    psm: ['../src/psm/psm.js', '../bundles/bundle-psm.js'],
  },
};

const { entries, fromEntries } = Object;

/** @type { <K extends string, T, U>(obj: Record<K, T>, f: (t: T) => U) => Record<K, U>} */
const mapValues = (obj, f) =>
  // @ts-ignore entries() loses the K type
  harden(fromEntries(entries(obj).map(([p, v]) => [p, f(v)])));

const committeeProposalBuilder = async ({ publishRef, install }) => {
  const { ROLE = 'chain' } = process.env;

  // preload ERTP, marshal, store, etc.
  const [mod0, bundle0] = installKeyGroups.econCommittee.binaryVoteCounter;
  const install0 = await install(mod0, bundle0, { persist: true });

  /** @param { Record<string, [string, string]> } group */
  const publishGroup = group =>
    mapValues(group, ([mod, bundle]) =>
      publishRef(
        mod === mod0 && bundle === bundle0 ? install0 : install(mod, bundle),
      ),
    );
  return harden({
    sourceSpec: '../src/core-proposal.js',
    getManifestCall: [
      getManifestForEconCommittee.name,
      {
        ROLE,
        installKeys: {
          ...publishGroup(installKeyGroups.econCommittee),
        },
      },
    ],
  });
};

const mainProposalBuilder = async ({ publishRef, install }) => {
  const { ROLE = 'chain', VAULT_FACTORY_CONTROLLER_ADDR } = process.env;

  /** @param { Record<string, [string, string]> } group */
  const publishGroup = group =>
    mapValues(group, ([mod, bundle]) => publishRef(install(mod, bundle)));
  return harden({
    sourceSpec: '../src/core-proposal.js',
    getManifestCall: [
      getManifestForMain.name,
      {
        ROLE,
        vaultFactoryControllerAddress: VAULT_FACTORY_CONTROLLER_ADDR,
        installKeys: {
          ...publishGroup(installKeyGroups.main),
        },
      },
    ],
  });
};

const runStakeProposalBuilder = async ({ publishRef, install }) => {
  const [mod0, bundle0] = installKeyGroups.runStake.runStake;

  return harden({
    sourceSpec: '../src/core-proposal.js',
    getManifestCall: [
      getManifestForRunStake.name,
      {
        installKeys: {
          runStake: publishRef(install(mod0, bundle0)),
        },
      },
    ],
  });
};

const psmProposalBuilder = async ({ publishRef, install }) => {
  const { ROLE = 'chain', ANCHOR_DENOM } = process.env;

  assert.typeof(ANCHOR_DENOM, 'string', X`missing ANCHOR_DENOM`);
  const [mod0, bundle0] = installKeyGroups.psm.psm;

  return harden({
    sourceSpec: '../src/core-proposal.js',
    getManifestCall: [
      getManifestForPSM.name,
      {
        ROLE,
        installKeys: {
          psm: publishRef(install(mod0, bundle0)),
        },
      },
    ],
    options: { denom: ANCHOR_DENOM },
  });
};

// Build proposal for sim-chain etc.
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  const { ROLE = 'chain', VAULT_FACTORY_CONTROLLER_ADDR } = process.env;

  /** @param { Record<string, [string, string]> } group */
  const publishGroup = group =>
    mapValues(group, ([mod, bundle]) => publishRef(install(mod, bundle)));

  return harden({
    sourceSpec: '../src/core-proposal.js',
    getManifestCall: [
      getManifestForRunProtocol.name,
      {
        ROLE,
        vaultFactoryControllerAddress: VAULT_FACTORY_CONTROLLER_ADDR,
        installKeys: {
          ...publishGroup(installKeyGroups.econCommittee),
          ...publishGroup(installKeyGroups.runStake),
          ...publishGroup(installKeyGroups.main),
          ...publishGroup(installKeyGroups.psm),
        },
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);

  await Promise.all([
    writeCoreProposal('gov-econ-committee', committeeProposalBuilder),
    writeCoreProposal('gov-runStake', runStakeProposalBuilder),
    writeCoreProposal('gov-amm-vaults-etc', mainProposalBuilder),
  ]);

  if (!process.env.ANCHOR_DENOM) {
    console.warn('SKIP psm proposal: missing ANCHOR_DENOM');
    return;
  }
  await writeCoreProposal('gov-psm', psmProposalBuilder);
};
