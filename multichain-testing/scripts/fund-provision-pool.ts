#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-env node */
import { execa } from 'execa';
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';

// Default values from Makefile
const DEFAULT_PROVISION_POOL_ADDR =
  'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346';
/**
 * Each wallet gets 0.25 IST when provisioned, so this make allows 399 accounts.
 * (400 would be more round and make the number less apparent in logs.)
 */
const DEFAULT_PROVISION_POOL_COIN = '999750000uist';

/**
 * Fund the vbank/provision module account so it can provision smart wallets.
 */
async function fundProvisionPool(args: {
  address?: string;
  amount?: string;
  pod?: string;
  container?: string;
}) {
  const {
    address = DEFAULT_PROVISION_POOL_ADDR,
    amount = DEFAULT_PROVISION_POOL_COIN,
    pod = 'agoriclocal-genesis-0',
    container = 'validator',
  } = args;

  console.log(`Funding provision pool at ${address} with ${amount}...`);

  try {
    // Execute the bank send transaction
    const { stdout: txResult } = await execa('kubectl', [
      'exec',
      '-i',
      pod,
      '-c',
      container,
      '--',
      'agd',
      'tx',
      'bank',
      'send',
      'faucet',
      address,
      amount,
      '-y',
      '--broadcast-mode',
      'block',
    ]);
    const resultData = JSON.parse(txResult);
    if (resultData.code !== 0) {
      throw new Error(`Transaction failed: ${resultData['raw_log']}`);
    }

    // Query the balance to confirm
    const { stdout: balanceResult } = await execa('kubectl', [
      'exec',
      '-i',
      pod,
      '-c',
      container,
      '--',
      'agd',
      'query',
      'bank',
      'balances',
      address,
    ]);
    const balanceData = JSON.parse(balanceResult);
    assert(balanceData.balances.length > 0, 'No balances found');

    console.log('Fund provision pool completed successfully');
    return true;
  } catch (error) {
    console.error('Error funding provision pool:', error);
    return false;
  }
}

async function main() {
  // Parse command-line arguments
  const { values } = parseArgs({
    options: {
      address: { type: 'string', short: 'a' },
      amount: { type: 'string', short: 'm' },
      pod: { type: 'string', short: 'p' },
      container: { type: 'string', short: 'c' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
Usage: fund-provision-pool.ts [options]

Fund the vbank/provision module account so it can provision smart wallets.
Each wallet gets 0.25 IST when provisioned.

Options:
  -a, --address     The provision pool address (default: ${DEFAULT_PROVISION_POOL_ADDR})
  -m, --amount      Amount to fund (default: ${DEFAULT_PROVISION_POOL_COIN})
  -p, --pod         Pod name (default: agoriclocal-genesis-0)
  -c, --container   Container name (default: validator)
  -h, --help        Show this help message
`);
    process.exit(0);
  }

  const attempt = () =>
    fundProvisionPool({
      address: values.address,
      amount: values.amount,
      pod: values.pod,
      container: values.container,
    });

  // This sometime fails because a previous transaction was not awaited.
  let success = await attempt();

  if (!success) {
    console.log('Trying again...');
    success = await attempt();
  }

  process.exit(success ? 0 : 1);
}

main().catch(error => {
  console.error('An unhandled error occurred:', error);
  process.exit(1);
});
