/**
 * @import {Command} from 'commander';
 * @import {File} from './util/file.js';
 * @import * as ConfigHelpers from './config.js';
 */
/**
 *
 * @param {Command} program
 * @param {ConfigHelpers} configHelpers
 * @param {() => File} makeConfigFile
 */
export const addConfigCommands = (program, configHelpers, makeConfigFile) => {
  const config = program.command('config').description('Manage config');

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
    .requiredOption(
      '--agoric-seed <seed>',
      'Seed phrase for Agoric LP account. CAUTION: Stored unencrypted in file system',
    )
    .option(
      '--agoric-rpc [url]',
      'Agoric RPC endpoint',
      'http://127.0.0.1:26656',
    )
    .option(
      '--agoric-api [url]',
      'Agoric RPC endpoint',
      'http://127.0.0.1:1317',
    )
    .option('--noble-rpc [url]', 'Noble RPC endpoint', 'http://127.0.0.1:26657')
    .option('--noble-api [url]', 'Noble API endpoint', 'http://127.0.0.1:1318')
    .option('--eth-rpc [url]', 'Ethereum RPC Endpoint', 'http://127.0.0.1:8545')
    .option(
      '--noble-to-agoric-channel [channel]',
      'Channel ID on Noble for Agoric',
      'channel-21',
    )
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
    .option(
      '--agoric-seed <seed>',
      'Seed phrase for Agoric LP account. CAUTION: Stored unencrypted in file system',
    )
    .option('--agoric-rpc [url]', 'Agoric RPC endpoint')
    .option('--agoric-api [url]', 'Agoric API endpoint')
    .option('--noble-rpc [url]', 'Noble RPC endpoint')
    .option('--noble-api [url]', 'Noble API endpoint')
    .option('--eth-rpc [url]', 'Ethereum RPC Endpoint')
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

  return config;
};
