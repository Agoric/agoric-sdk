#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  legacyNonTestToTestImports,
  legacySrcToToolsImports,
} from './tools-scope-policy.mjs';

const IMPORT_SPECIFIER_RE =
  /^\s*(?:import\s+[^'\"]*from\s+|export\s+[^'\"]*from\s+|import\s*\()\s*['\"]([^'\"]+)['\"]/;

const ALLOWLIST_SRC_TOOLS = new Set(
  legacySrcToToolsImports.map(({ file, specifier }) => `${file}|${specifier}`),
);
const ALLOWLIST_NONTEST_TEST = new Set(
  legacyNonTestToTestImports.map(
    ({ file, specifier }) => `${file}|${specifier}`,
  ),
);

const repoRoot = process.cwd();
const packagesRoot = path.join(repoRoot, 'packages');
const CODE_EXT_RE = /\.(?:js|ts|mjs|cjs)$/;

const walkFiles = rootDir => {
  const results = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name === 'coverage'
        ) {
          continue;
        }
        stack.push(full);
        continue;
      }
      if (CODE_EXT_RE.test(entry.name)) {
        results.push(full);
      }
    }
  }
  return results;
};

const toRepoPath = fullPath =>
  path.relative(repoRoot, fullPath).replaceAll('\\', '/');

const isSrcFile = repoPath =>
  /^packages\/[^/]+\/src\/.+\.(?:js|ts|mjs|cjs)$/.test(repoPath) ||
  /^packages\/wallet\/api\/src\/.+\.(?:js|ts|mjs|cjs)$/.test(repoPath);

const isNonTestFile = repoPath => {
  if (!repoPath.startsWith('packages/')) return false;
  if (/^packages\/[^/]+\/test\//.test(repoPath)) return false;
  if (/^packages\/wallet\/api\/test\//.test(repoPath)) return false;
  return true;
};

const findImports = (files, predicate) => {
  const matches = [];
  for (const fullPath of files) {
    const file = toRepoPath(fullPath);
    const source = fs.readFileSync(fullPath, 'utf8');
    for (const line of source.split('\n')) {
      const specifier = IMPORT_SPECIFIER_RE.exec(line)?.[1];
      if (!specifier) continue;
      if (!predicate(specifier)) continue;
      matches.push({ file, specifier });
    }
  }
  return matches;
};

const allPackageFiles = walkFiles(packagesRoot);
const srcFiles = allPackageFiles.filter(fullPath =>
  isSrcFile(toRepoPath(fullPath)),
);
const nonTestFiles = allPackageFiles.filter(fullPath =>
  isNonTestFile(toRepoPath(fullPath)),
);

const srcToTools = findImports(srcFiles, specifier =>
  specifier.includes('tools/'),
);
const nonTestToTest = findImports(
  nonTestFiles,
  specifier => specifier.includes('/test/') || specifier.includes('.test.'),
);

const disallowedSrcToTools = srcToTools.filter(
  ({ file, specifier }) => !ALLOWLIST_SRC_TOOLS.has(`${file}|${specifier}`),
);
const disallowedNonTestToTest = nonTestToTest.filter(
  ({ file, specifier }) => !ALLOWLIST_NONTEST_TEST.has(`${file}|${specifier}`),
);

for (const { file, specifier } of srcToTools) {
  if (!ALLOWLIST_SRC_TOOLS.has(`${file}|${specifier}`)) continue;
  ALLOWLIST_SRC_TOOLS.delete(`${file}|${specifier}`);
}
for (const { file, specifier } of nonTestToTest) {
  if (!ALLOWLIST_NONTEST_TEST.has(`${file}|${specifier}`)) continue;
  ALLOWLIST_NONTEST_TEST.delete(`${file}|${specifier}`);
}

let ok = true;
if (disallowedSrcToTools.length) {
  ok = false;
  console.error('Found non-allowlisted src -> tools imports:');
  for (const { file, specifier } of disallowedSrcToTools) {
    console.error(`  - ${file} imports ${specifier}`);
  }
}

if (disallowedNonTestToTest.length) {
  ok = false;
  console.error('Found non-allowlisted non-test -> test imports:');
  for (const { file, specifier } of disallowedNonTestToTest) {
    console.error(`  - ${file} imports ${specifier}`);
  }
}

if (ALLOWLIST_SRC_TOOLS.size || ALLOWLIST_NONTEST_TEST.size) {
  console.warn('Allowlist entries no longer matched (consider removing):');
  for (const entry of [...ALLOWLIST_SRC_TOOLS, ...ALLOWLIST_NONTEST_TEST]) {
    const [file, specifier] = entry.split('|');
    console.warn(`  - ${file} imports ${specifier}`);
  }
}

if (!ok) {
  process.exit(1);
}

console.log('tools-scope import checks passed.');
