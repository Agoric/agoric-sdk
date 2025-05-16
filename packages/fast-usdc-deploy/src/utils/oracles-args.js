// @ts-check
import { parseArgs } from 'node:util';
import { configurations } from './deploy-config.js';

/**
 * @import {ParseArgsConfig} from 'node:util';
 */

/**
 * @typedef {{
 *   net?: string;
 *   oracle?: string[];
 * }} FastUSDCOracleOpts
 */

const { keys } = Object;

/** @type {ParseArgsConfig['options']} */
const options = {
  net: { type: 'string' },
  oracle: { type: 'string', multiple: true },
};
const oraclesUsage = 'use --oracle name:address ...';

export { options as parseArgsOracleOptions };

export const parseOracleArgs = scriptArgs => {
  /** @type {{ values: FastUSDCOracleOpts }} */
  const {
    values: { oracle: oracleArgs, net },
  } = parseArgs({ args: scriptArgs, options });

  if (net) {
    if (!(net in configurations)) {
      throw Error(`${net} not in ${keys(configurations)}`);
    }
    return configurations[net].oracles;
  }
  if (!oracleArgs) throw Error(oraclesUsage);
  return harden(
    Object.fromEntries(
      oracleArgs.map(arg => {
        const result = arg.match(/(?<name>[^:]+):(?<address>.+)/);
        if (!(result && result.groups)) throw Error(oraclesUsage);
        const { name, address } = result.groups;
        return [name, address];
      }),
    ),
  );
};
