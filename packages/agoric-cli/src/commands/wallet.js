// @ts-check
/* eslint-disable func-names */
/* global fetch, process */
import {
  iterateLatest,
  makeCastingSpec,
  makeFollower,
  makeLeader,
  makeLeaderFromRpcAddresses,
} from '@agoric/casting';
import { coalesceWalletState } from '@agoric/smart-wallet/src/utils.js';
import { Command } from 'commander';
import util from 'util';
import { fmtRecordOfLines, summarize } from '../lib/format.js';
import {
  boardSlottingMarshaller,
  makeRpcUtils,
  networkConfig,
} from '../lib/rpc.js';

import { makeLeaderOptions } from '../lib/casting.js';
import {
  execSwingsetTransaction,
  fetchSwingsetParams,
  normalizeAddress,
} from '../lib/chain.js';
import { getCurrent } from '../lib/wallet.js';

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
    .option('--home [dir]', 'agd application home directory')
    .option(
      '--keyring-backend [os|file|test]',
      'keyring\'s backend (os|file|test) (default "os")',
    )
    .option('--nickname [string]', 'nickname to use', 'my-wallet')
    .action(function () {
      const {
        account,
        nickname,
        spend,
        home,
        keyringBackend: backend,
      } = this.opts();
      const tx = `provision-one ${nickname} ${account} SMART_WALLET`;
      if (spend) {
        execSwingsetTransaction(tx, networkConfig, account, false, {
          home,
          backend,
        });
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
        process.stdout.write(`To really provision, rerun with --spend or...\n`);
        execSwingsetTransaction(tx, networkConfig, account, true, {
          home,
          backend,
        });
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
    .option('--home [dir]', 'agd application home directory')
    .option(
      '--keyring-backend [os|file|test]',
      'keyring\'s backend (os|file|test) (default "os")',
    )
    .option('--dry-run', 'spit out the command instead of running it')
    .action(function () {
      const {
        dryRun,
        from,
        offer,
        home,
        keyringBackend: backend,
      } = this.opts();

      execSwingsetTransaction(
        `wallet-action --allow-spend "$(cat ${offer})"`,
        networkConfig,
        from,
        dryRun,
        { home, backend },
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
      'wallet address literal or name',
      normalizeAddress,
    )
    .action(async function () {
      const opts = this.opts();

      const { agoricNames, fromBoard, vstorage } = await makeRpcUtils({
        fetch,
      });

      const unserializer = boardSlottingMarshaller(fromBoard.convertSlotToVal);

      const leader = makeLeader(networkConfig.rpcAddrs[0]);
      const follower = await makeFollower(
        `:published.wallet.${opts.from}`,
        leader,
        {
          // @ts-expect-error xxx
          unserializer,
        },
      );

      const coalesced = await coalesceWalletState(follower);

      const current = await getCurrent(opts.from, fromBoard, {
        vstorage,
      });

      console.warn(
        'got coalesced',
        util.inspect(coalesced, { depth: 10, colors: true }),
      );
      try {
        const summary = summarize(current, coalesced, agoricNames);
        process.stdout.write(fmtRecordOfLines(summary));
      } catch (e) {
        console.error('CAUGHT HERE', e);
      }
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
        // xxx relying on console for app output
        // worth it to get the nice formatting
        console.log(value);
      }
    });

  return wallet;
};
