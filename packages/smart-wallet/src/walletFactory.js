// @ts-check
/**
 * @file Wallet Factory
 *
 * Contract to make smart wallets.
 */

import { makeAtomicProvider } from '@agoric/store/src/stores/store-utils.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import * as BRIDGE_ID from '@agoric/vats/src/bridge-ids.js';
import { E, Far } from '@endo/far';
import { makeSmartWallet } from './smartWallet.js';

/**
 * @typedef {{
 *   agoricNames: ERef<NameHub>,
 *   board: ERef<Board>,
 * }} SmartWalletContractTerms
 */

// Client message types. These are the shapes client must use to push messages over the bridge.
/**
 * @typedef {{
 * target: 'offers', // e.g. `getOffersFacet`
 * method: string,
 * arg: import('@endo/captp').CapData<string>,
 * }} NormalAction
 * Can't receive payments.
 *
 * @typedef {{
 * target: 'deposit', 'offers', // e.g. `getDepositFacet`
 * }} SpendAction
 * Necessary for payments.
 */

/** @type {(action: NormalAction) => string} */
export const stringifyAction = ({ target, method, arg }) => {
  assert(target === 'offers', `unsupported target ${target}`);
  return `${target}.${method} ${JSON.stringify(arg)}`;
};
/** @type {(actionStr: string) => NormalAction} */
export const parseActionStr = str => {
  const space = str.indexOf(' ');
  const left = str.substring(0, space);
  const argStr = str.substring(space);
  const [target, method] = left.split('.');
  assert(target === 'offers', 'supported action str');
  const arg = JSON.parse(argStr);
  return { target, method, arg };
};

// Cosmos bridge types
/**
 * @typedef {{
 * 	 type: 'WALLET_ACTION',
 *   owner: string,
 *   action: string, // <target>,<method>,<argCapDataJsonStr>
 *   blockHeight: unknown, // int64
 *   blockTime: unknown, // int64
 * }} WalletActionMsg
 * See walletAction in msg_server.go
 *
 * @typedef {{
 * 	 type: 'WALLET_SPEND_ACTION',
 *   owner: string,
 *   spendAction: string, // SpendAction
 *   blockHeight: unknown, // int64
 *   blockTime: unknown, // int64
 * }} WalletSpendActionMsg
 * See walletSpendAction in msg_server.go
 */

// NB: even though all the wallets share this contract, they
// 1. they should rely on that; they may be partitioned later
// 2. they should never be able to detect behaviors from another wallet
/**
 *
 * @param {ZCF<SmartWalletContractTerms>} zcf
 * @param {{
 *   storageNode: ERef<StorageNode>,
 *   bridgeManager?: ERef<BridgeManager>,
 * }} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { agoricNames, board } = zcf.getTerms();
  assert(board, 'missing board');
  assert(agoricNames, 'missing agoricNames');
  const zoe = zcf.getZoeService();
  const { storageNode, bridgeManager } = privateArgs;
  assert(storageNode, 'missing storageNode');

  /** @type {MapStore<string, import('./smartWallet').SmartWallet>} */
  const walletsByAddress = makeScalarBigMapStore('walletsByAddress');
  const provider = makeAtomicProvider(walletsByAddress);

  const handleWalletAction = Far('walletActionHandler', {
    /**
     *
     * @param {string} srcID
     * @param {WalletActionMsg|WalletSpendActionMsg} obj
     */
    fromBridge: async (srcID, obj) => {
      console.log('walletFactory.fromBridge:', srcID, obj);
      assert(obj, 'missing wallet action');
      assert.typeof(obj, 'object');
      assert.typeof(obj.owner, 'string');
      assert(!('spendAction' in obj), 'spend actions not yet supported');
      assert('action' in obj, 'missing action property');
      const wallet = walletsByAddress.get(obj.owner); // or throw
      const action = parseActionStr(obj.action);
      console.log('walletFactory:', { wallet, action });
      switch (action.target) {
        case 'offers':
          return E(E(wallet).getOffersFacet())[action.method](action.arg);
        default:
          throw new Error('unsupportedaction target');
      }
    },
  });

  // NOTE: both `MsgWalletAction` and `MsgWalletSpendAction` arrive as BRIDGE_ID.WALLET
  // by way of makeBlockManager() in cosmic-swingset/src/block-manager.js
  await (bridgeManager &&
    E(bridgeManager).register(BRIDGE_ID.WALLET, handleWalletAction));

  const invitationIssuer = await E(zoe).getInvitationIssuer();

  const shared = {
    agoricNames,
    board,
    invitationIssuer,
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
      makeSmartWallet({ address, bank }, shared).then(wallet => {
        E(myAddressNameAdmin).update('depositeFacet', wallet.getDepositFacet());
        return wallet;
      });

    return provider.provideAsync(address, maker);
  };

  return {
    creatorFacet: Far('walletFactoryCreator', {
      provideSmartWallet,
    }),
  };
};
