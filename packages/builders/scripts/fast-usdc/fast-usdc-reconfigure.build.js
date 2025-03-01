/**
 * Usage:
 * agoric run fast-usdc-reconfigure.build.js [--agoricToNoble <IBCChannelInfo>]
 *
 * channel info defaults to mainnet configuration (see update-noble-ica.core.js)
 */
import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForUpdateNobleICA } from '@agoric/fast-usdc/src/update-noble-ica.core.js';
import { IBCConnectionInfoShape } from '@agoric/orchestration';
import { mustMatch } from '@endo/patterns';
import { parseArgs } from 'node:util';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js'
 * @import {IBCConnectionInfo} from '@agoric/orchestration'
 * @import {Passable} from '@endo/marshal'
 */

/**
 * @param {Parameters<CoreEvalBuilder>[0]} powers
 * @param {{ agoricToNoble?: IBCConnectionInfo } & Passable} options
 * @satisfies {CoreEvalBuilder}
 */
export const proposalBuilder = async ({ publishRef, install }, options) => {
  return harden({
    sourceSpec: '@agoric/fast-usdc/src/update-noble-ica.core.js',
    /** @type {[string, Parameters<typeof getManifestForUpdateNobleICA>[1]]} */
    getManifestCall: [
      getManifestForUpdateNobleICA.name,
      {
        options,
        installKeys: {
          fastUsdc: publishRef(
            install('@agoric/fast-usdc/src/fast-usdc.contract.js'),
          ),
        },
      },
    ],
  });
};

/**
 * @param {string[]} [args]
 * @returns {{ agoricToNoble?: IBCConnectionInfo } & Passable}
 */
const parseConnection = args => {
  /** @type {{ values: { agoricToNoble?: string } }} */
  const {
    values: { agoricToNoble: connJSON },
  } = parseArgs({
    args,
    options: { agoricToNoble: { type: 'string' } },
  });
  if (!connJSON) return {};
  /** @type {IBCConnectionInfo & Passable} */
  const conn = harden(JSON.parse(connJSON));
  mustMatch(conn, IBCConnectionInfoShape);
  return harden({ agoricToNoble: conn });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('eval-fast-usdc-reconfigure', utils =>
    proposalBuilder(utils, parseConnection(endowments.scriptArgs)),
  );
};
