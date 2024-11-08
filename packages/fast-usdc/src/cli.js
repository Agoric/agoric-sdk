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

program.parse();
