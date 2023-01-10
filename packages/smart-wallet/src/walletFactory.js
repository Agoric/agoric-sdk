/**
 * @file Wallet Factory
 *
 * Contract to make smart wallets.
 */

import { WalletName } from '@agoric/internal';
import { fit, M, makeHeapFarInstance } from '@agoric/store';
import { makeAtomicProvider } from '@agoric/store/src/stores/store-utils.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeMyAddressNameAdminKit } from '@agoric/vats/src/core/basic-behaviors.js';
import { E } from '@endo/far';
import { makeSmartWallet } from './smartWallet.js';
import { shape } from './typeGuards.js';

// Ambient types. Needed only for dev but this does a runtime import.
import '@agoric/vats/exported.js';

export const privateArgsShape = harden(
  M.splitRecord(
    { storageNode: M.eref(M.any()) },
    { walletBridgeManager: M.eref(M.any()) },
  ),
);

export const customTermsShape = harden({
  agoricNames: M.not(M.undefined()),
  board: M.not(M.undefined()),
});

/**
 * Provide a NameHub for this address and insert depositFacet only if not
 * already done.
 *
 * @param {string} address
 * @param {import('./smartWallet.js').SmartWallet} wallet
 * @param {ERef<import('@agoric/vats').NameAdmin>} namesByAddressAdmin
 */
export const publishDepositFacet = async (
  address,
  wallet,
  namesByAddressAdmin,
) => {
  const { nameHub, myAddressNameAdmin } = makeMyAddressNameAdminKit(address);
  myAddressNameAdmin.reserve(WalletName.depositFacet);

  // This may race against perAddress in makeAddressNameHubs, so we are careful
  // not to clobber the first nameHub that is used to update
  // namesByAddressAdmin.
  await E(namesByAddressAdmin).default(address, nameHub, myAddressNameAdmin);

  const actualAdmin = E(namesByAddressAdmin).lookupAdmin(address);
  return E(actualAdmin).default(
    WalletName.depositFacet,
    wallet.getDepositFacet(),
  );
};

/**
 * @typedef {{
 *   agoricNames: ERef<NameHub>,
 *   board: ERef<import('@agoric/vats').Board>,
 * }} SmartWalletContractTerms
 *
 * @typedef {import('@agoric/vats').NameHub} NameHub
 */

// NB: even though all the wallets share this contract, they
// 1. they should not rely on that; they may be partitioned later
// 2. they should never be able to detect behaviors from another wallet
/**
 *
 * @param {ZCF<SmartWalletContractTerms>} zcf
 * @param {{
 *   storageNode: ERef<StorageNode>,
 *   walletBridgeManager?: ERef<import('@agoric/vats').ScopedBridgeManager>,
 * }} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { agoricNames, board } = zcf.getTerms();

  const zoe = zcf.getZoeService();
  const { storageNode, walletBridgeManager } = privateArgs;

  /** @type {MapStore<string, import('./smartWallet').SmartWallet>} */
  const walletsByAddress = makeScalarBigMapStore('walletsByAddress');
  const provider = makeAtomicProvider(walletsByAddress);

  const handleWalletAction = makeHeapFarInstance(
    'walletActionHandler',
    M.interface('walletActionHandlerI', {
      fromBridge: M.call(shape.WalletBridgeMsg).returns(M.promise()),
    }),
    {
      /**
       *
       * @param {import('./types.js').WalletBridgeMsg} obj
       */
      fromBridge: async obj => {
        console.log('walletFactory.fromBridge:', obj);

        const canSpend = 'spendAction' in obj;

        // xxx capData body is also a JSON string so this is double-encoded
        // revisit after https://github.com/Agoric/agoric-sdk/issues/2589
        const actionCapData = JSON.parse(
          canSpend ? obj.spendAction : obj.action,
        );
        fit(harden(actionCapData), shape.StringCapData);

        const wallet = walletsByAddress.get(obj.owner); // or throw

        console.log('walletFactory:', { wallet, actionCapData });
        return E(wallet).handleBridgeAction(actionCapData, canSpend);
      },
    },
  );

  // NOTE: both `MsgWalletAction` and `MsgWalletSpendAction` arrive as BRIDGE_ID.WALLET
  // by way of performAction() in cosmic-swingset/src/launch-chain.js
  await (walletBridgeManager &&
    E(walletBridgeManager).setHandler(handleWalletAction));

  // Resolve these first because the wallet maker must be synchronous
  const getInvitationIssuer = E(zoe).getInvitationIssuer();
  const [invitationIssuer, invitationBrand, publicMarshaller] =
    await Promise.all([
      getInvitationIssuer,
      E(getInvitationIssuer).getBrand(),
      E(board).getReadonlyMarshaller(),
    ]);

  const shared = harden({
    agoricNames,
    invitationBrand,
    invitationIssuer,
    publicMarshaller,
    storageNode,
    zoe,
  });

  const creatorFacet = makeHeapFarInstance(
    'walletFactoryCreator',
    M.interface('walletFactoryCreatorI', {
      provideSmartWallet: M.callWhen(
        M.string(),
        M.await(M.remotable()),
        M.await(M.remotable()),
      ).returns([M.remotable(), M.boolean()]),
    }),
    {
      /**
       * @param {string} address
       * @param {ERef<import('@agoric/vats/src/vat-bank').Bank>} bank
       * @param {ERef<import('@agoric/vats/').NameAdmin>} namesByAddressAdmin
       * @returns {Promise<[import('./smartWallet').SmartWallet, boolean]>} wallet
       *   along with a flag to distinguish between looking up an existing wallet
       *   and creating a new one.
       */
      provideSmartWallet(address, bank, namesByAddressAdmin) {
        let makerCalled = false;
        /** @type {() => Promise<import('./smartWallet').SmartWallet>} */
        const maker = async () => {
          const invitationPurse = await E(invitationIssuer).makeEmptyPurse();
          const wallet = makeSmartWallet(
            harden({ address, bank, invitationPurse }),
            shared,
          );

          // An await here would deadlock with invitePSMCommitteeMembers
          void publishDepositFacet(address, wallet, namesByAddressAdmin);

          makerCalled = true;
          return wallet;
        };

        return provider
          .provideAsync(address, maker)
          .then(w => [w, makerCalled]);
      },
    },
  );

  return {
    creatorFacet,
  };
};
