#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-env node */

import '@endo/init/pre-remoting.js';
import '../src/shims.cjs';
import '../src/lockdown.js';

import { processTx } from './process-tx-lib.ts';

const dotEnvFile = process.env.DOTENV || '.env';
const processEnv = { ...process.env };
const dotenv = await import('dotenv');
const dotEnvAdditions = {} as { [key: string]: string };
dotenv.config({ path: dotEnvFile, processEnv: dotEnvAdditions });
const env = harden({ ...dotEnvAdditions, ...processEnv });

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: ./tools/process-tx.ts <txId> [--verbose]');
  console.error('Example: ./tools/process-tx.ts tx233');
  process.exit(1);
}

const txId = args[0];
const options = args.slice(1);

processTx(txId, options, { env }).catch(err => {
  console.error(err);
  process.exit(1);
});
