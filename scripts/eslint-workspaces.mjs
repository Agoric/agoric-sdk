#!/usr/bin/env node
/**
 * Run ESLint across all workspaces in a single process for better performance.
 *
 * Each workspace that has a `lint:eslint` script calling `eslint-repo.mjs`
 * contributes its targets here. All targets are collected, deduplicated, and
 * passed to a single `eslint-repo.mjs` invocation — paying the ESLint startup
 * cost (config parsing, plugin loading) once instead of once per package.
 *
 * Workspaces whose `lint:eslint` script does not delegate to `eslint-repo.mjs`
 * are skipped; they manage their own ESLint config and are run separately by
 * the per-package `lint` script.
 *
 * Usage:
 *   node scripts/eslint-workspaces.mjs [eslint-flags] [package-filters...]
 *
 * Package filters are path prefixes (e.g. `packages/zoe`) that limit which
 * workspaces are included. Without filters, all workspaces are linted.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const workspacePackageJsons = [
  ...listPackageJsons('packages'),
  // packages/wallet/api is a nested workspace not found by one-level readdir
  'packages/wallet/api/package.json',
  ...listPackageJsons('services'),
];

const cliArgs = process.argv.slice(2);
const flags = cliArgs.filter(arg => arg.startsWith('-'));
const filters = cliArgs
  .filter(arg => !arg.startsWith('-'))
  .map(filter => filter.replaceAll('\\', '/').replace(/\/$/, ''));

// Deduplicated set of repo-root-relative targets to pass to eslint-repo.mjs.
// Deduplication is important when multiple packages resolve to the same path.
const targets = new Set();

for (const packageJsonPath of workspacePackageJsons) {
  const packageDir = path.dirname(packageJsonPath);
  const normalizedDir = packageDir.replaceAll(path.sep, '/');
  if (
    filters.length > 0 &&
    !filters.some(
      filter =>
        normalizedDir === filter || normalizedDir.startsWith(`${filter}/`),
    )
  ) {
    continue;
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(repoRoot, packageJsonPath), 'utf8'),
  );
  const command = pkg.scripts?.['lint:eslint'];
  if (!command) {
    continue;
  }

  // Only aggregate workspaces that delegate to eslint-repo.mjs. Others use
  // their own ESLint config and are excluded intentionally.
  const marker = 'scripts/eslint-repo.mjs';
  const markerIndex = command.indexOf(marker);
  if (markerIndex < 0) {
    continue;
  }

  const tail = command.slice(markerIndex + marker.length);
  const workspaceTargets = [...tail.matchAll(/'([^']+)'|(\S+)/g)]
    .map(([, quoted, bare]) => quoted ?? bare)
    .filter(Boolean);

  for (const target of workspaceTargets.length > 0 ? workspaceTargets : ['.']) {
    const relativeTarget = path.relative(
      repoRoot,
      path.resolve(repoRoot, packageDir, target),
    );
    targets.add(relativeTarget === '' ? '.' : relativeTarget);
  }
}

const eslintRepoScript = path.join(scriptDir, 'eslint-repo.mjs');
const { status, signal, error } = spawnSync(
  process.execPath,
  [eslintRepoScript, ...flags, ...targets],
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

function listPackageJsons(parentDir) {
  return fs
    .readdirSync(path.join(repoRoot, parentDir), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(parentDir, entry.name, 'package.json'))
    .filter(packageJsonPath =>
      fs.existsSync(path.join(repoRoot, packageJsonPath)),
    )
    .sort();
}
