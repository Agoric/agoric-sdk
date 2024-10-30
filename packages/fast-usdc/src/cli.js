#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { homedir } from 'os';

const packageJson = JSON.parse(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../package.json'),
    'utf8',
  ),
);

const homeDirectory = homedir();

const program = new Command();

program
  .name('fast-usdc')
  .description('CLI to interact with Fast USDC liquidity pool')
  .version(packageJson.version)
  .option(
    '--home <path>',
    `Home directory to use for config`,
    `${homeDirectory}/.fast-usdc`,
  );

const config = program.command('config').description('Manage config');

config
  .command('show')
  .description('Show current config')
  .action(() => {
    // TODO: Read config from "--home" dir and output to console.
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
  .option('--agoric-api [url]', 'Agoric API endpoint', '127.0.0.1:1317')
  .option('--noble-rpc [url]', 'Noble RPC endpoint', '127.0.0.1:26657')
  .option('--eth-rpc [url]', 'Ethereum RPC Endpoint', '127.0.0.1:8545')
  .action(() => {
    // TODO: Write config to file in "--home" dir.
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
  .option('--agoric-api [url]', 'Agoric API endpoint', '127.0.0.1:1317')
  .option('--noble-rpc [url]', 'Noble RPC endpoint', '127.0.0.1:26657')
  .option('--eth-rpc [url]', 'Ethereum RPC Endpoint', '127.0.0.1:8545')
  .action(() => {
    // TODO: Write config to file in "--home" dir.
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
  .action((/** @type {string} */ amount, /** @type {string} */ destination) => {
    const start = Date.now();
    console.error(
      `TODO actually kick off USDC transfer. Amount: ${amount}uusdc Destination: ${destination}`,
    );
    console.info(`Finished in ${Date.now() - start}ms`);
    // TODO: Implement transfer logic
    // 1. Look up agoric Fast USDC contract address
    // 2. Append destination address to agoric address
    // 4. Register noble forwarding address for agoric address
    // 5. Sign and broadcast CCTP transfer to noble forwarding address
  });

program.parse();
