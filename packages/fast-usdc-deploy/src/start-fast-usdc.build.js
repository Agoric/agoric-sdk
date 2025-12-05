// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';
import { AmountMath } from '@agoric/ertp';
import { FastUSDCConfigShape } from '@agoric/fast-usdc/src/type-guards.js';
import { multiplyBy, parseRatio } from '@agoric/ertp/src/ratio.js';
import { Far } from '@endo/far';
import { parseArgs } from 'node:util';
import { configurations } from './utils/deploy-config.js';
import { toExternalConfig } from './utils/config-marshal.js';
import {
  parseOracleArgs,
  parseArgsOracleOptions,
} from './utils/oracles-args.js';
import { getManifestForFastUSDC } from './start-fast-usdc.core.js';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js'
 * @import {Brand} from '@agoric/ertp';
 * @import {ParseArgsConfig} from 'node:util'
 * @import {FastUSDCConfig, FeedPolicy} from '@agoric/fast-usdc';
 * @import {FastUSDCOracleOpts} from './utils/oracles-args.js';
 */

const { keys } = Object;

/** @type {ParseArgsConfig['options']} */
const options = {
  ...parseArgsOracleOptions,
  flatFee: { type: 'string', default: '0.01' },
  variableRate: { type: 'string', default: '0.01' },
  contractRate: { type: 'string', default: '0.2' },
  net: { type: 'string' },
  feedPolicy: { type: 'string' },
  usdcDenom: {
    type: 'string',
    default:
      'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9',
  },
  chainInfo: { type: 'string' },
  assetInfo: { type: 'string' },
  noNoble: { type: 'boolean', default: false },
};

const feedPolicyUsage = 'use --feedPolicy <policy> ...';

const chainInfoUsage = 'use --chainInfo {chainName:CosmosChainInfo, ...}';
const assetInfoUsage =
  'use --assetInfo { denom:DenomInfo & {brandKey?: string} ... }';

/**
 * @typedef {{
 *   flatFee: string;
 *   variableRate: string;
 *   contractRate: string;
 *   net?: string;
 *   usdcDenom: string;
 *   feedPolicy?: string;
 *   chainInfo?: string;
 *   assetInfo?: string;
 *   noNoble: boolean;
 * } & FastUSDCOracleOpts} FastUSDCOpts
 */

const crossVatContext = /** @type {const} */ ({
  /** @type {Brand<'nat'>} */
  USDC: Far('USDC Brand'),
});
const { USDC } = crossVatContext;
const USDC_DECIMALS = 6;
const unit = AmountMath.make(USDC, 10n ** BigInt(USDC_DECIMALS));

/**
 * @param {Parameters<CoreEvalBuilder>[0]} powers
 * @param {FastUSDCConfig} config
 * @satisfies {CoreEvalBuilder}
 */
export const defaultProposalBuilder = async (
  { publishRef, install },
  config,
) => {
  return harden({
    sourceSpec: './start-fast-usdc.core.js',
    /** @type {[string, Parameters<typeof getManifestForFastUSDC>[1]]} */
    getManifestCall: [
      getManifestForFastUSDC.name,
      {
        options: toExternalConfig(config, crossVatContext, FastUSDCConfigShape),
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

  /** @type {{ values: FastUSDCOpts }} */
  // @ts-expect-error ensured by options
  const {
    values: {
      net,
      usdcDenom,
      feedPolicy,
      chainInfo,
      assetInfo,
      noNoble,
      ...fees
    },
  } = parseArgs({ args: scriptArgs, options });

  /** @returns {FeedPolicy} */
  const parseFeedPolicy = () => {
    if (net) {
      if (!(net in configurations)) {
        throw Error(`${net} not in ${keys(configurations)}`);
      }
      return configurations[net].feedPolicy;
    }
    if (!feedPolicy) throw Error(feedPolicyUsage);
    const parsed = JSON.parse(feedPolicy);
    if (!parsed.chainPolicies) {
      return {
        ...configurations.MAINNET.feedPolicy,
        ...parsed,
      };
    } else {
      // consider having callers use `toExternalConfig` to pass in bigints and
      // use `fromExternalConfig` here to parse
      throw Error('TODO: support unmarshalling feedPolicy');
    }
  };

  /** @param {string} numeral */
  const toAmount = numeral => multiplyBy(unit, parseRatio(numeral, USDC));
  /** @param {string} numeral */
  const toRatio = numeral => parseRatio(numeral, USDC);
  const parseFeeConfigArgs = () => {
    const { flatFee, variableRate, contractRate } = fees;
    return {
      flat: toAmount(flatFee),
      variableRate: toRatio(variableRate),
      contractRate: toRatio(contractRate),
    };
  };

  const parseChainInfo = () => {
    if (net) {
      if (!(net in configurations)) {
        throw Error(`${net} not in ${keys(configurations)}`);
      }
      return configurations[net].chainInfo;
    }
    if (!chainInfo) throw Error(chainInfoUsage);
    return JSON.parse(chainInfo);
  };
  const parseAssetInfo = () => {
    if (net) {
      if (!(net in configurations)) {
        throw Error(`${net} not in ${keys(configurations)}`);
      }
      return configurations[net].assetInfo;
    }
    if (!assetInfo) throw Error(assetInfoUsage);
    return JSON.parse(assetInfo);
  };

  /** @type {FastUSDCConfig} */
  const config = harden({
    oracles: parseOracleArgs(scriptArgs),
    terms: {
      usdcDenom,
    },
    feeConfig: parseFeeConfigArgs(),
    feedPolicy: parseFeedPolicy(),
    chainInfo: parseChainInfo(),
    assetInfo: parseAssetInfo(),
    noNoble,
  });

  await writeCoreEval('start-fast-usdc', utils =>
    defaultProposalBuilder(utils, config),
  );
};
