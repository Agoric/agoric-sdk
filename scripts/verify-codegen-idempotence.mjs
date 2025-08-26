#!/usr/bin/env node
/* eslint-disable @jessie.js/safe-await-separator */
// @ts-check

import { $ } from 'execa';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

// Ensure we run from the repository root if possible
try {
  const { stdout } = await $('git', ['rev-parse', '--show-toplevel']);
  process.chdir(stdout.trim());
} catch {
  // ignore; continue from current cwd
}

const root = process.cwd();
const pkgsDir = path.join(root, 'packages');

console.log('Discovering packages with a codegen script...');

// `yarn workspaces foreach` could do this more concisely but it would couple
// this implementation to a Yarn CLI which has caused migration work in the past
/** @type {string[]} */
const packages = [];
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
        packages.push(path.join('packages', ent.name));
      }
    } catch {
      // ignore parse errors
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
    await $('bash', [
      '.github/actions/restore-node/check-git-status.sh',
      '.',
      'false',
    ]);
    console.log(`No changes detected after ${pkg} codegen.`);
  } catch (err) {
    console.error(`Changes detected after ${pkg} codegen.`);
    console.error(
      `Please run 'yarn codegen' in ${pkg} and commit the results.`,
    );
    process.exitCode = 1;
    process.exit(1);
  }
}
