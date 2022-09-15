// @ts-check
/* eslint-disable func-names */
/* global fetch, process */
import { execSync } from 'child_process';
import {
  iterateLatest,
  makeCastingSpec,
  makeFollower,
  makeLeaderFromRpcAddresses,
} from '@agoric/casting';
import { Command } from 'commander';
import { fmtRecordOfLines, simplePurseBalances } from '../lib/format.js';
import { simpleOffers } from '../lib/psm.js';
import { makeRpcUtils, networkConfig } from '../lib/rpc.js';
import { getWalletState } from '../lib/wallet.js';

import { makeLeaderOptions } from '../lib/casting.js';
import { normalizeAddress } from '../lib/keys.js';

const SLEEP_SECONDS = 3;

export const makeWalletCommand = async () => {
  const wallet = new Command('wallet').description('wallet commands');

  wallet
    .command('send')
    .description('send a prepared offer')
    .requiredOption(
      '--from [address]',
      'address literal or name',
      normalizeAddress,
    )
    .requiredOption('--offer [filename]', 'path to file with prepared offer')
    .option('--dry-run', 'spit out the command instead of running it')
    .action(function () {
      const { dryRun, from, offer } = this.opts();
      const { chainName, rpcAddrs } = networkConfig;

      const cmd = `agd --node=${rpcAddrs[0]} --chain-id=${chainName} --from=${from} tx swingset wallet-action --allow-spend "$(cat ${offer})"`;

      if (dryRun) {
        process.stdout.write('Run this interactive command in shell:\n\n');
        process.stdout.write(cmd);
        process.stdout.write('\n');
      } else {
        const yesCmd = `${cmd} --yes`;
        console.log('Executing ', yesCmd);
        execSync(yesCmd);
      }
    });

  wallet
    .command('list')
    .description('list all wallets in vstorage')
    .action(async function () {
      const { vstorage } = await makeRpcUtils({ fetch });
      const wallets = await vstorage.keys('published.wallet');
      process.stdout.write(wallets.join('\n'));
    });

  wallet
    .command('show')
    .description('show current state')
    .requiredOption(
      '--from <address>',
      'address literal or name',
      normalizeAddress,
    )
    .action(async function () {
      const opts = this.opts();
      const { agoricNames, fromBoard, vstorage } = await makeRpcUtils({
        fetch,
      });
      const state = await getWalletState(opts.from, fromBoard, {
        vstorage,
      });
      console.warn('got state', state);
      const { brands, balances } = state;
      const summary = {
        balances: simplePurseBalances([...balances.values()], brands),
        offers: simpleOffers(state, agoricNames),
      };
      process.stdout.write(fmtRecordOfLines(summary));
    });

  wallet
    .command('watch')
    .description('watch for wallet changes')
    .requiredOption(
      '--from <address>',
      'address literal or name',
      normalizeAddress,
    )
    .action(async function () {
      const { from } = this.opts();
      const spec = `:published.wallet.${from}`;

      const leaderOptions = makeLeaderOptions({
        sleep: SLEEP_SECONDS,
        jitter: 0,
        log: () => undefined,
      });

      const leader = makeLeaderFromRpcAddresses(
        networkConfig.rpcAddrs,
        leaderOptions,
      );

      console.warn('Following', spec);
      const castingSpec = makeCastingSpec(spec);
      const follower = makeFollower(castingSpec, leader);
      for await (const { value } of iterateLatest(follower)) {
        process.stdout.write(value);
        process.stdout.write('\n');
      }
    });

  return wallet;
};
