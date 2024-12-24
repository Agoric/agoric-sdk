// @ts-check
/* eslint-disable func-names */
/* eslint-env node */
import {
  fetchEnvNetworkConfig,
  makeAgoricNames,
  makeVstorageKit,
} from '@agoric/client-utils';
import {
  lookupOfferIdForVault,
  Offers,
} from '@agoric/inter-protocol/src/clientSupport.js';
import { Command } from 'commander';
import { normalizeAddressWithOptions } from '../lib/chain.js';
import { getCurrent, outputExecuteOfferAction } from '../lib/wallet.js';

const networkConfig = await fetchEnvNetworkConfig({ env: process.env, fetch });

/**
 * @param {import('anylogger').Logger} logger
 */
export const makeVaultsCommand = logger => {
  const vaults = new Command('vaults')
    .description('Vault Factory commands')
    .option('--home [dir]', 'agd application home directory')
    .option(
      '--keyring-backend <os|file|test>',
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
      const { readPublished } = await makeVstorageKit({ fetch }, networkConfig);

      const current = await getCurrent(opts.from, {
        readPublished,
      });

      const vaultStoragePaths = current.offerToPublicSubscriberPaths.map(
        ([_offerId, pathmap]) => pathmap.vault,
      );

      for (const path of vaultStoragePaths) {
        process.stdout.write(path);
        process.stdout.write('\n');
      }
    });

  vaults
    .command('open')
    .description('Prepare an offer to open a new vault')
    .requiredOption('--giveCollateral <number>', 'Collateral to give', Number)
    .requiredOption('--wantMinted <number>', 'Minted wants', Number)
    .option('--offerId <string>', 'Offer id', String, `openVault-${Date.now()}`)
    .option('--collateralBrand <string>', 'Collateral brand key', 'ATOM')
    .action(async function (opts) {
      logger.warn('running with options', opts);
      const vsk = makeVstorageKit({ fetch }, networkConfig);
      const agoricNames = await makeAgoricNames(vsk.fromBoard, vsk.vstorage);

      const offer = Offers.vaults.OpenVault(agoricNames, {
        giveCollateral: opts.giveCollateral,
        wantMinted: opts.wantMinted,
        offerId: opts.offerId,
        // rename to allow CLI to be more concise
        collateralBrandKey: opts.collateralBrand,
      });

      outputExecuteOfferAction(offer);
    });

  vaults
    .command('adjust')
    .description('Prepare an offer to adjust an existing vault')
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .option('--giveCollateral <number>', 'More collateral to lend', Number)
    .option('--wantCollateral <number>', 'Collateral to get back', Number)
    .option('--giveMinted <number>', 'Minted to give back', Number)
    .option('--wantMinted <number>', 'More minted to borrow', Number)
    .option(
      '--offerId <string>',
      'Offer id',
      String,
      `adjustVault-${Date.now()}`,
    )
    .option('--collateralBrand <string>', 'Collateral brand key', 'ATOM')
    .requiredOption('--vaultId <string>', 'Key of vault (e.g. vault1)')
    .action(async function (opts) {
      logger.warn('running with options', opts);
      const { readPublished, ...vsk } = makeVstorageKit(
        { fetch },
        networkConfig,
      );
      const agoricNames = await makeAgoricNames(vsk.fromBoard, vsk.vstorage);

      const previousOfferId = await lookupOfferIdForVault(
        opts.vaultId,
        getCurrent(opts.from, { readPublished }),
      );

      const offer = Offers.vaults.AdjustBalances(
        agoricNames,
        {
          giveCollateral: opts.giveCollateral,
          wantCollateral: opts.wantCollateral,
          giveMinted: opts.giveMinted,
          wantMinted: opts.wantMinted,
          offerId: opts.offerId,
          // rename to allow CLI to be more concise
          collateralBrandKey: opts.collateralBrand,
        },
        previousOfferId,
      );
      outputExecuteOfferAction(offer);
    });

  vaults
    .command('close')
    .description('Prepare an offer to close an existing vault')
    .requiredOption(
      '--from <address>',
      'wallet address literal or name',
      normalizeAddress,
    )
    .requiredOption('--giveMinted <number>', 'Minted to give back', Number)
    .requiredOption('--vaultId <string>', 'Key of vault (e.g. vault1)')
    .option(
      '--offerId <string>',
      'Offer id',
      String,
      `closeVault-${Date.now()}`,
    )
    .action(async function (opts) {
      logger.warn('running with options', opts);
      const { readPublished, ...vsk } = makeVstorageKit(
        { fetch },
        networkConfig,
      );
      const agoricNames = await makeAgoricNames(vsk.fromBoard, vsk.vstorage);

      const previousOfferId = await lookupOfferIdForVault(
        opts.vaultId,
        getCurrent(opts.from, { readPublished }),
      );

      const offer = Offers.vaults.CloseVault(
        agoricNames,
        {
          giveMinted: opts.giveMinted,
          offerId: opts.offerId,
        },
        previousOfferId,
      );
      outputExecuteOfferAction(offer);
    });

  return vaults;
};
