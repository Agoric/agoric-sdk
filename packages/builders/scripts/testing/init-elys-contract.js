/**
 * @file A proposal to start the Elys contract.
 *
 *   Elys Contract allows users to liquid stake their tokens on stride and receive the stTokens on Elys, in one click. 
 */
import { makeHelpers } from '@agoric/deploy-script-support';
import { startElys } from '@agoric/orchestration/src/proposals/start-elys.js';
import { parseArgs } from 'node:util';

/**
 * @import {ParseArgsConfig} from 'node:util'
 */

/** @type {ParseArgsConfig['options']} */
const parserOpts = {
  chainInfo: { type: 'string' },
  assetInfo: { type: 'string' },
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) => {
  return harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-elys.js',
    getManifestCall: [
      'getManifest',
      {
        installKeys: {
          ElysContract: publishRef(
            install(
              '@agoric/orchestration/src/examples/elys.contract.js',
            ),
          ),
        },
        options,
      },
    ],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;

  const {
    values: { chainInfo, assetInfo },
  } = parseArgs({
    args: scriptArgs,
    options: parserOpts,
  });

  const parseChainInfo = () => {
    if (typeof chainInfo !== 'string') return undefined;
    return JSON.parse(chainInfo);
  };
  const parseAssetInfo = () => {
    if (typeof assetInfo !== 'string') return undefined;
    return JSON.parse(assetInfo);
  };
  const opts = harden({
    chainInfo: parseChainInfo(),
    assetInfo: parseAssetInfo(),
  });

  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval(startElys.name, utils =>
    defaultProposalBuilder(utils, opts),
  );
};
