#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-env node */

import '@endo/init/pre-remoting.js';
import '../src/shims.cjs';
import '../src/lockdown.js';

import { resolveTx } from './resolve-tx-lib.ts';

const dotEnvFile = process.env.DOTENV || '.env';
const processEnv = { ...process.env };
const dotenv = await import('dotenv');
const dotEnvAdditions = {} as { [key: string]: string };
dotenv.config({ path: dotEnvFile, processEnv: dotEnvAdditions });
const env = harden({ ...dotEnvAdditions, ...processEnv });

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: ./tools/resolve-tx.ts <txId> <status> [reason]');
  console.error('  status: "success" or "fail"');
  console.error(
    '  reason: required when status is "fail", optional for "success"',
  );
  console.error('');
  console.error('Examples:');
  console.error('  ./tools/resolve-tx.ts tx399 success');
  console.error('  ./tools/resolve-tx.ts tx400 fail "Transaction timeout"');
  console.error(
    '  ./tools/resolve-tx.ts tx401 fail "Unable to confirm on destination chain"',
  );
  process.exit(1);
}

const txId = args[0] as `tx${number}`;
const statusArg = args[1];
const reason = args[2];

if (statusArg.toLowerCase() === 'fail' && !reason) {
  console.error(
    'Error: Reason is required when marking a transaction as failed',
  );
  console.error('');
  console.error('Usage: ./tools/resolve-tx.ts <txId> fail <reason>');
  console.error('Example: ./tools/resolve-tx.ts tx400 fail "Transaction timeout"');
  process.exit(1);
}

resolveTx(txId, statusArg, reason, { env }).catch(err => {
  console.error(err);
  process.exit(1);
});
