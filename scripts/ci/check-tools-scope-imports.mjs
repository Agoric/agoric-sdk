#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  legacyNonTestToTestImports,
  legacySrcToToolsImports,
} from './tools-scope-policy.mjs';

const SPECIFIER_RE = /['\"]([^'\"]+)['\"]/;

const ALLOWLIST_SRC_TOOLS = new Set(
  legacySrcToToolsImports.map(({ file, specifier }) => `${file}|${specifier}`),
);
const ALLOWLIST_NONTEST_TEST = new Set(
  legacyNonTestToTestImports.map(({ file, specifier }) => `${file}|${specifier}`),
);

const toLines = cmdOutput => cmdOutput.split('\n').filter(Boolean);

const runRg = args => {
  try {
    return execFileSync('rg', args, { encoding: 'utf8' });
  } catch (err) {
    if (err.status === 1) {
      return '';
    }
    throw err;
  }
};

const listFiles = args => toLines(runRg(['--files', ...args]));

const matchInFiles = (pattern, files) => {
  if (!files.length) {
    return [];
  }
  const lines = [];
  const chunkSize = 200;
  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    lines.push(...toLines(runRg(['-n', pattern, ...chunk])));
  }
  return lines;
};

const parseMatches = lines => {
  const matches = [];
  for (const line of lines) {
    const first = line.indexOf(':');
    const second = line.indexOf(':', first + 1);
    if (first < 0 || second < 0) continue;
    const file = line.slice(0, first).replace(/^\.\//, '');
    const text = line.slice(second + 1);
    const specifier = SPECIFIER_RE.exec(text)?.[1];
    if (!specifier) continue;
    matches.push({ file, specifier });
  }
  return matches;
};

const srcFiles = listFiles([
  'packages',
  '-g',
  'packages/*/src/**/*.{js,ts,mjs,cjs}',
  '-g',
  'packages/wallet/api/src/**/*.{js,ts,mjs,cjs}',
]);
const nonTestFiles = listFiles([
  'packages',
  '-g',
  'packages/**/*.{js,ts,mjs,cjs}',
  '-g',
  '!packages/*/test/**',
  '-g',
  '!packages/wallet/api/test/**',
]);

const srcToToolsLines = matchInFiles(
  "^\\s*(import\\s+[^'\\\"]*from\\s+|export\\s+[^'\\\"]*from\\s+|import\\s*\\()['\\\"][^'\\\"]*tools/",
  srcFiles,
);
const nonTestToTestLines = matchInFiles(
  "^\\s*(import\\s+[^'\\\"]*from\\s+|export\\s+[^'\\\"]*from\\s+|import\\s*\\()['\\\"][^'\\\"]*(/test/|\\\\.test\\\\.)",
  nonTestFiles,
);

const srcToTools = parseMatches(srcToToolsLines);
const nonTestToTest = parseMatches(nonTestToTestLines);

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
