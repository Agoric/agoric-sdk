/**
 * @file A proposal to start the Elys contract.
 *
 *   Elys Contract allows users to liquid stake their tokens on stride and receive the stTokens on Elys, in one click.
 */
import { makeHelpers } from '@agoric/deploy-script-support';
import { withChainCapabilities } from '@agoric/orchestration';
import {
  getManifest,
  startElys,
} from '@agoric/orchestration/src/proposals/start-elys.js';

/**
 * @import {ParseArgsConfig} from 'node:util'
 */

/** @type {ParseArgsConfig['options']} */
const parserOpts = {
  chainInfo: { type: 'string' },
  assetInfo: { type: 'string' },
};

import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import {generateAssetListConfig} from '@agoric/orchestration/src/asset-list-elys.js';

export const minimalChainInfos = {
  agoric: fetchedChainInfo.agoric,
  // osmosis: fetchedChainInfo.osmosis,
  // dydx: fetchedChainInfo.dydx,
  // noble: fetchedChainInfo.noble,
  cosmoshub: fetchedChainInfo.cosmoshub,
  stride: fetchedChainInfo.stride,
  elys: fetchedChainInfo.elys,
  celestia: fetchedChainInfo.celestia,
};

export const createFeeTestConfig = (feeCollector) => {
  const feeConfig = {
    feeCollector,
    onBoardRate: {
      numerator: BigInt(20),
      denominator: BigInt(100),
    }, // 20%
    offBoardRate: {
      numerator: BigInt(10),
      denominator: BigInt(100),
    }, // 10%
  };
  return feeConfig;
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) => {
  return harden({
    sourceSpec: '@agoric/orchestration/src/proposals/start-elys.js',
    getManifestCall: [
      getManifest.name,
      {
        installKeys: {
          ElysContract: publishRef(
            install('@agoric/orchestration/src/examples/elys.contract.js'),
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

  const chainInfo = JSON.stringify(withChainCapabilities(minimalChainInfos))

  const parseChainInfo = () => {
    if (typeof chainInfo !== 'string') return undefined;
    return JSON.parse(chainInfo);
  };
  const parseAssetInfo = () => {
    const assetInfo = generateAssetListConfig(minimalChainInfos);
    if (typeof assetInfo !== 'string') return undefined;
    return JSON.parse(assetInfo);
  };
  const feeConfig = createFeeTestConfig(
      'agoric1a659t9fem9vpux6anq8877jh0dz6dtzj7g06r7',
    );
    const x = JSON.parse(
      JSON.stringify(feeConfig, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    )
  const opts = harden({
    chainInfo: parseChainInfo(),
    assetInfo: parseAssetInfo(),
    feeConfig: JSON.parse(
      JSON.stringify(feeConfig, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ),
  });

  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval(startElys.name, utils =>
    defaultProposalBuilder(utils, opts),
  );
};
