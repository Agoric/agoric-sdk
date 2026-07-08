import { makeHelpers } from '@agoric/deploy-script-support';
import { parseArgs } from 'node:util';

/**
 * @import {ParseArgsConfig} from 'node:util';
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 */

/** @type {ParseArgsConfig['options']} */
const parserOpts = {
  assets: { type: 'string' },
};

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async (_, options) =>
  harden({
    sourceSpec:
      '@agoric/builders/scripts/testing/register-interchain-bank-assets.js',
    getManifestCall: ['getManifestCall', options],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;

  const {
    values: { assets },
  } = parseArgs({ args: scriptArgs, options: parserOpts });

  if (typeof assets !== 'string') {
    throw Error(
      'must provide --assets=JSON.stringify({ denom; issuerName; decimalPlaces }[])',
    );
  }
  const opts = harden({ assets: JSON.parse(assets) });

  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('eval-register-interchain-bank-assets', utils =>
    defaultProposalBuilder(utils, opts),
  );
};
