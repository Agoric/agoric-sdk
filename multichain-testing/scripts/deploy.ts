#!/usr/bin/env tsx
/** @file run a builder and deploy it onto the Agoric chain in local Starship cluster */
import '@endo/init/debug.js';

import { execa } from 'execa';
import fse from 'fs-extra';
import fsp from 'node:fs/promises';
import { makeE2ETools } from '../tools/e2e-tools.js';
import { makeNodeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import childProcess from 'child_process';

const builder = process.argv[2];

if (!builder) {
  console.error('USAGE: deploy.ts <builder script>');
  process.exit(1);
}

const tools = await (async () => {
  const bundleCache = await makeNodeBundleCache('bundles', {}, s => import(s));
  const { writeFile } = fsp;
  const { execFileSync, execFile } = childProcess;
  const tools = await makeE2ETools(console, bundleCache, {
    execFileSync,
    execFile,
    fetch,
    setTimeout,
    writeFile,
  });
  return tools;
})();

// console.log('refreshing starship chain info');
// await import('./fetch-starship-chain-info.ts');

// build the plan
const { stdout } = await execa`agoric run ${builder}`;
const match = stdout.match(/ (?<name>[-\w]+)-permit.json/);
if (!(match && match.groups)) {
  throw new Error('no permit found');
}
const plan = await fse.readJSON(`./${match.groups.name}-plan.json`);

console.log(plan);

console.log('installing bundles');
tools.installBundles(
  plan.bundles.map(b => b.bundleID),
  console.log,
);
