#!/usr/bin/env node
/**
 * Run ESLint from the repo root so that `eslint.config.mjs` is always used,
 * regardless of the caller's working directory.
 *
 * Usage (from any package):
 *   node ../../scripts/eslint-repo.mjs [eslint-flags] [targets...]
 *
 * Targets are resolved relative to the caller's CWD and then converted to
 * repo-root-relative paths before being passed to ESLint. If no targets are
 * given, `.` (the caller's CWD) is used.
 *
 * This script is also invoked by eslint-workspaces.mjs, which aggregates all
 * workspace targets into a single ESLint run for better performance.
 */
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
// Raise the heap limit for the ESLint child process; without this flag ESLint
// OOMs when linting the full repo due to the large number of files and ASTs
// held in memory simultaneously.
const { status, signal, error } = spawnSync(
  process.execPath,
  ['--max-old-space-size=8192', eslintBin, ...flags, ...normalizedTargets],
  {
    cwd: repoRoot,
    stdio: 'inherit',
  },
);

if (error) {
  throw error;
}

if (signal) {
  console.error(`ESLint killed by signal: ${signal}`);
}

process.exit(status ?? 1);
