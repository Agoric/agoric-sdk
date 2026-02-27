#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  legacyPublishedToolsPackages,
  publicToolsPackages,
} from './tools-scope-policy.mjs';

const repoRoot = process.cwd();
const packagesDir = path.join(repoRoot, 'packages');

const PUBLIC = new Set(publicToolsPackages);
const LEGACY_PUBLISHED = new Set(legacyPublishedToolsPackages);

const packageDirs = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => path.join('packages', entry.name));

packageDirs.push(path.join('packages', 'wallet', 'api'));

const getExportsKeys = exportsField => {
  if (!exportsField || Array.isArray(exportsField)) {
    return [];
  }
  if (typeof exportsField === 'string') {
    return [];
  }
  return Object.keys(exportsField);
};

const failures = [];
const warnings = [];

for (const pkgDir of packageDirs) {
  const pkgJsonPath = path.join(repoRoot, pkgDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const files = Array.isArray(pkg.files) ? pkg.files : [];
  const exportKeys = getExportsKeys(pkg.exports);
  const hasToolsDir = fs.existsSync(path.join(repoRoot, pkgDir, 'tools'));
  const publishesTools = files.some(file => String(file).startsWith('tools/'));
  const exportsTools = exportKeys.some(key => key.startsWith('./tools'));

  const isPublicToolsPackage = PUBLIC.has(pkgDir);
  const isLegacyPublished = LEGACY_PUBLISHED.has(pkgDir);

  if (isPublicToolsPackage && hasToolsDir && !exportsTools) {
    failures.push(
      `${pkgDir}: marked public tools package but missing explicit tools export`,
    );
  }

  if (exportsTools && !isPublicToolsPackage) {
    failures.push(
      `${pkgDir}: has tools export but is not declared in publicToolsPackages`,
    );
  }

  if (publishesTools && !isPublicToolsPackage && !isLegacyPublished) {
    failures.push(
      `${pkgDir}: publishes tools/ in files without public policy or legacy allowlist`,
    );
  }

  if (isLegacyPublished && !publishesTools) {
    warnings.push(
      `${pkgDir}: no longer publishes tools/; remove from legacyPublishedToolsPackages`,
    );
  }

  if (isPublicToolsPackage && !hasToolsDir) {
    warnings.push(`${pkgDir}: listed as public tools package but has no tools/ dir`);
  }
}

if (failures.length) {
  console.error('tools-scope manifest policy violations:');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
}

if (warnings.length) {
  console.warn('tools-scope manifest allowlist cleanup suggestions:');
  for (const warning of warnings) {
    console.warn(`  - ${warning}`);
  }
}

if (failures.length) {
  process.exit(1);
}

console.log('tools-scope manifest checks passed.');
