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
// import { minimalChainInfos } from '../tools/chainInfo.js';
// import { minimalChainInfos } from '../../../boot/test/tools/chainInfo.js';
// import { assetOn } from '@agoric/orchestration/src/utils/asset.js';
// import { parseArgs } from 'node:util';

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
};

export const createFeeTestConfig = (feeCollector) => {
  const feeConfig = {
    feeCollector,
    onBoardRate: {
      nominator: BigInt(20),
      denominator: BigInt(100),
    }, // 20%
    offBoardRate: {
      nominator: BigInt(10),
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
      'ibc/89BB00177EBDF554BF8382094D770DC3EA1C7F5945A48D61C07A867C6ED6709B',
      {
        baseDenom: 'ibc/EF3BDB6C8222A465BF8EC6B02EBE350E82DC0AC4FDB75286A92B8433A3B026EC',
        baseName: 'elys',
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
