/**
 * Usage:
 * agoric run fast-usdc-settler-ref.build.js [configuration]
 *
 * (see update-settler-reference.core.js)
 */
import { makeHelpers } from '@agoric/deploy-script-support';
import { parseArgs } from 'node:util';
import { getManifestForUpdateSettlerReference } from './update-settler-reference.core.js';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/**
 * @param {Parameters<CoreEvalBuilder>[0]} powers
 * @param {{ net: string }} options
 * @satisfies {CoreEvalBuilder}
 */
export const proposalBuilder = async ({ publishRef, install }, options) => {
  return harden({
    sourceSpec: './update-settler-reference.core.js',
    /** @type {[string, Parameters<typeof getManifestForUpdateSettlerReference>[1]]} */
    getManifestCall: [
      getManifestForUpdateSettlerReference.name,
      {
        options,
        installKeys: {
          fastUsdc: publishRef(
            install(
              '@aglocal/fast-usdc-deploy/dist/fast-usdc.contract.bundle.js',
            ),
          ),
        },
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  const { scriptArgs } = endowments;
  const { positionals } = parseArgs({
    args: scriptArgs,
    allowPositionals: true,
  });
  const net = positionals[0];

  await writeCoreEval('eval-fast-usdc-settler-ref', utils =>
    proposalBuilder(utils, { net }),
  );
};
