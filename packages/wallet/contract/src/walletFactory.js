// @ts-check
/**
 * @file Wallet Factory
 *
 * Contract to make smart wallets.
 */
import '@agoric/deploy-script-support/exported.js';
import '@agoric/wallet-backend/src/types.js'; // TODO avoid ambient types
import '@agoric/zoe/exported.js';

import { makeAtomicProvider } from '@agoric/store/src/stores/store-utils.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { Far } from '@endo/far';
import { makeSmartWallet } from './smartWallet.js';

/**
 * @typedef {{
 *   agoricNames: NameHub,
 *   board: Board,
 *   namesByAddress: NameHub,
 * }} SmartWalletContractTerms
 */

/**
 *
 * @param {ZCF<SmartWalletContractTerms>} zcf
 * @param {{
 *   storageNode?: ERef<StorageNode>,
 * }} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { agoricNames, namesByAddress, board } = zcf.getTerms();
  assert(board, 'missing board');
  assert(namesByAddress, 'missing namesByAddress');
  assert(agoricNames, 'missing agoricNames');
  const zoe = zcf.getZoeService();
  const { storageNode } = privateArgs;

  /** @type {MapStore<string, import('./smartWallet').SmartWallet>} */
  const walletsByAddress = makeScalarBigMapStore('walletsByAddress');
  const provider = makeAtomicProvider(walletsByAddress);

  const shared = {
    agoricNames,
    board,
    namesByAddress,
    storageNode,
    zoe,
  };

  /**
   *
   * @param {string} address
   * @param {ERef<import('@agoric/vats/src/vat-bank').Bank>} bank
   * @param {ERef<MyAddressNameAdmin>} myAddressNameAdmin
   * @returns {Promise<import('./smartWallet').SmartWallet>}
   */
  const provideSmartWallet = async (address, bank, myAddressNameAdmin) => {
    assert.typeof(address, 'string', 'invalid address');
    assert(bank, 'missing bank');
    assert(myAddressNameAdmin, 'missing myAddressNameAdmin');

    /** @type {() => Promise<import('./smartWallet').SmartWallet>} */
    const maker = () =>
      makeSmartWallet({ address, bank, myAddressNameAdmin }, shared);

    return provider.provideAsync(address, maker);
  };

  return {
    creatorFacet: Far('walletFactoryCreator', {
      provideSmartWallet,
    }),
  };
};
