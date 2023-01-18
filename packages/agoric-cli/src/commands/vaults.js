/* eslint-disable no-await-in-loop */
/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global fetch, process */
import { vstorageKeySpecToPath } from '@agoric/casting';
import { Command } from 'commander';
import { normalizeAddressWithOptions } from '../lib/chain.js';
import { makeRpcUtils } from '../lib/rpc.js';
import { makeOpenSpendAction } from '../lib/vaults.js';
import { getCurrent, outputAction } from '../lib/wallet.js';

/** @typedef {import('@agoric/smart-wallet/src/offers').OfferSpec} OfferSpec */
/** @typedef {import('@agoric/smart-wallet/src/offers').OfferStatus} OfferStatus */
/** @typedef {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} BridgeAction */

const { vstorage, fromBoard, agoricNames } = await makeRpcUtils({ fetch });

/**
 *
 * @param {import('anylogger').Logger} logger
 */
export const makeVaultsCommand = async logger => {
  const vaults = new Command('vaults')
    .description('Vault Factory commands')
    .option('--home [dir]', 'agd application home directory')
    .option(
      '--keyring-backend [os|file|test]',
      'keyring\'s backend (os|file|test) (default "os")',
    );

  const normalizeAddress = literalOrName =>
    normalizeAddressWithOptions(literalOrName, vaults.opts());

  vaults
    .command('list')
    .description(
      'list vaults ever owned by the address (as path that can be followed)',
    )
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .action(async function () {
      // @ts-expect-error this implicit any
      const opts = this.opts();

      const current = await getCurrent(opts.from, fromBoard, { vstorage });

      const vaultStorageKeys = Object.values(
        current.offerToPublicSubscriberPaths,
      ).map(pathmap => pathmap.vault);

      for (const key of vaultStorageKeys) {
        process.stdout.write(vstorageKeySpecToPath(key));
        process.stdout.write('\n');
      }
    });

  vaults
    .command('open')
    .description('open a new vault')
    .option('--giveCollateral [number]', 'Collateral to give', Number, 9.0)
    .option('--wantMinted [number]', 'Minted wants', Number, 6.0)
    .option('--offerId [number]', 'Offer id', Number, Date.now())
    .action(async function () {
      // @ts-expect-error this implicit any
      const opts = this.opts();
      logger.warn('running with options', opts);

      const { VaultFactory } = agoricNames.instance;

      const spendAction = makeOpenSpendAction(
        // @ts-expect-error xxx RpcRemote
        VaultFactory,
        agoricNames.brand,
        opts,
      );
      outputAction(spendAction);
    });

  return vaults;
};
