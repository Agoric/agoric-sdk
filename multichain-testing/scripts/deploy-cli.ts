#!/usr/bin/env tsx
import '@endo/init/debug.js';

import { execa } from 'execa';
import fse from 'fs-extra';
import childProcess from 'node:child_process';

import { makeAgdTools } from '../tools/agd-tools.js';
import { makeDeployBuilder } from '../tools/deploy.js';

async function main() {
  const builder = process.argv[2];

  if (!builder) {
    console.error('USAGE: deploy-cli.ts <builder script>');
    process.exit(1);
  }

  try {
    const agdTools = await makeAgdTools(console.log, childProcess);
    const deployBuilder = makeDeployBuilder(agdTools, fse.readJSON, execa);
    await deployBuilder(builder);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
