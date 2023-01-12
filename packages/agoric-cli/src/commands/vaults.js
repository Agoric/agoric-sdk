/* eslint-disable no-await-in-loop */
/* eslint-disable @jessie.js/no-nested-await */
// @ts-check
/* eslint-disable func-names */
/* global fetch */
import { Command } from 'commander';
import { makeRpcUtils } from '../lib/rpc.js';
import { makeOpenSpendAction } from '../lib/vaults.js';
import { outputAction } from '../lib/wallet.js';

/** @typedef {import('@agoric/smart-wallet/src/offers').OfferSpec} OfferSpec */
/** @typedef {import('@agoric/smart-wallet/src/offers').OfferStatus} OfferStatus */
/** @typedef {import('@agoric/smart-wallet/src/smartWallet').BridgeAction} BridgeAction */

const {
  vstorage,
  fromBoard: _fromBoard,
  agoricNames,
} = await makeRpcUtils({ fetch });

/**
 *
 * @param {import('anylogger').Logger} logger
 */
export const makeVaultsCommand = async logger => {
  const vaults = new Command('vaults').description('Vault Factory commands');

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
