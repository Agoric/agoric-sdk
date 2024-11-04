#!/usr/bin/env tsx
import '@endo/init/debug.js';

import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import childProcess from 'node:child_process';
import fsp from 'node:fs/promises';
import { promisify } from 'node:util';
import { makeContainer } from '../../contract/tools/agd-lib.js';
import { makeDeployBuilder } from '../../contract/tools/deploy.js';
import { makeE2ETools } from '../../contract/tools/e2e-tools.js';

async function main() {
  const builder = process.argv[2];

  if (!builder) {
    console.error('USAGE: deploy-cli.ts <builder script>');
    process.exit(1);
  }

  const container = makeContainer({ execFileSync: childProcess.execFileSync });

  const bundleCache = await makeNodeBundleCache('bundles', {}, s => import(s));
  const tools = makeE2ETools(console.log, bundleCache, {
    execFileSync: container.execFileSync,
    copyFiles: container.copyFiles,
    fetch,
    setTimeout,
  });

  const readJSON = (path: string) =>
    fsp.readFile(path, 'utf-8').then(x => JSON.parse(x));
  const execFileP = promisify(childProcess.execFile);
  const npx = (file: string, args: string[]) =>
    execFileP('npx', ['--no-install', file, ...args]);
  const deployBuilder = makeDeployBuilder(tools, readJSON, npx);
  try {
    await deployBuilder(builder);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
