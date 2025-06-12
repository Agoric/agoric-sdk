/* eslint-env node */
/* global globalThis */
import { Command } from 'commander';
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
import * as transferLib from './transfer.js';
import { makeFile } from './util/file.js';
import { addLPCommands } from './lp-commands.js';

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
  fetch = globalThis.fetch,
  stdout = process.stdout,
  stderr = process.stderr,
  env = process.env,
  now = () => Date.now(),
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

  program.addHelpText(
    'afterAll',
    `
  Agoric test networks provide configuration info at, for example,

  https://devnet.agoric.net/network-config

  To use RPC endpoints from such a configuration, use:
  export AGORIC_NET=devnet

  Use AGORIC_NET=local or leave it unset to use localhost and chain id agoriclocal.
  `,
  );
  addConfigCommands(program, configHelpers, makeConfigFile);
  addOperatorCommands(program, {
    fetch,
    stdout,
    stderr,
    env,
    now,
  });
  addLPCommands(program, { fetch, stdout, stderr, env, now });

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
        const start = now();
        await transferHelpers.transfer(makeConfigFile(), amount, destination);
        const duration = now() - start;
        stdout.write(
          `Transfer finished in ${(duration / 1000).toFixed(1)} seconds`,
        );
      },
    );

  return program;
};
