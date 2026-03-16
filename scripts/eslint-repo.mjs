#!/usr/bin/env NODE_OPTIONS="--max-old-space-size=8192" node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const args = process.argv.slice(2);
const flags = [];
const targets = [];

for (const arg of args) {
  if (arg.startsWith('-')) {
    flags.push(arg);
  } else {
    targets.push(arg);
  }
}

const normalizedTargets = (targets.length ? targets : ['.']).map(target => {
  const resolved = path.resolve(process.cwd(), target);
  const relative = path.relative(repoRoot, resolved);
  return relative === '' ? '.' : relative;
});

const eslintBin = path.join(
  repoRoot,
  'node_modules',
  'eslint',
  'bin',
  'eslint.js',
);
const { status, error } = spawnSync(
  process.execPath,
  [eslintBin, ...flags, ...normalizedTargets],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  },
);

if (error) {
  throw error;
}

process.exit(status ?? 1);
