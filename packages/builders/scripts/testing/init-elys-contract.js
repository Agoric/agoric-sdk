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

  // const {
  //   values: { chainInfo, assetInfo },
  // } = parseArgs({
  //   args: scriptArgs,
  //   options: parserOpts,
  // });

  const chainInfo = JSON.stringify(withChainCapabilities(minimalChainInfos))
  // const commonAssetInfo = [
  //   assetOn('uist', 'agoric', undefined, 'cosmoshub', chainInfoWithCaps),
  //   assetOn('uusdc', 'noble', undefined, 'agoric', chainInfoWithCaps),
  //   assetOn('uatom', 'cosmoshub', undefined, 'agoric', chainInfoWithCaps),
  //   assetOn('uusdc', 'noble', undefined, 'dydx', chainInfoWithCaps),
  //   assetOn(
  //     'ibc/92287A0B6A572CDB384B6CD0FE396DFE23F5C2E02801E9562659DACCFD74941E',
  //     'elys',
  //     undefined,
  //     'agoric',
  //     chainInfoWithCaps,
  //   ),
  // ];
  const assetInfo = JSON.stringify([
    [
      'uist',
      {
        baseDenom: 'uist',
        baseName: 'agoric',
        chainName: 'agoric',
      },
    ],
    [
      'ubld',
      {
        baseDenom: 'ubld',
        baseName: 'agoric',
        chainName: 'agoric',
      },
    ],
    [
      'uatom',
      {
        baseDenom: 'uatom',
        baseName: 'cosmoshub',
        chainName: 'cosmoshub',
      },
    ],
    [
      'uelys',
      {
        baseDenom: 'uelys',
        baseName: 'elys',
        chainName: 'elys',
      },
    ],
    [
      'utia',
      {
        baseDenom: 'utia',
        baseName: 'celestia',
        chainName: 'celestia',
      },
    ],
    [
      'ibc/627650D6C650F179DDBD708591E613345910985F5549DB1F6991020B101EE8E0',
      {
        baseDenom: 'ibc/D02B2CC73ABD49D2746AF67980F7CDD93A54B0AFF8C75EFA095B0423B8950653',
        baseName: 'elys',
        chainName: 'agoric',
      },
    ],
    [
      'ibc/F00782820450D9F76025F7FC25BF026EC11309069CE89C1CD326311033E17E3E',
      {
        baseDenom: 'uatom',
        baseName: 'cosmoshub',
        chainName: 'agoric',
      },
    ],
    [
      'ibc/510D1969E876B0DCE9EE450CEC7BF987164CF9E4E42516FF972EDDBA9B64BE09',
      {
        baseDenom: 'utia',
        baseName: 'celestia',
        chainName: 'agoric',
      },
    ],
  ]);

  const parseChainInfo = () => {
    if (typeof chainInfo !== 'string') return undefined;
    return JSON.parse(chainInfo);
  };
  const parseAssetInfo = () => {
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
