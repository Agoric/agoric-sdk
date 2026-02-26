#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-env node */

import '@endo/init/pre-remoting.js';
import '../src/shims.cjs';
import '../src/lockdown.js';

import { processTx } from './process-tx-lib.ts';
import { resolveTx } from './resolve-tx-lib.ts';

const dotEnvFile = process.env.DOTENV || '.env';
const processEnv = { ...process.env };
const dotenv = await import('dotenv');
const dotEnvAdditions = {} as { [key: string]: string };
dotenv.config({ path: dotEnvFile, processEnv: dotEnvAdditions });
const env = harden({ ...dotEnvAdditions, ...processEnv });

const showUsage = () => {
  console.error('Usage: ./scripts/tx-tool.ts <command> [options]');
  console.error('');
  console.error('Commands:');
  console.error('  scan <concurrency> [--verbose]');
  console.error(
    '    Run N parallel lookback scans for the hardcoded tx (load test)',
  );
  console.error('');
  console.error('  settle <txId> <status> [reason]');
  console.error('    Manually mark a transaction as succeeded or failed');
  console.error('    status: "success" or "fail"');
  console.error('    reason: required when status is "fail"');
  console.error('');
  console.error('Examples:');
  console.error('  ./scripts/tx-tool.ts scan 10');
  console.error('  ./scripts/tx-tool.ts scan 50 --verbose');
  console.error('  ./scripts/tx-tool.ts settle tx399 success');
  console.error(
    '  ./scripts/tx-tool.ts settle tx400 fail "Transaction timeout"',
  );
};

const args = process.argv.slice(2);
if (args.length === 0) {
  showUsage();
  process.exit(1);
}

const command = args[0];
const commandArgs = args.slice(1);

if (command === 'scan') {
  if (commandArgs.length === 0) {
    console.error('Error: scan requires a concurrency number');
    console.error('');
    console.error(
      'Usage: ./scripts/tx-tool.ts scan <concurrency> [--verbose]',
    );
    console.error('Example: ./scripts/tx-tool.ts scan 10');
    process.exit(1);
  }

  const concurrency = Number(commandArgs[0]);
  if (!Number.isFinite(concurrency) || concurrency < 1) {
    console.error(
      `Error: concurrency must be a positive number, got "${commandArgs[0]}"`,
    );
    process.exit(1);
  }
  const options = commandArgs.slice(1);

  processTx(concurrency, options, { env }).catch(err => {
    console.error(err);
    process.exit(1);
  });
} else if (command === 'settle') {
  if (commandArgs.length < 2) {
    console.error('Error: settle requires a transaction ID and status');
    console.error('');
    console.error(
      'Usage: ./scripts/tx-tool.ts settle <txId> <status> [reason]',
    );
    console.error('  status: "success" or "fail"');
    console.error('  reason: required when status is "fail"');
    console.error('');
    console.error('Examples:');
    console.error('  ./scripts/tx-tool.ts settle tx399 success');
    console.error(
      '  ./scripts/tx-tool.ts settle tx400 fail "Transaction timeout"',
    );
    process.exit(1);
  }

  const txId = commandArgs[0] as `tx${number}`;
  const statusArg = commandArgs[1];
  const reason = commandArgs[2];

  if (statusArg.toLowerCase() === 'fail' && !reason) {
    console.error(
      'Error: Reason is required when marking a transaction as failed',
    );
    console.error('');
    console.error('Usage: ./scripts/tx-tool.ts settle <txId> fail <reason>');
    console.error(
      'Example: ./scripts/tx-tool.ts settle tx400 fail "Transaction timeout"',
    );
    process.exit(1);
  }

  resolveTx(txId, statusArg, reason, { env }).catch(err => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.error(`Error: Unknown command "${command}"`);
  console.error('');
  showUsage();
  process.exit(1);
}
