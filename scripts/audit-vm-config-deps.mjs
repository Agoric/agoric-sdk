#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const packagesDir = path.join(root, 'packages');

const sections = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

const packageDirs = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => path.join('packages', d.name));

const direct = [];
for (const pkgDir of packageDirs) {
  const packageJsonPath = path.join(root, pkgDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) continue;
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  for (const section of sections) {
    const deps = pkg[section] || {};
    if (Object.hasOwn(deps, '@agoric/vm-config')) {
      direct.push({
        workspace: pkg.name || pkgDir,
        section,
        range: deps['@agoric/vm-config'],
        file: `${pkgDir}/package.json`,
      });
    }
  }
}

const rgCmd = `rg -n "@agoric/vm-config/" packages scripts --glob '!packages/vm-config/**' --glob '!**/*.md' --glob '!scripts/audit-vm-config-deps.mjs'`;
let references = '';
try {
  references = execSync(rgCmd, { cwd: root, encoding: 'utf8' }).trim();
} catch (e) {
  references = e.stdout?.trim() || '';
}

console.log('# vm-config dependency audit');
console.log('');
if (direct.length === 0) {
  console.log('Direct package.json deps on @agoric/vm-config: none');
} else {
  console.log('Direct package.json deps on @agoric/vm-config:');
  for (const item of direct) {
    console.log(
      `- ${item.workspace} (${item.section}: ${item.range}) in ${item.file}`,
    );
  }
}

console.log('');
console.log('Textual @agoric/vm-config/<file> references outside packages/vm-config:');
if (!references) {
  console.log('- none');
} else {
  for (const line of references.split('\n')) {
    console.log(`- ${line}`);
  }
}
