#!/usr/bin/env -S node --import ts-blank-space/register
/* global process */

import '@endo/init/pre-remoting.js';
import '../src/init/shims.js';
import '../src/init/lockdown.js';

import { cacheStats, deleteCachedTx, inspectCache } from './cache-tool-lib.ts';
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
  console.error('  scan <txId> [--verbose]');
  console.error('    Process a pending transaction by reading from vstorage');
  console.error('');
  console.error('  settle <txId> <status> [reason]');
  console.error('    Manually mark a transaction as succeeded or failed');
  console.error('    status: "success" or "fail"');
  console.error('    reason: required when status is "fail"');
  console.error('');
  console.error('  cache inspect <txId>');
  console.error(
    '    Print resolved / ignored / blockLowerBound cache state for a txId',
  );
  console.error('');
  console.error('  cache delete <txId>');
  console.error(
    '    Remove all cache entries for a txId so the next startup re-reads it',
  );
  console.error('');
  console.error('  cache stats');
  console.error('    Show counts of cached entries grouped by status / type');
  console.error('');
  console.error('Examples:');
  console.error('  ./scripts/tx-tool.ts scan tx233');
  console.error('  ./scripts/tx-tool.ts scan tx233 --verbose');
  console.error('  ./scripts/tx-tool.ts settle tx399 success');
  console.error(
    '  ./scripts/tx-tool.ts settle tx400 fail "Transaction timeout"',
  );
  console.error('  ./scripts/tx-tool.ts cache inspect tx233');
  console.error('  ./scripts/tx-tool.ts cache delete tx233');
  console.error('  ./scripts/tx-tool.ts cache stats');
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
    console.error('Error: scan requires a transaction ID');
    console.error('');
    console.error('Usage: ./scripts/tx-tool.ts scan <txId> [--verbose]');
    console.error('Example: ./scripts/tx-tool.ts scan tx233');
    process.exit(1);
  }

  const txId = commandArgs[0];
  const options = commandArgs.slice(1);

  processTx(txId, options, { env }).catch(err => {
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
} else if (command === 'cache') {
  const sub = commandArgs[0];
  const rest = commandArgs.slice(1);
  try {
    switch (sub) {
      case 'inspect': {
        rest.length === 1 ||
          (() => {
            console.error('Usage: ./scripts/tx-tool.ts cache inspect <txId>');
            process.exit(1);
          })();
        inspectCache(rest[0], { env });
        break;
      }
      case 'delete': {
        rest.length === 1 ||
          (() => {
            console.error('Usage: ./scripts/tx-tool.ts cache delete <txId>');
            process.exit(1);
          })();
        deleteCachedTx(rest[0], { env });
        break;
      }
      case 'stats': {
        cacheStats({ env });
        break;
      }
      default: {
        console.error(`Error: Unknown cache subcommand "${sub ?? ''}"`);
        console.error('');
        showUsage();
        process.exit(1);
      }
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
} else {
  console.error(`Error: Unknown command "${command}"`);
  console.error('');
  showUsage();
  process.exit(1);
}
