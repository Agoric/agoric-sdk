import { assertParsableNumber } from '@agoric/zoe/src/contractSupport/ratio.js';
import {
  Command,
  InvalidArgumentError,
  InvalidOptionArgumentError,
} from 'commander';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { homedir } from 'os';
import {
  readFile as readAsync,
  writeFile as writeAsync,
} from 'node:fs/promises';
import { addConfigCommands } from './config-commands.js';
import { addOperatorCommands } from './operator-commands.js';
import * as configLib from './config.js';
import transferLib from './transfer.js';
import { makeFile } from '../util/file.js';

const packageJson = JSON.parse(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../package.json'),
    'utf8',
  ),
);

const defaultHome = homedir();

export const initProgram = (
  configHelpers = configLib,
  transferHelpers = transferLib,
  readFile = readAsync,
  writeFile = writeAsync,
  mkdir = mkdirSync,
  exists = existsSync,
) => {
  const program = new Command();

  program
    .name('fast-usdc')
    .description('CLI to interact with Fast USDC liquidity pool')
    .version(packageJson.version)
    .option(
      '--home <path>',
      `Home directory to use for config`,
      `${defaultHome}/.fast-usdc/`,
    );

  const makeConfigFile = () => {
    const getConfigPath = () => {
      const { home: configDir } = program.opts();
      return `${configDir}config.json`;
    };
    return makeFile(getConfigPath(), readFile, writeFile, mkdir, exists);
  };

  addConfigCommands(program, configHelpers, makeConfigFile);
  addOperatorCommands(program);

  /** @param {string} value */
  const parseDecimal = value => {
    try {
      assertParsableNumber(value);
    } catch {
      throw new InvalidArgumentError('Not a decimal number.');
    }
    return value;
  };

  /**
   * @param {string} str
   * @returns {'auto' | number}
   */
  const parseFee = str => {
    if (str === 'auto') return 'auto';
    const num = parseFloat(str);
    if (Number.isNaN(num)) {
      throw new InvalidOptionArgumentError('Fee must be a number.');
    }
    return num;
  };

  program
    .command('deposit')
    .description('Offer assets to the liquidity pool')
    .argument('<give>', 'USDC to give', parseDecimal)
    .option('--id [offer-id]', 'Offer ID')
    .option('--fee [fee]', 'Cosmos fee', parseFee)
    .action(() => {
      console.error('TODO actually send deposit');
      // TODO: Implement deposit logic
    });

  program
    .command('withdraw')
    .description('Withdraw assets from the liquidity pool')
    .argument('<want>', 'USDC to withdraw', parseDecimal)
    .option('--id [offer-id]', 'Offer ID')
    .option('--fee [fee]', 'Cosmos fee', parseFee)
    .action(() => {
      console.error('TODO actually send withdrawal');
      // TODO: Implement withdraw logic
    });

  program
    .command('transfer')
    .description('Transfer USDC from Ethereum/L2 to Cosmos via Fast USDC')
    .argument('amount', 'Amount to transfer denominated in uusdc')
    .argument('dest', 'Destination address in Cosmos')
    .action(
      async (
        /** @type {string} */ amount,
        /** @type {string} */ destination,
      ) => {
        await transferHelpers.transfer(makeConfigFile(), amount, destination);
      },
    );

  return program;
};
