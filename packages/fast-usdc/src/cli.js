#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const packageJson = JSON.parse(
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../package.json'),
    'utf8',
  ),
);

const program = new Command();

program
  .name('fast-usdc')
  .description('CLI to interact with Fast USDC liquidity pool')
  .version(packageJson.version);

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
    // 3. Compute noble forwarding address from result
    // 4. Tell watcher to watch for transfers to computer address
    // 5. Sign and broadcast CCTP transfer to noble forwarding address
  });

program.parse();
