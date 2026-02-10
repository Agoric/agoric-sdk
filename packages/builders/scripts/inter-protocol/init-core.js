/* eslint-env node */
/**
 * @file can be run with `agoric deploy` after a chain is running (depends on
 *   chain state) Only works with "local" chain and not sim-chain b/c it needs
 *   governance votes (n/a on sim-chain).
 */
import { makeHelpers } from '@agoric/deploy-script-support';
import { governanceSourceSpecRegistry } from '@agoric/governance/source-spec-registry.js';
import { interProtocolBundleSpecs } from '@agoric/inter-protocol/source-spec-registry.js';

import {
  getManifestForInterProtocol,
  getManifestForEconCommittee,
  getManifestForMain,
} from '@agoric/inter-protocol/src/proposals/core-proposal.js';
import { makeInstallCache } from '@agoric/inter-protocol/src/proposals/utils.js';
import { buildBundlePath } from '../lib/build-bundle.js';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

// TODO end inter-package filesystem references https://github.com/Agoric/agoric-sdk/issues/8178

/**
 * @typedef {{
 *   sourceSpec?: string;
 *   packagePath?: string;
 *   bundleName?: string;
 * }} BundleRegistryEntry
 */

/** @type {Record<string, Record<string, BundleRegistryEntry>>} */
const installKeyGroups = {
  econCommittee: {
    contractGovernor: governanceSourceSpecRegistry.contractGovernor,
    committee: governanceSourceSpecRegistry.committee,
    binaryVoteCounter: governanceSourceSpecRegistry.binaryVoteCounter,
  },
  main: {
    vaultFactory: interProtocolBundleSpecs.vaultFactory,
    feeDistributor: interProtocolBundleSpecs.feeDistributor,
    reserve: interProtocolBundleSpecs.reserve,
  },
};

/**
 * @template I
 * @template R
 * @param {object} opts
 * @param {(i: I) => R} opts.publishRef
 * @param {(m: string, b: string, opts?: any) => I} opts.install
 * @param {<T>(f: T) => T} [opts.wrapInstall]
 * @param {object} [options]
 * @param {{ committeeName?: string; committeeSize?: number }} [options.econCommitteeOptions]
 */
export const committeeProposalBuilder = async (
  { publishRef, install: install0, wrapInstall },
  { econCommitteeOptions } = {},
) => {
  const install = wrapInstall ? wrapInstall(install0) : install0;

  /** @param {Record<string, BundleRegistryEntry>} group */
  const publishGroup = async group =>
    Object.fromEntries(
      await Promise.all(
        Object.entries(group).map(async ([key, entry]) => {
          const bundlePath = await buildBundlePath(import.meta.url, entry);
          assert(entry.packagePath, `${key} missing packagePath`);
          return [
            key,
            publishRef(install(entry.packagePath, bundlePath, { persist: true })),
          ];
        }),
      ),
    );

  const econCommitteeInstallKeys = await publishGroup(installKeyGroups.econCommittee);
  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/core-proposal.js',
    getManifestCall: [
      getManifestForEconCommittee.name,
      {
        econCommitteeOptions,
        installKeys: {
          ...econCommitteeInstallKeys,
        },
      },
    ],
  });
};

/**
 * @template I
 * @template R
 * @param {object} opts
 * @param {(i: I) => R} opts.publishRef
 * @param {(m: string, b: string, opts?: any) => I} opts.install
 * @param {<T>(f: T) => T} [opts.wrapInstall]
 */
export const mainProposalBuilder = async ({
  publishRef,
  install: install0,
  wrapInstall,
}) => {
  const { VAULT_FACTORY_CONTROLLER_ADDR } = process.env;

  const install = wrapInstall ? wrapInstall(install0) : install0;

  const persist = true;
  /** @param {Record<string, BundleRegistryEntry>} group */
  const publishGroup = async group =>
    Object.fromEntries(
      await Promise.all(
        Object.entries(group).map(async ([key, entry]) => {
          const bundlePath = await buildBundlePath(import.meta.url, entry);
          assert(entry.packagePath, `${key} missing packagePath`);
          return [key, publishRef(install(entry.packagePath, bundlePath, { persist }))];
        }),
      ),
    );
  const mainInstallKeys = await publishGroup(installKeyGroups.main);
  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/core-proposal.js',
    getManifestCall: [
      getManifestForMain.name,
      {
        vaultFactoryControllerAddress: VAULT_FACTORY_CONTROLLER_ADDR,
        installKeys: {
          ...mainInstallKeys,
        },
      },
    ],
  });
};

// Build proposal for sim-chain etc.
/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options = {},
  { env = process.env } = {},
) => {
  /** @param {string | undefined} s */
  const optBigInt = s => s && BigInt(s);
  const {
    vaultFactoryControllerAddress = env.VAULT_FACTORY_CONTROLLER_ADDR,
    minInitialPoolLiquidity = env.MIN_INITIAL_POOL_LIQUIDITY,
    referencedUi,
    anchorOptions: {
      anchorDenom = env.ANCHOR_DENOM,
      anchorDecimalPlaces = '6',
      anchorKeyword = 'AUSD',
      anchorProposedName = anchorKeyword,
      initialPrice = undefined,
    } = {},
    econCommitteeOptions: {
      committeeSize: econCommitteeSize = env.ECON_COMMITTEE_SIZE || '3',
    } = {},
  } = options;

  /** @param {Record<string, BundleRegistryEntry>} group */
  const publishGroup = async group =>
    Object.fromEntries(
      await Promise.all(
        Object.entries(group).map(async ([key, entry]) => {
          const bundlePath = await buildBundlePath(import.meta.url, entry);
          assert(entry.packagePath, `${key} missing packagePath`);
          return [key, publishRef(install(entry.packagePath, bundlePath))];
        }),
      ),
    );

  const anchorOptions = anchorDenom && {
    denom: anchorDenom,
    decimalPlaces: parseInt(anchorDecimalPlaces, 10),
    initialPrice,
    keyword: anchorKeyword,
    proposedName: anchorProposedName,
  };

  const econCommitteeOptions = {
    committeeSize: parseInt(econCommitteeSize, 10),
  };
  const econCommitteeInstallKeys = await publishGroup(installKeyGroups.econCommittee);
  const mainInstallKeys = await publishGroup(installKeyGroups.main);

  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/core-proposal.js',
    getManifestCall: [
      getManifestForInterProtocol.name,
      {
        vaultFactoryControllerAddress,
        minInitialPoolLiquidity: optBigInt(minInitialPoolLiquidity),
        referencedUi,
        anchorOptions,
        econCommitteeOptions,
        installKeys: {
          ...econCommitteeInstallKeys,
          ...mainInstallKeys,
        },
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  const tool = await makeInstallCache(homeP, {
    loadBundle: spec => import(spec),
  });
  await Promise.all([
    writeCoreEval('gov-econ-committee', opts =>
      // @ts-expect-error XXX makeInstallCache types
      committeeProposalBuilder({ ...opts, wrapInstall: tool.wrapInstall }),
    ),
    writeCoreEval('gov-amm-vaults-etc', opts =>
      // @ts-expect-error XXX makeInstallCache types
      mainProposalBuilder({ ...opts, wrapInstall: tool.wrapInstall }),
    ),
  ]);
  await tool.saveCache();
};
