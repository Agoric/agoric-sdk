// @ts-check
/* eslint-disable func-names */
/* global fetch, process */
import {
  iterateLatest,
  makeCastingSpec,
  makeFollower,
  makeLeaderFromRpcAddresses,
} from '@agoric/casting';
import { Command } from 'commander';
import {
  fmtRecordOfLines,
  offerStatusTuples,
  purseBalanceTuples,
} from '../lib/format.js';
import { makeRpcUtils, networkConfig } from '../lib/rpc.js';
import { getWalletState } from '../lib/wallet.js';

import { makeLeaderOptions } from '../lib/casting.js';
import {
  execSwingsetTransaction,
  fetchSwingsetParams,
  normalizeAddress,
} from '../lib/chain.js';

const SLEEP_SECONDS = 3;

export const makeWalletCommand = async () => {
  const wallet = new Command('wallet').description('wallet commands');

  wallet
    .command('provision')
    .description('provision a Smart Wallet')
    .requiredOption(
      '--account [address]',
      'address literal or name',
      normalizeAddress,
    )
    .option('--spend', 'confirm you want to spend')
    .option('--nickname [string]', 'nickname to use', 'my-wallet')
    .action(function () {
      const { account, nickname, spend } = this.opts();
      if (spend) {
        const tx = `provision-one ${nickname} ${account} SMART_WALLET`;
        execSwingsetTransaction(tx, networkConfig, account);
      } else {
        const params = fetchSwingsetParams(networkConfig);
        assert(
          params.power_flag_fees.length === 1,
          'multiple power_flag_fees not supported',
        );
        const { fee: fees } = params.power_flag_fees[0];
        const nf = new Intl.NumberFormat('en-US');
        const costs = fees
          .map(f => `${nf.format(Number(f.amount))} ${f.denom}`)
          .join(' + ');
        process.stdout.write(`Provisioning a wallet costs ${costs}\n`);
        process.stdout.write(
          `To really provision, repeat this command with --spend\n`,
        );
      }
    });

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

      execSwingsetTransaction(
        `wallet-action --allow-spend "$(cat ${offer})"`,
        networkConfig,
        from,
        dryRun,
      );
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
        balances: purseBalanceTuples(
          // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error -- https://github.com/Agoric/agoric-sdk/issues/4620 */
          // @ts-ignore xxx RpcRemote
          [...balances.values()],
          [...brands.values()],
        ),
        offers: offerStatusTuples(state, agoricNames),
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
