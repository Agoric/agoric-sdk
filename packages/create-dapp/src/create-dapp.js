#! /usr/bin/env node
/* global process */
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const agoricCli = require.resolve('.bin/agoric');

const proc = spawnSync(agoricCli, ['init', ...process.argv.slice(2)], {
  stdio: 'inherit',
});

if (proc.status === null) {
  throw proc.error;
}
process.exit(proc.status);
