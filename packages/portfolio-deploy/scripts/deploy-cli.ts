#!/usr/bin/env -S node --import ts-blank-space/register
import '@endo/init/debug.js';

import { execa } from 'execa';
import fse from 'fs-extra';
import childProcess from 'node:child_process';

import { makeAgdTools } from '../../../multichain-testing/tools/agd-tools.js';
import { makeDeployBuilder } from '../../../multichain-testing/tools/deploy.js';

/**
 * @param {string} net
 * @returns {Promise<{chainName: string, rpcAddrs: string[]}>}
 */
const getNetConfig = async (net) => {
  const response = await fetch(`https://${net}.agoric.net/network-config`);
  const text = await response.text();
  return JSON.parse(text);
};

async function main() {
  const [builder, ...rawArgs] = process.argv.slice(2);

  // Parse builder options from command line arguments
  const builderOpts: Record<string, string> = {};
  let net = null;
  
  for (const arg of rawArgs) {
    const [key, value] = arg.split('=');
    if (key && value) {
      builderOpts[key] = value;
      if (key === 'net') {
        net = value;
      }
    }
  }

  if (!builder) {
    console.error(
      'USAGE: deploy-cli.ts <builder script> [key1=value1] [key2=value2]',
    );
    process.exit(1);
  }

  try {
    let agdTools;
    
    if (net) {
      console.log(`Connecting to ${net} network...`);
      const { rpcAddrs } = await getNetConfig(net);
      console.log(`Using RPC addresses: ${rpcAddrs.join(', ')}`);
      agdTools = await makeAgdTools(console.log, childProcess, { rpcAddrs });
    } else {
      console.log('Using localhost network...');
      agdTools = await makeAgdTools(console.log, childProcess);
    }
    
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
