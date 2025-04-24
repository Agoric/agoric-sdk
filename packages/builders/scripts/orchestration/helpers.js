/**
 * @import {DeployScriptEndownments} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 * @import {ParseArgsConfig} from 'node:util'
 */

/**
 * Parse `chainInfo` and `assetInfo` into builder opts
 *
 * NOTE: Ambient authority via `node:util`
 *
 * @param {DeployScriptEndownments['scriptArgs']} scriptArgs
 * @returns {Promise<{
 *      chainInfo: Record<string, CosmosChainInfo>;
 *     assetInfo: [Denom, DenomDetail & { brandKey?: string }][];
 * }>}
 */
export const parseChainHubOpts = async scriptArgs => {
  // import dynamically so the modules can work in CoreEval environment
  const { parseArgs } = await import('node:util');

  /** @type {ParseArgsConfig['options']} */
  const parserOpts = {
    chainInfo: { type: 'string' },
    assetInfo: { type: 'string' },
  };
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
  return harden({
    chainInfo: parseChainInfo(),
    assetInfo: parseAssetInfo(),
  });
};
