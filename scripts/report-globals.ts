#!/usr/bin/env -S node --import ts-blank-space/register
/* eslint-disable -- hacky script for irregular reports */

/**
 * @file Report Globals
 *
 * Detect modules using globals and report them to stdout.
 *
 * Scripts are exempt because they are all entrypoints.
 */

import { execaSync } from 'execa';
import fs from 'node:fs';

// When this was run on 2025-04-03, the output was:
const lastRun = {
  globalThis: 58,
  E: 16,
  startPSM: 2,
  window: 10,
  localStorage: 3,
  document: 22,
  walletFrame: 2,
  VatData: 18,
  big: 2,
};

// exempt files with shebangs bc they are entrypoints
const SHEBANG = '#!';

/**
 * Remove all eslint directives from all files
 * @param str
 */
const disableLintDirective = (str: 'global' | 'eslint-env') => {
  const cmd = `git grep --extended-regexp --files-with-matches  '\\/\\* ${str} ' packages | xargs grep -L '${SHEBANG}' |xargs sed -i '' "s/\\/\\* ${str} /\\/\\* ~${str} /"`;
  execaSync(cmd, { shell: true });
};

const runEslint = () => {
  // XXX leaves these around. just git reset --hard to clean up.
  disableLintDirective('global');
  disableLintDirective('eslint-env');

  execaSync(
    // true to succeed despite eslint failures
    'npm run --silent lint:eslint --if-present --workspaces > eslintOutput.txt || true',
    { shell: true },
  );
};

const report = () => {
  const eslintOutput = fs.readFileSync('eslintOutput.txt', 'utf8');

  const LINE_RE = /error {2}'(\w+)' is not defined/;
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

console.log('Gathering globals...');
// Feel free to disable this while debugging
runEslint();
report();
console.log(
  'Done. Copy and commit the output into this file. Then git reset hard the rest of the repo.',
);
