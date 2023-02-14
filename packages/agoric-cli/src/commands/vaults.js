/* eslint-disable no-await-in-loop */
/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global fetch, process */
import { Command } from 'commander';
import { normalizeAddressWithOptions } from '../lib/chain.js';
import { makeRpcUtils, storageHelper } from '../lib/rpc.js';
import {
  lookupOfferIdForVault,
  makeAdjustSpendAction,
  makeCloseSpendAction,
  makeOpenSpendAction,
} from '../lib/vaults.js';
import { getCurrent, outputAction } from '../lib/wallet.js';
import { asPercent, makeAmountFormatter } from '../lib/format.js';

/** @typedef {import('@agoric/smart-wallet/src/offers').OfferSpec} OfferSpec */
/** @typedef {import('@agoric/smart-wallet/src/offers').OfferStatus} OfferStatus */
/** @typedef {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} BridgeAction */

const { vstorage, fromBoard, agoricNames } = await makeRpcUtils({ fetch });

/**
 * @param {number} manager
 */
const getGovernanceState = async manager => {
  const last = xs => xs[xs.length - 1];

  const govContent = await vstorage.readLatest(
    `published.vaultFactory.manager${manager}.governance`,
  );
  assert(govContent, 'no gov content');
  const { current: governance } = last(
    storageHelper.unserializeTxt(govContent, fromBoard),
  );

  return { governance };
};

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
    .command('info')
    .description('show governance parameters of a vault type')
    .requiredOption('--manager [N]', 'manager number', s => Number(s), 0)
    .action(async ({ manager }) => {
      const { entries, values } = Object;
      /** @type {import('../lib/format.js').AssetDescriptor[]} */
      // @ts-expect-error Brand vs. RpcRemote
      const assets = values(agoricNames.vbankAsset).map(d => ({
        ...d,
        petname: d.issuerName,
      }));
      const fmtAmt = makeAmountFormatter(assets);
      console.log(`manager${manager} governance parameters:`);
      const { governance } = await getGovernanceState(manager);
      for (const [name, { type, value }] of entries(governance)) {
        switch (type) {
          case 'amount':
            console.log(name, fmtAmt(value));
            break;
          case 'ratio':
            console.log(name, asPercent(value), '%');
            break;
          default:
            console.log(name, type, value);
        }
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
    .command('adjust')
    .description('adjust an existing vault')
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .option('--giveCollateral [number]', 'More collateral to lend', Number)
    .option('--wantCollateral [number]', 'Collateral to get back', Number)
    .option('--giveMinted [number]', 'Minted to give back', Number)
    .option('--wantMinted [number]', 'More minted to borrow', Number)
    .option('--offerId [number]', 'Offer id', Number, Date.now())
    // TODO method to disambiguate between managers
    .requiredOption('--vaultId [string]', 'Key of vault (e.g. vault1)')
    .action(async function (opts) {
      logger.warn('running with options', opts);

      const previousOfferId = await lookupOfferIdForVault(
        opts.vaultId,
        getCurrent(opts.from, fromBoard, { vstorage }),
      );

      const spendAction = makeAdjustSpendAction(
        // @ts-expect-error xxx RpcRemote
        agoricNames.brand,
        opts,
        previousOfferId,
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
