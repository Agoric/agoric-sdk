#!/bin/env node
// @ts-check
// @jessie-check
/* global globalThis */

import '@endo/init';
import process from 'process';
import { execFileSync } from 'child_process';

import anylogger from 'anylogger';
import { createCommand, CommanderError } from 'commander';

import { makeHttpClient } from '@agoric/casting/src/makeHttpClient.js';

import { makeTUI } from './lib/tui.js';
import { makeAgd } from './lib/agd-lib.js';
import { addBidCommand0 } from './commands/bid.js';
import { addBidCommand } from './commands/auction.js';
import { getNetworkConfig } from './lib/networkConfig.js';
import { makeBatchQuery } from './lib/vstorage.js';

const { Fail } = assert;

// const assertUint32 = x =>
//   (Number.isSafeInteger(x) && x >= 0 && x < 2 ** 32) ||
//   Fail`${x} is not a valid uint32`;

/**
 * Create and run the inter command,
 * portioning out authority as needed.
 */
const main = () => {
  const logger = anylogger('inter');
  const tui = makeTUI({ stdout: process.stdout, logger });

  const { env } = process;
  let config;
  // NOTE: delay getNetworkConfig() and all other I/O
  // until a command .action() is run
  const provideConfig = async () => {
    await null;
    if (config) return config;
    config = await getNetworkConfig(env, { fetch: globalThis.fetch });
    return config;
  };
  const getBatchQuery = () =>
    provideConfig().then(({ rpcAddrs }) =>
      makeBatchQuery(globalThis.fetch, rpcAddrs),
    );
  const makeRpcClient = () =>
    provideConfig().then(c => {
      const [rpcAddr] = c.rpcAddrs;
      tui.warn('TODO: pick among >1 rpcAddrs', { rpcAddr });
      return makeHttpClient(rpcAddr, globalThis.fetch);
    });

  const interCmd = createCommand('inter-tool').description(
    'Inter Protocol auction bid query',
  );
  // TODO: commands involving signing
  // .option('--home <dir>', 'agd CosmosSDK application home directory')
  // .option(
  //   '--keyring-backend <os|file|test>',
  //   `keyring's backend (os|file|test) (default "${
  //     env.AGORIC_KEYRING_BACKEND || 'os'
  //   }")`,
  //   env.AGORIC_KEYRING_BACKEND,
  // );

  // const { now } = Date;
  // const makeTimeout = delay =>
  //   assertUint32(delay) &&
  //   new Promise(resolve => globalThis.setTimeout(resolve, delay));

  const agd = makeAgd({ execFileSync });
  addBidCommand0(interCmd, { tui, makeRpcClient, agd });
  addBidCommand(interCmd, { tui, getBatchQuery, makeRpcClient });

  return Promise.resolve(interCmd.parseAsync(process.argv)).catch(err => {
    if (err instanceof CommanderError) {
      console.error(err.message);
    } else {
      console.error(err); // CRASH! show stack trace
    }
    process.exit(1);
  });
};

main();
