#!/usr/bin/env -S node --import ts-blank-space/register
import '@endo/init/debug.js';

import { cleanEnv, str } from 'envalid';
import { execa } from 'execa';
import fse from 'fs-extra';
import childProcess from 'node:child_process';
import { readFileSync } from 'node:fs';

import { makeAgdTools } from '../tools/agd-tools.js';
import { makeDeployBuilder } from '../tools/deploy.js';
import { extractNetworkConfig, readStarshipConfig } from '../tools/net.js';

const env = cleanEnv(process.env, {
  STARSHIP_CONFIG_FILE: str(),
});

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
    const networkConfig = extractNetworkConfig(
      'agoriclocal',
      readStarshipConfig(env.STARSHIP_CONFIG_FILE, { readFileSync }),
    );
    const agdTools = await makeAgdTools(
      networkConfig,
      console.log,
      childProcess,
    );
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
