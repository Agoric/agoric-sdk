/* eslint-env node */
import { parseArgs } from 'node:util';
import { isNat } from '@endo/nat';
import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForInviteWithdrawer } from '@agoric/inter-protocol/src/proposals/withdraw-reserve-proposal.js';

/**
 * @template {{ type: string }} T
 * @typedef { T['type'] extends 'string' ? string : T['type'] extends 'boolean' ? boolean : (string | boolean) } TypeFromParseArgsOptionDescriptor
 */

/**
 * @template {Record<string, { type: string, multiple?: boolean }>} T
 * @typedef {{
 *   [K in keyof T]: (
 *     T[K]['multiple'] extends true
 *       ? TypeFromParseArgsOptionDescriptor<T[K]>[]
 *     : T[K]['multiple'] extends (false | unknown)
 *       ? TypeFromParseArgsOptionDescriptor<T[K]>
 *     : (TypeFromParseArgsOptionDescriptor<T[K]>[] | TypeFromParseArgsOptionDescriptor<T[K]>)
 *   )
 * }} CliOptions
 */

const { Fail } = assert;

const cliOptions = /** @type {const} */ ({
  address: { type: 'string', multiple: false },
  count: { type: 'string', multiple: false },
});

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef: _publishRef, install: _install },
  namedArgs = {},
) => {
  const { address, count } = namedArgs;

  typeof address === 'string' || Fail`string address is required`;
  if (count !== undefined) {
    isNat(count) || Fail`count must be a safe natural number`;
  }

  return harden({
    sourceSpec:
      '@agoric/inter-protocol/src/proposals/withdraw-reserve-proposal.js',
    getManifestCall: [getManifestForInviteWithdrawer.name, { address, count }],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs: argv } = endowments;
  /** @type {{ values: Partial<CliOptions<typeof cliOptions>> }} */
  const { values: rawArgs } = parseArgs({ args: argv, options: cliOptions });
  const { address, count: rawCount } = rawArgs;
  const count = (() => {
    if (rawCount === undefined) return undefined;
    /[0-9]/.test(rawCount) || Fail`--count value must be numeric`;
    return +rawCount;
  })();
  const namedArgs = { address, count };

  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('withdraw-reserve', utils =>
    defaultProposalBuilder(utils, namedArgs),
  );
};
