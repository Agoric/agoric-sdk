/**
 * @file Upgrade price-feed governor instances such as emerynet v664.
 * Functions as both an off-chain builder and an on-chain core-eval.
 */

/// <reference types="@agoric/vats/src/core/types-ambient"/>

import { E } from '@endo/far';

const SELF = '@agoric/builders/scripts/vats/upgrade-governor-instance.js';
const USAGE = `Usage: agoric run /path/to/upgrade-governor-instance.js \\
  <$governorInstanceHandleBoardID:$instanceKitLabel>...`;

const repr = val =>
  typeof val === 'string' || (typeof val === 'object' && val !== null)
    ? JSON.stringify(val)
    : String(val);
const defaultMakeError = (strings, ...subs) =>
  Error(
    strings.map((s, i) => `${i === 0 ? '' : repr(subs[i - 1])}${s}`).join(''),
  );
const makeUsageError = (strings, ...subs) => {
  const err = defaultMakeError(strings, ...subs);
  console.error(err.message);
  console.error(USAGE);
  return err;
};

const rtarget = /^(?<boardID>board[0-9]+):(?<instanceKitLabel>.+)$/;
/**
 * @param {string[]} args
 * @param {(strings: TemplateStringsArray | string[], ...subs: unknown[]) => Error} [makeError]
 * @returns {Array<{boardID: string, instanceKitLabel: string}>}
 */
const parseTargets = (args = [], makeError = defaultMakeError) => {
  if (!Array.isArray(args)) throw makeError`invalid targets: ${args}`;
  /** @type {Array<{boardID: string, instanceKitLabel: string}>} */
  const targets = [];
  const badTargets = [];
  for (const arg of args) {
    const m = typeof arg === 'string' && arg.match(rtarget);
    if (!m) {
      badTargets.push(arg);
    } else {
      // @ts-expect-error cast
      targets.push(m.groups);
    }
  }
  if (badTargets.length !== 0) {
    throw makeError`malformed target(s): ${badTargets}`;
  } else if (targets.length === 0) {
    throw makeError`no target(s)`;
  }
  return targets;
};

/**
 * Given boardIDs of some instances of contract governors,
 * upgrade those governors to contractGovernorExecutor.js,
 * which will terminate the governed contracts.
 *
 * @param {BootstrapPowers} powers
 * @param {{ options: { governorExecutorBundleId: string, targetSpecifiers: string[] } }} config
 */
export const upgradeGovernors = async (
  { consume: { board, governedContractKits } },
  { options: { governorExecutorBundleId, targetSpecifiers } },
) => {
  const { Fail, quote: q } = assert;
  assert.typeof(governorExecutorBundleId, 'string');
  const targets = parseTargets(targetSpecifiers, Fail);
  const doneP = Promise.allSettled(
    targets.map(async ({ boardID, instanceKitLabel }) => {
      const logLabel = [boardID, instanceKitLabel];
      const contractInstanceHandle = await E(board).getValue(boardID);
      const instanceKit = await E(governedContractKits).get(
        // @ts-expect-error TS2345 Property '[tag]' is missing
        contractInstanceHandle,
      );
      console.log(
        `${q(logLabel)} alleged governor contract instance kit`,
        instanceKit,
      );
      const { label, governorAdminFacet, adminFacet } = instanceKit;
      label === instanceKitLabel ||
        Fail`${q(logLabel)} unexpected instanceKit label, got ${label} but wanted ${q(instanceKitLabel)}`;
      (adminFacet && adminFacet !== governorAdminFacet) ||
        Fail`${q(logLabel)} instanceKit adminFacet should have been present and different from governorAdminFacet but was ${adminFacet}`;
      await E(governorAdminFacet).upgradeContract(
        governorExecutorBundleId,
        undefined,
      );
      console.log(`${q(logLabel)} terminated governor`);
      console.log('shutting down executor governor');
      const reason = harden(Error(`core-eval terminating ${label} governor`));
      await E(governorAdminFacet).terminateContract(reason);
    }),
  );
  const results = await doneP;
  const problems = targets.flatMap(({ boardID, instanceKitLabel }, i) => {
    if (results[i].status === 'fulfilled') return [];
    return [[boardID, instanceKitLabel, results[i].reason]];
  });
  if (problems.length !== 0) {
    console.error('governor termination(s) failed', problems);
    Fail`governor termination(s) failed: ${problems}`;
  }
};
harden(upgradeGovernors);

/*
export const getManifest = (_powers, targetSpecifiers) => {
  parseTargets(targetSpecifiers);
  return {
    manifest: {
      [upgradeGovernors.name]: {
        consume: { board: true, governedContractKits: true },
      },
    },
    // Provide `terminateGovernors` a second argument like
    // `{ options: { targetSpecifiers } }`.
    options: { targetSpecifiers },
  };
};
*/

const uG = 'upgradeGovernors';
/**
 * Return the manifest, installations, and options for upgrading Vaults.
 *
 * @param {object} utils
 * @param {any} utils.restoreRef
 * @param {any} vaultUpgradeOptions
 */
export const getManifest = async (
  { restoreRef },
  { bundleRef, targetSpecifiers },
) => {
  return {
    manifest: {
      [upgradeGovernors.name]: {
        consume: {
          board: uG,
          zoe: uG,
          governedContractKits: uG,
        },
      },
    },
    installations: { governorExecutor: restoreRef(bundleRef) }, // do we need installations ???
    options: { governorExecutorBundleId: bundleRef.bundleID, targetSpecifiers },
  };
};

/* @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
/*
export const defaultProposalBuilder = async (_utils, targetSpecifiers) => {
  parseTargets(targetSpecifiers);
  return harden({
    sourceSpec: SELF,
    getManifestCall: ['getManifest', targetSpecifiers],
  });
};*/

/* @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
/*
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  parseTargets(scriptArgs, makeUsageError);
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(upgradeGovernors.name, utils =>
    defaultProposalBuilder(utils, scriptArgs),
  );
};
*/
// import { makeHelpers } from '@agoric/deploy-script-support';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  targetSpecifiers,
) => {
  parseTargets(targetSpecifiers);
  return harden({
    sourceSpec: SELF,
    getManifestCall: [
      getManifest.name,
      {
        bundleRef: publishRef(
          install('@agoric/governance/src/contractGovernorExecutor.js'),
        ),
        targetSpecifiers,
      },
    ],
  });
};

/* @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
/*
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('upgrade-governor-instance', defaultProposalBuilder);
};
*/

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  parseTargets(scriptArgs, makeUsageError);
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(upgradeGovernors.name, utils =>
    defaultProposalBuilder(utils, scriptArgs),
  );
};
