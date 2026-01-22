#!/usr/bin/env node
/* eslint-disable no-plusplus */
/* eslint-disable @jessie.js/safe-await-separator */
/**
 * @file Verify package export specifiers resolve for consumers.
 *
 * This script checks that each package's export specifiers can be imported
 * by Node (module code executes, so side effects may occur).
 *
 * Usage:
 *   node scripts/packing/verify-package-exports.mjs --mode=packed
 *   node scripts/packing/verify-package-exports.mjs --mode=scm
 *   node scripts/packing/verify-package-exports.mjs --mode=packed --quiet
 *   (or run via `yarn lerna run` with INIT_CWD set per package)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// Set of package names to skip verification.
// Private packages are skipped automatically.
const unsupportedPackages = new Set([
  '@agoric/solo', // its main.js fails on some Endo issue
]);

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptsDir, '..', '..');
const packagesRoot = path.join(repoRoot, 'packages');

const initCwd = process.env.INIT_CWD
  ? path.resolve(process.env.INIT_CWD)
  : null;
const currentCwd = path.resolve(process.cwd());
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    quiet: { type: 'boolean' },
    mode: { type: 'string', required: true },
  },
  strict: true,
  allowPositionals: false,
});
const quiet = values.quiet ?? false;
const mode = values.mode;
if (mode !== 'packed' && mode !== 'scm') {
  throw new Error(
    'verify-package-exports: --mode is required and must be "packed" or "scm"',
  );
}
const packed = mode === 'packed';

const parseNodeVersion = version => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
};

const pickStripTypesFlag = () => {
  const parsed = parseNodeVersion(process.version);
  if (!parsed) return null;
  if (parsed.major >= 24) return '--no-strip-types';
  if (parsed.major >= 22) return '--no-experimental-strip-types';
  return null;
};

const stripTypesFlag = packed ? pickStripTypesFlag() : null;
if (packed && !stripTypesFlag) {
  throw new Error(
    `verify-package-exports: Node ${process.version} does not support type stripping`,
  );
}

const nodePackedArgs = stripTypesFlag ? [stripTypesFlag] : [];

const posixPath = path.posix;

const fileListCache = new Map();

const countStars = str => (str.match(/\*/g) || []).length;

const normalizeExportPath = exportPath => {
  if (typeof exportPath !== 'string') return null;
  if (exportPath.startsWith('./')) return exportPath.slice(2);
  if (exportPath.startsWith('/')) return exportPath.slice(1);
  return exportPath;
};

const toPosixPath = p => p.split(path.sep).join('/');

const isObject = value =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isConditionalExports = exportsField =>
  isObject(exportsField) &&
  Object.keys(exportsField).length > 0 &&
  !Object.keys(exportsField).some(key => key.startsWith('.'));

const applyStars = (pattern, parts) => {
  let index = 0;
  return pattern.replace(/\*/g, () => parts[index++] ?? '');
};

const exportTargetPatterns = exportValue => {
  /** @type {string[]} */
  const patterns = [];

  const addValue = value => {
    if (typeof value === 'string') {
      patterns.push(value);
      return;
    }
    if (Array.isArray(value)) {
      // eslint-disable-next-line github/array-foreach
      value.forEach(addValue);
      return;
    }
    if (isObject(value)) {
      const { import: importValue, default: defaultValue } = value;
      if (importValue) addValue(importValue);
      if (defaultValue) addValue(defaultValue);
      for (const [key, nested] of Object.entries(value)) {
        if (key === 'types' || key.startsWith('types')) continue;
        if (key === 'import' || key === 'default') continue;
        addValue(nested);
      }
    }
  };

  addValue(exportValue);
  return patterns;
};

const listFiles = async rootDir => {
  if (fileListCache.has(rootDir)) return fileListCache.get(rootDir);
  if (!existsSync(rootDir)) {
    fileListCache.set(rootDir, []);
    return [];
  }

  /** @type {string[]} */
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name === 'node_modules') {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  fileListCache.set(rootDir, files);
  return files;
};

const patternToRegex = pattern => {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '(.+)');
  return new RegExp(`^${escaped}$`);
};

const expandPatternSpecifiers = async ({
  pkgName,
  pkgDir,
  exportKey,
  exportValue,
}) => {
  /** @type {Set<string>} */
  const specifiers = new Set();
  /** @type {string[]} */
  const errors = [];
  const keyPattern = normalizeExportPath(exportKey);
  if (!keyPattern) return { specifiers, errors };

  const keyStarCount = countStars(keyPattern);
  const targets = exportTargetPatterns(exportValue);

  if (targets.length === 0) {
    errors.push(
      `${pkgName}: export pattern "${exportKey}" has no runtime target`,
    );
    return { specifiers, errors };
  }

  for (const target of targets) {
    const targetPattern = normalizeExportPath(target);
    if (!targetPattern || !targetPattern.includes('*')) {
      errors.push(
        `${pkgName}: export pattern "${exportKey}" targets "${target}" which is not a pattern`,
      );
      continue;
    }

    const targetStarCount = countStars(targetPattern);
    if (targetStarCount !== keyStarCount) {
      errors.push(
        `${pkgName}: export pattern "${exportKey}" has ${keyStarCount} "*" but target "${target}" has ${targetStarCount}`,
      );
      continue;
    }

    const starIndex = targetPattern.indexOf('*');
    const prefix =
      starIndex === -1 ? targetPattern : targetPattern.slice(0, starIndex);
    const baseDir = posixPath.dirname(prefix);
    const searchDir = baseDir === '.' ? pkgDir : path.join(pkgDir, baseDir);

    const regex = patternToRegex(targetPattern);
    const files = await listFiles(searchDir);

    for (const filePath of files) {
      const relPath = toPosixPath(path.relative(pkgDir, filePath));
      const match = regex.exec(relPath);
      if (!match) continue;
      const parts = match.slice(1);
      const subpath = applyStars(keyPattern, parts);
      const specifier = subpath === '' ? pkgName : `${pkgName}/${subpath}`;
      specifiers.add(specifier);
    }
  }

  if (specifiers.size === 0) {
    errors.push(
      `${pkgName}: export pattern "${exportKey}" did not match any files`,
    );
  }

  return { specifiers, errors };
};

const collectExportSpecifiers = async (pkgDir, pkgJson) => {
  const pkgName = pkgJson.name;
  const exportsField = pkgJson.exports;
  const mainField = pkgJson.main;

  /** @type {Set<string>} */
  const specifiers = new Set();
  /** @type {string[]} */
  const errors = [];

  if (!exportsField) {
    if (pkgName && mainField) {
      specifiers.add(pkgName);
    }
    return { specifiers, errors };
  }

  if (
    typeof exportsField === 'string' ||
    Array.isArray(exportsField) ||
    isConditionalExports(exportsField)
  ) {
    specifiers.add(pkgName);
    return { specifiers, errors };
  }

  for (const [exportKey, exportValue] of Object.entries(exportsField)) {
    if (!exportKey.startsWith('.')) {
      specifiers.add(pkgName);
      continue;
    }

    if (exportKey.includes('*')) {
      const expanded = await expandPatternSpecifiers({
        pkgName,
        pkgDir,
        exportKey,
        exportValue,
      });
      for (const specifier of expanded.specifiers) {
        specifiers.add(specifier);
      }
      errors.push(...expanded.errors);
      continue;
    }

    if (exportKey === '.') {
      specifiers.add(pkgName);
    } else {
      const subpath = normalizeExportPath(exportKey);
      if (subpath) {
        specifiers.add(`${pkgName}/${subpath}`);
      }
    }
  }

  return { specifiers, errors };
};

const needsJsonImport = specifier =>
  specifier.endsWith('.json') || specifier.endsWith('/package.json');

const runImportAttempt = (specifier, cwd, preload, packedArgs) => {
  const importOptions = needsJsonImport(specifier)
    ? ', { with: { type: "json" } }'
    : '';
  const code = [
    `import(${JSON.stringify(specifier)}${importOptions})`,
    '.catch(err => {',
    '  console.error(err && err.stack ? err.stack : String(err));',
    '  process.exit(1);',
    '});',
  ].join('\n');
  const args = [...packedArgs];
  if (preload) {
    args.push('--import', preload);
  }
  args.push('--input-type=module', '-e', code);

  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf-8',
  });

  if (result.error) {
    return { ok: false, error: result.error.message };
  }
  if (result.status !== 0) {
    const output = `${result.stderr || ''}${result.stdout || ''}`.trim();
    const lines = output
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .slice(0, 3);
    const firstLines = lines.join('\n');
    return {
      ok: false,
      error: firstLines || `import failed with exit code ${result.status}`,
    };
  }
  return { ok: true, error: '' };
};

const importSpecifier = (specifier, cwd, packedArgs) => {
  const attempts = [
    { label: 'plain', preload: null },
    { label: 'with-endo', preload: '@endo/init/debug.js' },
  ];
  const errors = [];

  for (const attempt of attempts) {
    const result = runImportAttempt(
      specifier,
      cwd,
      attempt.preload,
      packedArgs,
    );
    if (result.ok) return;
    errors.push(`${attempt.label}: ${result.error}`);
  }

  throw new Error(errors.join('\n'));
};

const isPackageDir = candidateDir => {
  if (!candidateDir) return false;
  const rel = path.relative(packagesRoot, candidateDir);
  if (rel.startsWith('..') || rel.startsWith(path.sep)) return false;
  if (rel.split(path.sep).length !== 1) return false;
  return existsSync(path.join(candidateDir, 'package.json'));
};

const listPackages = async () => {
  const entries = await fs.readdir(packagesRoot, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(packagesRoot, entry.name))
    .filter(dir => existsSync(path.join(dir, 'package.json')));
};

const readPackageJson = async pkgDir => {
  const pkgPath = path.join(pkgDir, 'package.json');
  const content = await fs.readFile(pkgPath, 'utf-8');
  return JSON.parse(content);
};

const main = async () => {
  let packageDirs;
  if (isPackageDir(initCwd)) {
    packageDirs = [initCwd];
  } else if (isPackageDir(currentCwd)) {
    packageDirs = [currentCwd];
  } else {
    packageDirs = await listPackages();
  }

  const errors = [];
  /** @type {Map<string, string[]>} */
  const successesByPackage = new Map();
  /** @type {Map<string, string[]>} */
  const failuresByPackage = new Map();
  /** @type {Map<string, string[]>} */
  const skippedByPackage = new Map();
  let packageCount = 0;
  let specifierCount = 0;

  for (const pkgDir of packageDirs) {
    const pkgJson = await readPackageJson(pkgDir);
    if (!pkgJson.name) continue;
    if (unsupportedPackages.has(pkgJson.name)) {
      if (!quiet) {
        console.log(
          `verify-package-exports: skipped ${pkgJson.name} (unsupported)`,
        );
      }
      continue;
    }
    if (pkgJson.private) {
      if (!quiet) {
        console.log(
          `verify-package-exports: skipped ${pkgJson.name} (private)`,
        );
      }
      continue;
    }

    packageCount += 1;
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    const { specifiers, errors: exportErrors } = await collectExportSpecifiers(
      pkgDir,
      pkgJson,
    );
    errors.push(...exportErrors);
    if (exportErrors.length > 0) {
      failureCount += exportErrors.length;
      const existing = failuresByPackage.get(pkgJson.name) || [];
      failuresByPackage.set(pkgJson.name, existing.concat(exportErrors));
    }

    if (specifiers.size === 0) {
      continue;
    }

    for (const specifier of specifiers) {
      if (specifier.endsWith('/entrypoint.js')) {
        const existing = skippedByPackage.get(pkgJson.name) || [];
        existing.push(specifier);
        skippedByPackage.set(pkgJson.name, existing);
        skippedCount += 1;
        continue;
      }
      specifierCount += 1;
      try {
        importSpecifier(specifier, repoRoot, nodePackedArgs);
        const existing = successesByPackage.get(pkgJson.name) || [];
        existing.push(specifier);
        successesByPackage.set(pkgJson.name, existing);
        successCount += 1;
      } catch (err) {
        const failure = `${specifier} -> ${err.message}`;
        errors.push(`${pkgJson.name}: ${failure}`);
        const existing = failuresByPackage.get(pkgJson.name) || [];
        existing.push(failure);
        failuresByPackage.set(pkgJson.name, existing);
        failureCount += 1;
      }
    }

    if (!quiet) {
      const status = failureCount > 0 ? 'failed' : 'ok';
      console.log(
        `verify-package-exports: finished ${pkgJson.name} (${status}, ${successCount} ok, ${failureCount} failed, ${skippedCount} skipped)`,
      );
    }
  }

  if (!quiet && successesByPackage.size > 0) {
    console.log('verify-package-exports: resolved exports');
    for (const [pkgName, entries] of successesByPackage) {
      console.log(`  ${pkgName}`);
      for (const entry of entries) {
        console.log(`    + ${entry}`);
      }
    }
  }

  if (!quiet && skippedByPackage.size > 0) {
    console.log('verify-package-exports: skipped exports');
    for (const [pkgName, entries] of skippedByPackage) {
      console.log(`  ${pkgName}`);
      for (const entry of entries) {
        console.log(`    ~ ${entry} (entrypoint.js)`);
      }
    }
  }

  if (failuresByPackage.size > 0) {
    console.error('verify-package-exports: failed exports');
    for (const [pkgName, entries] of failuresByPackage) {
      console.error(`  ${pkgName}`);
      for (const entry of entries) {
        console.error(`    - ${entry}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('verify-package-exports: failures detected');
    console.error(
      `verify-package-exports: ${errors.length} error(s) across ${packageCount} package(s)`,
    );
    process.exit(1);
  }

  console.log(
    `verify-package-exports: checked ${specifierCount} export specifier(s) across ${packageCount} package(s)`,
  );
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
