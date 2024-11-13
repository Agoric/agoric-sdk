// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';
import { AmountMath } from '@agoric/ertp';
import {
  FastUSDCConfigShape,
  getManifestForFastUSDC,
} from '@agoric/fast-usdc/src/fast-usdc.start.js';
import { toExternalConfig } from '@agoric/fast-usdc/src/utils/config-marshal.js';
import { objectMap } from '@agoric/internal';
import {
  multiplyBy,
  parseRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/far';
import { parseArgs } from 'node:util';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js'
 * @import {ParseArgsConfig} from 'node:util'
 * @import {FastUSDCConfig} from '@agoric/fast-usdc/src/fast-usdc.start.js'
 */

/** @type {ParseArgsConfig['options']} */
const options = {
  contractFee: { type: 'string', default: '0.01' },
  poolFee: { type: 'string', default: '0.01' },
  oracle: { type: 'string', multiple: true },
};
const oraclesRequiredUsage = 'use --oracle name:address ...';
/**
 * @typedef {{
 *   contractFee: string;
 *   poolFee: string;
 *   oracle?: string[];
 * }} FastUSDCOpts
 */

const crossVatContext = /** @type {const} */ ({
  /** @type {Brand<'nat'>} */
  USDC: Far('USDC Brand'),
});
const { USDC } = crossVatContext;
const USDC_DECIMALS = 6;
const unit = AmountMath.make(USDC, 10n ** BigInt(USDC_DECIMALS));

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  /** @type {FastUSDCConfig} */ config,
) => {
  return harden({
    sourceSpec: '@agoric/fast-usdc/src/fast-usdc.start.js',
    /** @type {[string, Parameters<typeof getManifestForFastUSDC>[1]]} */
    getManifestCall: [
      getManifestForFastUSDC.name,
      {
        options: toExternalConfig(config, crossVatContext, FastUSDCConfigShape),
        installKeys: {
          fastUsdc: publishRef(
            install('@agoric/fast-usdc/src/fast-usdc.contract.js'),
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
    values: { oracle: oracleArgs, ...fees },
  } = parseArgs({ args: scriptArgs, options });

  const parseOracleArgs = () => {
    if (!oracleArgs) throw Error(oraclesRequiredUsage);
    return Object.fromEntries(
      oracleArgs.map(arg => {
        const result = arg.match(/(?<name>[^:]+):(?<address>.+)/);
        if (!(result && result.groups)) throw Error(oraclesRequiredUsage);
        const { name, address } = result.groups;
        return [name, address];
      }),
    );
  };

  /** @type {FastUSDCConfig} */
  const config = harden({
    oracles: parseOracleArgs(),
    terms: {
      ...objectMap(fees, numeral =>
        multiplyBy(unit, parseRatio(numeral, USDC)),
      ),
      usdcDenom: 'ibc/usdconagoric',
    },
  });

  await writeCoreEval('start-fast-usdc', utils =>
    defaultProposalBuilder(utils, config),
  );
};
