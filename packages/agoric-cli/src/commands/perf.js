/* eslint-disable no-await-in-loop */
/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global process */
import {
  iterateEach,
  makeCastingSpec,
  makeFollower,
  makeLeaderFromRpcAddresses,
} from '@agoric/casting';
import { Command } from 'commander';
import fs from 'fs';
import { exit } from 'process';
import { makeLeaderOptions } from '../lib/casting.js';
import { execSwingsetTransaction, normalizeAddress } from '../lib/chain.js';
import { networkConfig } from '../lib/rpc.js';

// tight for perf testing but less than this tends to hang.
const SLEEP_SECONDS = 0.1;

/**
 *
 * @param {import('anylogger').Logger} logger
 */
export const makePerfCommand = async logger => {
  const perf = new Command('perf').description('Performance testing commands');

  perf
    .command('satisfaction')
    .requiredOption(
      '--executeOffer <filename>',
      'filename of prepared executeOffer message',
    )
    .description('filename of prepared offer')
    .requiredOption(
      '--from [address]',
      'address literal or name',
      normalizeAddress,
    )
    .option(
      '--keyring-backend [string]',
      'Select keyring’s backend (os|file|kwallet|pass|test|memory) (default "os")',
      'os',
    )
    .option('--home [string]', 'directory for config and data')
    .action(async function () {
      const opts = this.opts();
      logger.warn({ opts });
      const payloadStr = await fs.readFileSync(opts.executeOffer).toString();
      const { offer } = JSON.parse(JSON.parse(payloadStr).body);
      const { id: offerId } = offer;

      const spec = `:published.wallet.${opts.from}`;

      const leaderOptions = makeLeaderOptions({
        sleep: SLEEP_SECONDS,
        jitter: 0,
        log: () => undefined,
      });

      const leader = makeLeaderFromRpcAddresses(
        networkConfig.rpcAddrs,
        leaderOptions,
      );

      logger.warn('Following', spec);
      const castingSpec = makeCastingSpec(spec);
      const follower = makeFollower(castingSpec, leader);

      const watchForSatisfied = async () => {
        for await (const { value } of iterateEach(follower)) {
          console.warn('wallet update', value);
          if (value.updated === 'offerStatus' && value.status.id === offerId) {
            const { status } = value;
            if (status.error) {
              console.error(status.error);
              exit(1);
            } else if (status.numWantsSatisfied)
              process.stdout.write(`satisfied: ${status.numWantsSatisfied}\n`);
            exit(0);
          }
        }
      };
      void watchForSatisfied();

      // now execute
      let cmd = `wallet-action --allow-spend "$(cat ${opts.executeOffer})"`;
      if (opts.keyringBackend) {
        cmd = cmd.concat(' --keyring-backend ', opts.keyringBackend);
      }
      if (opts.home) {
        cmd = cmd.concat(' --home ', opts.home);
      }
      execSwingsetTransaction(cmd, networkConfig, opts.from);
    });

  return perf;
};
