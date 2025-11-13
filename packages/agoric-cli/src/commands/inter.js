/**
 * @file Inter Protocol Liquidation Bidding CLI
 * @see {makeInterCommand} for main function
 */

// @ts-check
import { fetchEnvNetworkConfig, makeWalletUtils } from '@agoric/client-utils';
import { CommanderError } from 'commander';
import { bigintReplacer } from '../lib/format.js';

/**
 * @import {VBankAssetDetail} from '@agoric/vats/tools/board-utils.js';
 * @import {Timestamp} from '@agoric/time';
 * @import {RelativeTimeRecord} from '@agoric/time';
 * @import {OfferStatus} from '@agoric/smart-wallet/src/offers.js';
 * @import {Writable} from 'stream';
 * @import {createCommand} from 'commander';
 * @import {execFileSync} from 'child_process';
 */

/**
 * Make Inter Protocol commands.
 *
 * @param {{
 *   env: Partial<Record<string, string>>,
 *   stdout: Pick<Writable,'write'>,
 *   stderr: Pick<Writable,'write'>,
 *   now: () => number,
 *   createCommand: // Note: includes access to process.stdout, .stderr, .exit
 *     typeof createCommand,
 *   execFileSync: typeof execFileSync,
 *   setTimeout: typeof setTimeout,
 * }} process
 * @param {{ fetch: typeof window.fetch }} net
 */
export const makeInterCommand = (
  { env, stdout, setTimeout, createCommand },
  { fetch },
) => {
  const interCmd = createCommand('inter')
    .description('Inter Protocol commands for liquidation bidding etc.')
    .option('--home <dir>', 'agd CosmosSDK application home directory')
    .option(
      '--fees <amount>',
      'set fees for transaction broadcast (e.g. 5000ubld)',
    )
    .option(
      '--keyring-backend <os|file|test>',
      `keyring's backend (os|file|test) (default "${
        env.AGORIC_KEYRING_BACKEND || 'os'
      }")`,
      env.AGORIC_KEYRING_BACKEND,
    );

  /** @param {number} ms */
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const show = (info, indent = false) =>
    stdout.write(
      `${JSON.stringify(info, bigintReplacer, indent ? 2 : undefined)}\n`,
    );

  const tryMakeUtils = async () => {
    await null;
    try {
      // XXX pass fetch to getNetworkConfig() explicitly
      // await null above makes this await safe
      const networkConfig = await fetchEnvNetworkConfig({ env, fetch });
      return makeWalletUtils({ fetch, delay }, networkConfig);
    } catch (err) {
      // CommanderError is a class constructor, and so
      // must be invoked with `new`.
      throw new CommanderError(1, 'RPC_FAIL', err.message);
    }
  };

  const assetCmd = interCmd
    .command('vbank')
    .description('vbank asset commands');
  assetCmd
    .command('list')
    .description('list registered assets with decimalPlaces, boardId, etc.')
    .action(async () => {
      const { agoricNames } = await tryMakeUtils();
      const assets = Object.values(agoricNames.vbankAsset).map(a => {
        return {
          issuerName: a.issuerName,
          denom: a.denom,
          brand: { boardId: a.brand.getBoardId() },
          displayInfo: { decimalPlaces: a.displayInfo.decimalPlaces },
        };
      });
      show(assets, true);
    });

  return interCmd;
};
