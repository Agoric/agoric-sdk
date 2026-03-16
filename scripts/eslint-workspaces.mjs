#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const workspacePackageJsons = [
  ...listPackageJsons('packages'),
  'packages/wallet/api/package.json',
];

const cliArgs = process.argv.slice(2);
const flags = cliArgs.filter(arg => arg.startsWith('-'));
const filters = cliArgs
  .filter(arg => !arg.startsWith('-'))
  .map(filter => filter.replaceAll('\\', '/').replace(/\/$/, ''));

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
const { status, error } = spawnSync(
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
