import { Command } from 'commander';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { homedir } from 'os';
import {
  readFile as readAsync,
  writeFile as writeAsync,
} from 'node:fs/promises';
import configLib from './config.js';
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

  const config = program.command('config').description('Manage config');

  const configFilename = 'config.json';
  const getConfigPath = () => {
    const { home: configDir } = program.opts();
    return configDir + configFilename;
  };

  const makeConfigFile = () =>
    makeFile(getConfigPath(), readFile, writeFile, mkdir, exists);

  config
    .command('show')
    .description('Show current config')
    .action(async () => {
      await configHelpers.show(makeConfigFile());
    });

  config
    .command('init')
    .description('Set initial config values')
    .requiredOption(
      '--noble-seed <seed>',
      'Seed phrase for Noble account. CAUTION: Stored unencrypted in file system',
    )
    .requiredOption(
      '--eth-seed <seed>',
      'Seed phrase for Ethereum account. CAUTION: Stored unencrypted in file system',
    )
    .option('--agoric-rpc [url]', 'Agoric RPC endpoint', '127.0.0.1:1317')
    .option('--noble-api [url]', 'Noble API endpoint', '127.0.0.1:1318')
    .option(
      '--noble-to-agoric-channel [channel]',
      'Channel ID on Noble for Agoric',
      'channel-21',
    )
    .option('--noble-rpc [url]', 'Noble RPC endpoint', '127.0.0.1:26657')
    .option('--eth-rpc [url]', 'Ethereum RPC Endpoint', '127.0.0.1:8545')
    .option(
      '--token-messenger-address [address]',
      'Address of TokenMessenger contract',
      // Default to ETH mainnet contract address. For ETH sepolia, use 0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5
      '0xbd3fa81b58ba92a82136038b25adec7066af3155',
    )
    .option(
      '--token-contract-address [address]',
      'Address of USDC token contract',
      // Detault to ETH mainnet token address. For ETH sepolia, use 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    )
    .action(async options => {
      await configHelpers.init(makeConfigFile(), options);
    });

  config
    .command('update')
    .description('Update config values')
    .option(
      '--noble-seed [string]',
      'Seed phrase for Noble account. CAUTION: Stored unencrypted in file system',
    )
    .option(
      '--eth-seed [string]',
      'Seed phrase for Ethereum account. CAUTION: Stored unencrypted in file system',
    )
    .option('--agoric-rpc [url]', 'Agoric RPC endpoint')
    .option('--noble-rpc [url]', 'Noble RPC endpoint')
    .option('--eth-rpc [url]', 'Ethereum RPC Endpoint')
    .option('--noble-api [url]', 'Noble API endpoint')
    .option(
      '--noble-to-agoric-channel [channel]',
      'Channel ID on Noble for Agoric',
    )
    .option(
      '--token-messenger-address [address]',
      'Address of TokenMessenger contract',
    )
    .option(
      '--token-contract-address [address]',
      'Address of USDC token contract',
    )
    .action(async options => {
      await configHelpers.update(makeConfigFile(), options);
    });

  program
    .command('deposit')
    .description('Offer assets to the liquidity pool')
    .action(() => {
      console.error('TODO actually send deposit');
      // TODO: Implement deposit logic
    });

  program
    .command('withdraw')
    .description('Withdraw assets from the liquidity pool')
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
