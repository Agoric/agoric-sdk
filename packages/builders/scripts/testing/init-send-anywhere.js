import { makeHelpers } from '@agoric/deploy-script-support';
import {
  getManifest,
  startSendAnywhere,
} from '@agoric/orchestration/src/proposals/start-send-anywhere.js';
import { parseArgs } from 'node:util';

/**
 * @import {ParseArgsConfig} from 'node:util'
 */

const chainInfoUsage = 'use --chainInfo chainName:CosmosChainInfo ...';
const assetInfoUsage =
  'use --assetInfo denom:DenomInfo & {brandKey?: string} ...';

/** @type {ParseArgsConfig['options']} */
const parserOpts = {
  chainInfo: { type: 'string' },
  assetInfo: { type: 'string' },
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) =>
  harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-send-anywhere.js',
    getManifestCall: [
      getManifest.name,
      {
        installationRef: publishRef(
          install(
            '@agoric/orchestration/src/examples/send-anywhere.contract.js',
          ),
        ),
        options,
      },
    ],
  });

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
    if (!chainInfo) throw Error(chainInfoUsage);
    if (typeof chainInfo !== 'string') throw Error('chainInfo must be string');
    return JSON.parse(chainInfo);
  };
  const parseAssetInfo = () => {
    if (!assetInfo) throw Error(assetInfoUsage);
    if (typeof assetInfo !== 'string') throw Error('assetInfo must be string');
    return JSON.parse(assetInfo);
  };
  const opts = harden({
    chainInfo: parseChainInfo(),
    assetInfo: parseAssetInfo(),
  });

  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval(startSendAnywhere.name, utils =>
    defaultProposalBuilder(utils, opts),
  );
};
