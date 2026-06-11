#!/usr/bin/env node
// @ts-check

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'execa';

// Ensure we run from the repository root if possible
try {
  const { stdout } = await $('git', ['rev-parse', '--show-toplevel']);
  process.chdir(stdout.trim());
} catch {
  // ignore; continue from current cwd
}

const root = process.cwd();

console.log('Discovering packages with a codegen script...');

// `yarn workspaces foreach` could do this more concisely but it would couple
// this implementation to a Yarn CLI which has caused migration work in the past
//
// NOTE: every `codegen` script MUST be deterministic, or this check breaks on
// unrelated PRs whenever its input changes. Codegen that pulls external data
// should pin that source (e.g. to a specific upstream commit) and adopt updates
// via a separate, deliberate refresh step — fetching is fine, drifting is not
// (see packages/orchestration/scripts/fetch-chain-info.ts).
/** @type {string[]} */
const packages = [];
for (const pkgsDir of [
  path.join(root, 'packages'),
  path.join(root, 'services'),
]) {
  if (fs.existsSync(pkgsDir)) {
    const entries = await fsp.readdir(pkgsDir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const pkgPath = path.join(pkgsDir, ent.name, 'package.json');
      try {
        if (!fs.existsSync(pkgPath)) continue;
        const raw = await fsp.readFile(pkgPath, 'utf8');
        const pkg = JSON.parse(raw);
        if (pkg.scripts && pkg.scripts.codegen) {
          // Push the relative path to the package, which is where we will run `yarn codegen`.
          packages.push(path.relative(root, path.join(pkgsDir, ent.name)));
        }
      } catch {
        // ignore parse errors
      }
    }
  }
}

if (packages.length === 0) {
  console.log('No packages with codegen script found.');
  process.exit(0);
}

console.log(`Found packages: ${packages.join(' ')}`);

// XXX assumes independence between packages, but they may become interdependent
// in https://github.com/Agoric/agoric-sdk/issues/11763
for (const pkg of packages) {
  console.log(`Running yarn codegen in ${pkg}`);
  await $('yarn', ['codegen'], { cwd: pkg });

  console.log(`Checking for unexpected changes after ${pkg} codegen...`);
  try {
    await $(
      '.github/actions/restore-node/check-git-status.sh',
      [pkg, 'false'],
      { stdio: 'inherit' },
    );
    console.log(`No changes detected after ${pkg} codegen.`);
  } catch (err) {
    console.error(`Changes detected after ${pkg} codegen.`);
    console.error(
      `The generated files committed in ${pkg} are out of date with its \`codegen\` script.`,
    );
    console.error(
      `To fix: run \`yarn codegen\` in ${pkg}, then commit the resulting changes.`,
    );
    console.error(
      `(\`codegen\` must be deterministic. If it pulls external data, it should pin`,
    );
    console.error(
      ` that source and adopt updates via a separate refresh step — see`,
    );
    console.error(` packages/orchestration/scripts/fetch-chain-info.ts.)`);
    process.exitCode = 1;
  }
}

try {
  await $(
    'bash',
    ['.github/actions/restore-node/check-git-status.sh', '.', 'false'],
    { stdio: 'inherit' },
  );
} catch (err) {
  console.error(`Unexpected changes detected after all codegen runs.`);
  process.exitCode = 1;
}
