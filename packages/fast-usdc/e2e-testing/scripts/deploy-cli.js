#!/usr/bin/env node
/* global globalThis, process */
import '@endo/init/debug.js';

import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import childProcess from 'node:child_process';
import fsp from 'node:fs/promises';
import { promisify } from 'node:util';
import { makeContainer } from '../../contract/tools/agd-lib.js';
import { makeDeployBuilder } from '../../contract/tools/deploy.js';
import { makeE2ETools } from '../../contract/tools/e2e-tools.js';

async function main() {
  const [builder, ...scriptArgs] = process.argv.slice(2);

  if (!builder) {
    console.error('USAGE: deploy-cli.ts <builder script> <script-arg>...');
    process.exit(1);
  }

  const container = makeContainer({
    execFileSync: childProcess.execFileSync,
    cmd: ['docker', 'compose', 'exec'],
    pod: 'agd',
  });

  const bundleCache = await makeNodeBundleCache('bundles', {}, s => import(s));
  const tools = makeE2ETools(console.log, bundleCache, {
    execFileSync: container.execFileSync,
    copyFiles: container.copyFiles,
    fetch: globalThis.fetch,
    setTimeout: globalThis.setTimeout,
  });

  const readJSON = path => fsp.readFile(path, 'utf-8').then(x => JSON.parse(x));
  const execFileP = promisify(childProcess.execFile);
  const npx = (file, args) => execFileP('npx', ['--no-install', file, ...args]);
  const deployBuilder = makeDeployBuilder(tools, readJSON, npx);

  await deployBuilder(builder, scriptArgs);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
