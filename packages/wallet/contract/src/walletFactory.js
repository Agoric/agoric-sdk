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
import * as BRIDGE_ID from '@agoric/vats/src/bridge-ids.js';
import { E, Far } from '@endo/far';
import { makeSmartWallet } from './smartWallet';

/**
 * @typedef {{
 *   agoricNames: NameHub,
 *   board: Board,
 *   namesByAddress: NameHub,
 * }} SmartWalletContractTerms
 *
 * @typedef {{
 * 	 type: string, // WALLET_ACTION
 *   owner: string,
 *   spendAction: string,
 *   blockHeight: unknown, // int64
 *   blockTime: unknown, // int64
 * }} WalletAction
 */

/**
 *
 * @param {ZCF<SmartWalletContractTerms>} zcf
 * @param {{
 *   storageNode?: ERef<StorageNode>,
 *   bridgeManager?: BridgeManager,
 * }} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { agoricNames, namesByAddress, board } = zcf.getTerms();
  assert(board, 'missing board');
  assert(namesByAddress, 'missing namesByAddress');
  assert(agoricNames, 'missing agoricNames');
  const zoe = zcf.getZoeService();
  const { storageNode, bridgeManager } = privateArgs;

  /** @type {MapStore<string, import('./smartWallet').SmartWallet>} */
  const walletsByAddress = makeScalarBigMapStore('walletsByAddress');
  const provider = makeAtomicProvider(walletsByAddress);

  const handleWalletAction = Far('walletActionHandler', {
    /**
     *
     * @param {string} srcID
     * @param {WalletAction} obj
     */
    fromBridge: async (srcID, obj) => {
      console.log('walletFactory.fromBridge:', srcID, obj);
      assert(obj, 'missing wallet action');
      assert.typeof(obj, 'object');
      assert.typeof(obj.owner, 'string');
      const wallet = walletsByAddress.get(obj.owner); // or throw
      console.log('walletFactory:', { wallet });
      return E(wallet).performAction(obj); // TODO: add performAction to lib-wallet.js
    },
  });

  await (bridgeManager &&
    E(bridgeManager).register(BRIDGE_ID.WALLET, handleWalletAction));

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
