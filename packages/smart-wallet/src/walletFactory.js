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
 * target: 'deposit' | 'offers',
 * method: string,
 * arg: import('@endo/captp').CapData<string>,
 * }} Action
 * Description of action, to be encoded in a bridge messsage 'action' or 'spendAction' field.
 * Only actions sent in 'spendAction' (in WalletSpendActionMsg) can spend.
 *
 * The `target` field maps to a getter: 'foo' --> getFooFacet()
 */

/** @type {(action: Action) => string} */
export const stringifyAction = ({ target, method, arg }) => {
  switch (target) {
    case 'deposit':
      assert(method === 'receive', `unsupported method ${method}`);
      break;
    case 'offers':
      assert(method === 'executeOffer', `unsupported method ${method}`);
      break;
    default:
      assert.fail(`unsupported target ${target}`);
  }
  // xxx utility for validating CapData shape?
  assert(arg.body && arg.slots, 'invalid arg');

  return `${target}.${method} ${JSON.stringify(arg)}`;
};
/** @type {(actionStr: string) => Action} */
export const parseActionStr = str => {
  const space = str.indexOf(' ');
  const left = str.substring(0, space);
  const argStr = str.substring(space);
  const [target, method] = left.split('.');
  assert(target === 'offers', 'supported action str');
  const arg = JSON.parse(argStr);
  return { target, method, arg };
};

const DEPOSIT_FACET = 'depositFacet';

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
      const canSpend = 'spendAction' in obj;
      assert(
        canSpend || 'action' in obj,
        'missing action/spendAction property',
      );
      const action = parseActionStr(canSpend ? obj.spendAction : obj.action);

      const wallet = walletsByAddress.get(obj.owner); // or throw
      console.log('walletFactory:', { wallet, action });
      switch (action.target) {
        case 'deposit':
          assert(canSpend);
          return E(E(wallet).getDepositFacet())[action.method](action.arg);
        case 'offers':
          return E(E(wallet).getOffersFacet())[action.method](action.arg);
        default:
          throw new Error(`unsupported action target ${action.target}`);
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
        E(myAddressNameAdmin).update(DEPOSIT_FACET, wallet.getDepositFacet());
        console.log('@@@registering deposit facet for', address);
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
