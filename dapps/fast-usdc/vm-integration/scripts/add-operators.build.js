// @ts-check
import { makeHelpers } from '@agoric/deploy-script-support';
import { Far } from '@endo/far';
import { parseArgs } from 'node:util';
import { getManifestForAddOperators } from '../src/add-operators.core.js';
import { toExternalConfig } from '../src/utils/config-marshal.js';
import { configurations } from '../src/utils/deploy-config.js';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {ParseArgsConfig} from 'node:util';
 * @import {Brand} from '@agoric/ertp';
 * @import {FastUSDCConfig, FeedPolicy} from '@agoric/fast-usdc-contract';
 * @import {FastUSDCOpts} from './start-fast-usdc.build.js';
 */

const { keys } = Object;

/** @type {ParseArgsConfig['options']} */
const options = {
  net: { type: 'string' },
  oracle: { type: 'string', multiple: true },
};
const oraclesUsage = 'use --oracle name:address ...';

const crossVatContext = /** @type {const} */ ({
  /** @type {Brand<'nat'>} */
  USDC: Far('USDC Brand'),
});

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  powers,
  /** @type {FastUSDCConfig} */ config,
) => {
  return harden({
    sourceSpec: '../src/add-operators.core.js',
    /** @type {[string, Parameters<typeof getManifestForAddOperators>[1]]} */
    getManifestCall: [
      getManifestForAddOperators.name,
      {
        options: toExternalConfig(config, crossVatContext),
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
    values: { oracle: oracleArgs, net },
  } = parseArgs({ args: scriptArgs, options });

  const parseOracleArgs = () => {
    if (net) {
      if (!(net in configurations)) {
        throw Error(`${net} not in ${keys(configurations)}`);
      }
      return configurations[net].oracles;
    }
    if (!oracleArgs) throw Error(oraclesUsage);
    return Object.fromEntries(
      oracleArgs.map(arg => {
        const result = arg.match(/(?<name>[^:]+):(?<address>.+)/);
        if (!(result && result.groups)) throw Error(oraclesUsage);
        const { name, address } = result.groups;
        return [name, address];
      }),
    );
  };

  const config = harden({
    oracles: parseOracleArgs(),
  });

  await writeCoreEval('add-operators', utils =>
    defaultProposalBuilder(utils, config),
  );
};
