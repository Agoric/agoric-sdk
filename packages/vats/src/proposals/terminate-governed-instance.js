/**
 * @file Source for a core-eval to terminate governed contract instances along
 *   with their governors by mapping a board ID to a key in the Bootstrap Powers
 *   governedContractKits collection. Also functions as an off-chain builder
 *   script for such core-evals:
 *
 *       agoric run /path/to/$0 <$instanceHandleBoardID:$instanceKitLabel>...
 */

/// <reference types="@agoric/vats/src/core/types-ambient"/>

/* eslint-disable import/no-extraneous-dependencies */
// dynamic import { makeHelpers } from '@agoric/deploy-script-support';
// dynamic import { getSpecifier } from '@agoric/internal/src/module-utils.js';
import { E, passStyleOf } from '@endo/far';
import { makeTracer } from '@agoric/internal/src/debug.js';
import { isAbandonedError } from '@agoric/internal/src/upgrade-api.js';

const USAGE = `Usage: agoric run /path/to/terminate-governed-instance.js \\
  <$instanceHandleBoardID:$instanceKitLabel>...`;

const repr = val =>
  typeof val === 'string' || typeof val === 'object'
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
 * @param {(
 *   strings: TemplateStringsArray | string[],
 *   ...subs: unknown[]
 * ) => Error} [makeError]
 *   for visible errors with or without `Fail`
 * @returns {{ boardID: string; instanceKitLabel: string }[]}
 */
const parseTargets = (args = [], makeError = defaultMakeError) => {
  if (!Array.isArray(args)) throw makeError`invalid targets: ${args}`;
  /** @type {{ boardID: string; instanceKitLabel: string }[]} */
  const targets = [];
  const badTargets = [];
  for (const arg of args) {
    const m = typeof arg === 'string' && arg.match(rtarget);
    if (!m) {
      badTargets.push(arg);
      continue;
    }
    // @ts-expect-error cast
    targets.push(m.groups);
  }
  if (badTargets.length) throw makeError`malformed target(s): ${badTargets}`;
  if (!targets.length) throw makeError`no target(s)`;
  return targets;
};

/**
 * Terminate one or more governed contract instances and their governors.
 *
 * @param {BootstrapPowers} powers
 * @param {object} config
 * @param {object} config.options
 * @param {string[]} config.options.targetSpecifiers An array of
 *   "$instanceHandleBoardID:$instanceKitLabel" strings corresponding with vats
 *   to terminate.
 */
export const terminateGoverned = async (
  { consume: { board, governedContractKits, zoe } },
  { options: { targetSpecifiers } },
) => {
  const { Fail, quote: q } = assert;

  // Parse and validate the targets.
  const targets = parseTargets(targetSpecifiers, Fail);
  const validationResults = await Promise.allSettled(
    targets.map(async ({ boardID, instanceKitLabel }) => {
      const targetData = [boardID, instanceKitLabel];
      const logLabel = q(targetData);
      const trace = makeTracer(`terminate-governed-instance ${logLabel}`, true);
      const contractInstanceHandle = await E(board).getValue(boardID);
      const instanceKit = await E(governedContractKits).get(
        // @ts-expect-error TS2345 Property '[tag]' is missing
        contractInstanceHandle,
      );
      trace('alleged governed contract instance kit', instanceKit);

      const { label, governor, governorCreatorFacet, governorAdminFacet } =
        instanceKit;
      label === instanceKitLabel ||
        Fail`${logLabel} unexpected instanceKit label, got ${label} but wanted ${q(instanceKitLabel)}`;
      const govTerms = /** @type {any} */ (await E(zoe).getTerms(governor));
      trace('governor terms', govTerms);
      (passStyleOf(govTerms?.governed) === 'copyRecord' &&
        passStyleOf(govTerms?.governedContractInstallation) === 'remotable') ||
        Fail`${logLabel} instanceKit governor does not appear to have the right terms shape`;

      // We need an adminFacet for the contract instance. Prefer to get it from
      // the governor, but fall back on extracting it from the kit if the
      // governor has already been terminated.
      let { adminFacet: instanceAdminFacet } = instanceKit;
      let governorOk = true;
      try {
        instanceAdminFacet = await E(governorCreatorFacet).getAdminFacet();
      } catch (err) {
        if (!isAbandonedError(err)) throw err;
        governorOk = false;
      }
      trace(
        governorOk
          ? 'instance adminFacet from governor'
          : 'instance adminFacet from kit',
        instanceAdminFacet,
      );
      instanceAdminFacet ||
        Fail`${logLabel} instanceKit is missing the instance admin facet`;
      return {
        logLabel,
        trace,
        instanceAdminFacet,
        governorAdminFacet: governorOk ? governorAdminFacet : undefined,
      };
    }),
  );
  const validationProblems = targets.flatMap(
    ({ boardID, instanceKitLabel }, i) => {
      if (validationResults[i].status === 'fulfilled') return [];
      return [
        { boardID, instanceKitLabel, error: validationResults[i].reason },
      ];
    },
  );
  if (validationProblems.length !== 0) {
    console.error(
      'terminate-governed-instance target validation failed',
      validationProblems,
    );
    Fail`target validation failed: ${validationProblems}`;
  }

  // Terminate each target governed contract and governor.
  const terminationResults = await Promise.allSettled(
    validationResults.map(async settlement => {
      assert(settlement.status === 'fulfilled');
      const { logLabel, trace, instanceAdminFacet, governorAdminFacet } =
        settlement.value;

      const terminateInstanceMessage = `governed contract ${logLabel} terminated by terminate-governed-instance`;
      await E(instanceAdminFacet).terminateContract(
        harden(Error(terminateInstanceMessage)),
      );
      trace('terminated governed instance');

      if (governorAdminFacet) {
        const terminateGovernorMessage = `governor ${logLabel} terminated by terminate-governed-instance`;
        await E(governorAdminFacet).terminateContract(
          harden(Error(terminateGovernorMessage)),
        );
        trace('terminated governor');
      }
    }),
  );
  const terminationProblems = targets.flatMap(
    ({ boardID, instanceKitLabel }, i) => {
      if (terminationResults[i].status === 'fulfilled') return [];
      return [
        { boardID, instanceKitLabel, error: terminationResults[i].reason },
      ];
    },
  );
  if (terminationProblems.length !== 0) {
    console.error(
      'terminate-governed-instance termination(s) failed',
      terminationProblems,
    );
    Fail`termination(s) failed: ${terminationProblems}`;
  }
  console.log('terminate-governed-instance succeeded', targetSpecifiers);
};
harden(terminateGoverned);

/**
 * Return a manifest for terminating one or more governed contract instances and
 * their governors.
 *
 * @param {object} _powers
 * @param {string[]} targetSpecifiers
 */
export const getManifest = (_powers, targetSpecifiers) => {
  parseTargets(targetSpecifiers);
  return {
    manifest: {
      [terminateGoverned.name]: {
        consume: { board: true, governedContractKits: true, zoe: true },
      },
    },
    // Provide `terminateGovernors` a second argument like
    // `{ options: { targetSpecifiers } }`.
    options: { targetSpecifiers },
  };
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (_utils, targetSpecifiers) => {
  parseTargets(targetSpecifiers);

  // Dynamic import to avoid inclusion in the proposal bundle.
  const { getSpecifier } = await import('@agoric/internal/src/module-utils.js');
  const SELF = await getSpecifier(import.meta.url);

  return harden({
    sourceSpec: SELF,
    getManifestCall: ['getManifest', targetSpecifiers],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  parseTargets(scriptArgs, makeUsageError);

  // Dynamic import to avoid inclusion in the proposal bundle.
  const { makeHelpers } = await import('@agoric/deploy-script-support');
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(terminateGoverned.name, utils =>
    defaultProposalBuilder(utils, scriptArgs),
  );
};
