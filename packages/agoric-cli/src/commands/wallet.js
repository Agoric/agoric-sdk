// @ts-check
/* eslint-disable func-names */
/* eslint-env node */
import {
  iterateLatest,
  makeCastingSpec,
  makeFollower,
  makeLeader,
  makeLeaderFromRpcAddresses,
} from '@agoric/casting';
import {
  makeVstorageKit,
  fetchEnvNetworkConfig,
  makeAgoricNames,
} from '@agoric/client-utils';
import { execFileSync } from 'child_process';
import fs from 'fs';
import util from 'util';

import { makeLeaderOptions } from '../lib/casting.js';
import {
  execSwingsetTransaction,
  fetchSwingsetParams,
  normalizeAddressWithOptions,
} from '../lib/chain.js';
import {
  fmtRecordOfLines,
  parseFiniteNumber,
  summarize,
} from '../lib/format.js';
import { coalesceWalletState, getCurrent } from '../lib/wallet.js';

const networkConfig = await fetchEnvNetworkConfig({ env: process.env, fetch });

const SLEEP_SECONDS = 3;

/**
 * @param {import('commander').Command['command']} command
 * @returns {Promise<import('commander').Command>}
 */
export const makeWalletCommand = async command => {
  /**
   * @param {import('commander').Command} baseCmd
   */
  const withSharedTxOptions = baseCmd =>
    baseCmd
      .option('--home <dir>', 'agd application home directory')
      .option(
        '--keyring-backend <os|file|test>',
        'keyring\'s backend (os|file|test) (default "os")',
      );
  /** @typedef {{home?: string, keyringBackend: 'os' | 'file' | 'test'}} SharedTxOptions */

  const wallet = withSharedTxOptions(command('wallet')).description(
    'wallet commands',
  );

  /** @param {string} literalOrName */
  const normalizeAddress = literalOrName =>
    normalizeAddressWithOptions(literalOrName, wallet.opts());

  withSharedTxOptions(wallet.command('provision'))
    .description('provision a Smart Wallet')
    .requiredOption(
      '--account [address]',
      'address literal or name',
      normalizeAddress,
    )
    .option('--spend', 'confirm you want to spend')
    .option('--nickname <string>', 'nickname to use', 'my-wallet')
    .action(function (opts) {
      /** @typedef {{account: string, spend?: boolean, nickname: 'my-wallet' | string }} Opts */
      const {
        account,
        nickname,
        spend,
        home,
        keyringBackend: backend,
      } = /** @type {SharedTxOptions & Opts} */ ({ ...wallet.opts(), ...opts });
      const tx = ['provision-one', nickname, account, 'SMART_WALLET'];
      if (spend) {
        execSwingsetTransaction(tx, {
          from: account,
          keyring: { home, backend },
          ...networkConfig,
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
        execSwingsetTransaction(tx, {
          from: account,
          dryRun: true,
          keyring: { home, backend },
          ...networkConfig,
        });
      }
    });

  wallet
    .command('print')
    .description('print out a marshalled message on disk')
    .requiredOption('--file [filename]', 'path to file with prepared message')
    .action(async function (opts) {
      const offerStr = fs.readFileSync(opts.file).toString();

      const { marshaller } = makeVstorageKit({ fetch }, networkConfig);

      const offerObj = marshaller.fromCapData(JSON.parse(offerStr));
      console.log(offerObj);
    });

  wallet
    .command('extract-id')
    .description(
      'print out the offer id of a marshalled offer messsage on disk',
    )
    .requiredOption('--offer [filename]', 'path to file with prepared offer')
    .action(async function (opts) {
      const offerStr = fs.readFileSync(opts.offer).toString();

      const { marshaller } = makeVstorageKit({ fetch }, networkConfig);

      const offerObj = marshaller.fromCapData(JSON.parse(offerStr));
      console.log(offerObj.offer.id);
    });

  withSharedTxOptions(wallet.command('send'))
    .description('send a prepared offer')
    .requiredOption(
      '--from [address]',
      'address literal or name',
      normalizeAddress,
    )
    .requiredOption('--offer [filename]', 'path to file with prepared offer')
    .option('--dry-run', 'spit out the command instead of running it')
    .option('--gas', 'gas limit; "auto" [default] to calculate automatically')
    .option(
      '--gas-adjustment',
      'factor by which to multiply the --gas=auto calculation result [default 1.2]',
    )
    .option('--verbose', 'print command output')
    .action(function (opts) {
      /**
       * @typedef {{
       *   from: string,
       *   offer: string,
       *   dryRun: boolean,
       *   gas: string,
       *   gasAdjustment: string,
       *   verbose: boolean,
       * }} Opts
       */
      const {
        dryRun,
        from,
        gas = 'auto',
        gasAdjustment = '1.2',
        offer,
        home,
        verbose,
        keyringBackend: backend,
      } = /** @type {SharedTxOptions & Opts} */ ({ ...wallet.opts(), ...opts });

      const offerBody = fs.readFileSync(offer).toString();
      const out = execSwingsetTransaction(
        ['wallet-action', '--allow-spend', offerBody, '-ojson', '-bblock'],
        {
          ...networkConfig,
          keyring: { home, backend },
          from,
          gas:
            gas === 'auto'
              ? ['auto', parseFiniteNumber(gasAdjustment)]
              : parseFiniteNumber(gas),
          dryRun,
          verbose,
        },
      );

      // see sendAction in {@link ../lib/wallet.js}
      if (dryRun || !verbose) return;
      try {
        const tx = JSON.parse(/** @type {string} */ (out));
        if (tx.code !== 0) {
          console.error('failed to send tx', tx);
        }
        console.log(tx);
      } catch (err) {
        console.error('unexpected output', JSON.stringify(out));
        throw err;
      }
    });

  wallet
    .command('list')
    .description('list all wallets in vstorage')
    .action(async function () {
      const { vstorage } = makeVstorageKit({ fetch }, networkConfig);
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
    .action(async function (opts) {
      const {
        readPublished,
        marshaller: unserializer,
        ...vsk
      } = makeVstorageKit({ fetch }, networkConfig);
      const agoricNames = await makeAgoricNames(vsk.fromBoard, vsk.vstorage);

      const leader = makeLeader(networkConfig.rpcAddrs[0]);
      const follower = await makeFollower(
        `:published.wallet.${opts.from}`,
        leader,
        {
          // @ts-expect-error xxx follower/marshaller types
          unserializer,
        },
      );

      const coalesced = await coalesceWalletState(follower);

      const current = await getCurrent(opts.from, { readPublished });

      console.warn(
        'got coalesced',
        util.inspect(coalesced, { depth: 10, colors: true }),
      );
      try {
        const summary = summarize(current, coalesced, agoricNames);
        process.stdout.write(fmtRecordOfLines(summary));
        process.stdout.write('\n');
      } catch (e) {
        console.error('CAUGHT HERE', e);
      }
      execFileSync(
        'agd',
        [
          'query',
          '--node',
          networkConfig.rpcAddrs[0],
          'bank',
          'balances',
          opts.from,
        ],
        {
          stdio: 'inherit',
        },
      );
    });

  wallet
    .command('watch')
    .description('watch for wallet changes')
    .requiredOption(
      '--from <address>',
      'address literal or name',
      normalizeAddress,
    )
    .action(async function ({ from }) {
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
