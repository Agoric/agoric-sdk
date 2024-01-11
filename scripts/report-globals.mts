#!/usr/bin/env tsx
/* eslint-env node */

/**
 * @file Report Globals
 *
 * Detect modules using globals and report them to stdout.
 *
 * Scripts are exempt because they are all entrypoints.
 */

// When this was run on 2023-12-30, the output was:
const lastRun = {
  big: 2,
  Buffer: 56,
  clearInterval: 4,
  clearTimeout: 6,
  document: 22,
  E: 41,
  fetch: 18,
  globalThis: 33,
  localStorage: 3,
  process: 119,
  setImmediate: 19,
  setInterval: 3,
  setTimeout: 19,
  startPSM: 2,
  VatData: 18,
  walletFrame: 2,
  window: 10,
};

import execa from 'execa';
import fs from 'node:fs';

// exempt files with shebangs bc they are entrypoints
const SHEBANG = '#!';

/**
 * Remove all eslint directives from all files
 */
const disableLintDirective = (str: 'global' | 'eslint-env') => {
  const cmd = `git grep --extended-regexp --files-with-matches  '\\/\\* ${str} ' packages | xargs grep -L '${SHEBANG}' |xargs sed -i '' "s/\\/\\* ${str} /\\/\\* ~${str} /"`;
  execa.sync(cmd, { shell: true });
};

const runEslint = () => {
  // XXX leaves these around. just git reset --hard to clean up.
  disableLintDirective('global');
  disableLintDirective('eslint-env');

  execa.sync(
    // true to succeed despite eslint failures
    'npm run --silent lint:eslint --if-present --workspaces > eslintOutput.txt || true',
    { shell: true },
  );
};

const report = () => {
  const eslintOutput = fs.readFileSync('eslintOutput.txt', 'utf8');

  const LINE_RE = /error  '(\w+)' is not defined/;
  const instances = eslintOutput
    .split('\n')
    .map(line => {
      let m;
      if ((m = line.match(LINE_RE))) {
        return m[1];
      }
    })
    .filter(Boolean);

  const counts = instances.reduce((acc, cur) => {
    acc[cur] = (acc[cur] || 0) + 1;
    return acc;
  }, {});

  console.log(counts);
};

// Feel free to disable this while debugging
runEslint();
report();
