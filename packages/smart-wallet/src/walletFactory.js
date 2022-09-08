// @ts-check
/**
 * @file Wallet Factory
 *
 * Contract to make smart wallets.
 */

import { BridgeId } from '@agoric/internal';
import { fit, M } from '@agoric/store';
import { makeAtomicProvider } from '@agoric/store/src/stores/store-utils.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { E, Far } from '@endo/far';
import { makeSmartWallet } from './smartWallet.js';
import { shape } from './typeGuards.js';

const PrivateArgsShape = harden(
  M.split(
    { storageNode: M.eref(M.any()) },
    M.partial({ bridgeManager: M.eref(M.any()) }),
  ),
);

/**
 * @typedef {{
 *   agoricNames: ERef<NameHub>,
 *   board: ERef<Board>,
 * }} SmartWalletContractTerms
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
  fit(harden(privateArgs), PrivateArgsShape);
  const { agoricNames, board } = zcf.getTerms();
  assert(board, 'missing board');
  assert(agoricNames, 'missing agoricNames');

  const zoe = zcf.getZoeService();
  const { storageNode, bridgeManager } = privateArgs;

  /** @type {MapStore<string, import('./smartWallet').SmartWallet>} */
  const walletsByAddress = makeScalarBigMapStore('walletsByAddress');
  const provider = makeAtomicProvider(walletsByAddress);

  // TODO(6062) refactor to a Far Class with type guards
  const handleWalletAction = Far('walletActionHandler', {
    /**
     *
     * @param {string} srcID
     * @param {import('./types.js').WalletBridgeMsg} obj
     */
    fromBridge: async (srcID, obj) => {
      console.log('walletFactory.fromBridge:', srcID, obj);
      fit(harden(obj), shape.WalletBridgeMsg);
      const canSpend = 'spendAction' in obj;

      // xxx capData body is also a JSON string so this is double-encoded
      // revisit after https://github.com/Agoric/agoric-sdk/issues/2589
      const actionCapData = JSON.parse(canSpend ? obj.spendAction : obj.action);
      fit(harden(actionCapData), shape.StringCapData);

      const wallet = walletsByAddress.get(obj.owner); // or throw

      console.log('walletFactory:', { wallet, actionCapData });
      return E(wallet).handleBridgeAction(actionCapData, canSpend);
    },
  });

  // NOTE: both `MsgWalletAction` and `MsgWalletSpendAction` arrive as BRIDGE_ID.WALLET
  // by way of makeBlockManager() in cosmic-swingset/src/block-manager.js
  await (bridgeManager &&
    E(bridgeManager).register(BridgeId.WALLET, handleWalletAction));

  // Each wallet has `zoe` it can use to look them up, but pass these in to save that work.
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const invitationBrand = await E(invitationIssuer).getBrand();

  const shared = {
    agoricNames,
    board,
    invitationBrand,
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
