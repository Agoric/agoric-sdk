/* eslint-disable no-await-in-loop */
/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global fetch, process */
import { Command } from 'commander';
import { normalizeAddressWithOptions } from '../lib/chain.js';
import { makeRpcUtils } from '../lib/rpc.js';
import {
  lookupOfferIdForVault,
  makeAdjustSpendAction,
  makeCloseSpendAction,
  makeOpenSpendAction,
} from '../lib/vaults.js';
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
    .action(async function (opts) {
      const current = await getCurrent(opts.from, fromBoard, { vstorage });

      const vaultStoragePaths = Object.values(
        current.offerToPublicSubscriberPaths,
      ).map(pathmap => pathmap.vault);

      for (const path of vaultStoragePaths) {
        process.stdout.write(path);
        process.stdout.write('\n');
      }
    });

  vaults
    .command('open')
    .description('open a new vault')
    .requiredOption('--giveCollateral [number]', 'Collateral to give', Number)
    .requiredOption('--wantMinted [number]', 'Minted wants', Number)
    .option('--offerId [number]', 'Offer id', Number, Date.now())
    .action(async function (opts) {
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

  vaults
    .command('close')
    .description('close an existing vault')
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .requiredOption('--giveMinted [number]', 'Minted to give back', Number)
    .option('--offerId [number]', 'Offer id', Number, Date.now())
    // TODO method to disambiguate between managers
    .requiredOption('--vaultId [string]', 'Key of vault (e.g. vault1)')
    .action(async function (opts) {
      logger.warn('running with options', opts);

      const previousOfferId = await lookupOfferIdForVault(
        opts.vaultId,
        getCurrent(opts.from, fromBoard, { vstorage }),
      );

      const spendAction = makeCloseSpendAction(
        // @ts-expect-error xxx RpcRemote
        agoricNames.brand,
        opts,
        previousOfferId,
      );
      outputAction(spendAction);
    });

  return vaults;
};
