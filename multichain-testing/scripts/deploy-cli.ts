#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file DEPRECATED: CoreEval-based deployment for local Starship testing
 *
 * ⚠️ WARNING: This script uses the CoreEval deployment method which
 * DESTROYS the existing contract instance. It should ONLY be used for:
 * - Fresh deployments to local Starship test environments
 * - Non-production testing
 *
 * DO NOT USE for production deployments (devnet/mainnet)!
 *
 * For portfolio-contract (ymax) upgrades, use the safe upgrade workflow:
 * - See multichain-testing/ymax-ops/Makefile
 * - Use ymax-tool.ts --upgrade for in-place upgrades
 * - Preserves existing contract state and instances
 */
import '@endo/init/debug.js';

import { execa } from 'execa';
import fse from 'fs-extra';
import childProcess from 'node:child_process';

import { makeAgdTools } from '../tools/agd-tools.js';
import { makeDeployBuilder } from '../tools/deploy.js';

async function main() {
  const [builder, ...rawArgs] = process.argv.slice(2);

  // Parse builder options from command line arguments
  const builderOpts: Record<string, string> = {};
  for (const arg of rawArgs) {
    const [key, value] = arg.split('=');
    if (key && value) {
      builderOpts[key] = value;
    }
  }

  if (!builder) {
    console.error(
      'USAGE: deploy-cli.ts <builder script> [key1=value1] [key2=value2]',
    );
    process.exit(1);
  }

  try {
    const agdTools = await makeAgdTools(console.log, childProcess);
    const deployBuilder = makeDeployBuilder(agdTools, fse.readJSON, execa);
    // XXX this has been flaky so try a second time
    // see https://github.com/Agoric/agoric-sdk/issues/9934
    await deployBuilder(builder, builderOpts).catch(err => {
      console.error('deploy failed, trying again', err);
      return deployBuilder(builder, builderOpts);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
