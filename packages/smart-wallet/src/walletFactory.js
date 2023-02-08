/**
 * @file Wallet Factory
 *
 * Contract to make smart wallets.
 */

import { WalletName } from '@agoric/internal';
import { observeIteration } from '@agoric/notifier';
import { M, makeExo, makeScalarMapStore, mustMatch } from '@agoric/store';
import { makeAtomicProvider } from '@agoric/store/src/stores/store-utils.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeMyAddressNameAdminKit } from '@agoric/vats/src/core/basic-behaviors.js';
import { E, Far } from '@endo/far';
import { prepareSmartWallet } from './smartWallet.js';
import { shape } from './typeGuards.js';

// Ambient types. Needed only for dev but this does a runtime import.
import '@agoric/vats/exported.js';

export const privateArgsShape = harden(
  M.splitRecord(
    { storageNode: M.eref(M.remotable('StorageNode')) },
    { walletBridgeManager: M.eref(M.remotable('walletBridgeManager')) },
  ),
);

export const customTermsShape = harden({
  agoricNames: M.eref(M.remotable('agoricNames')),
  board: M.eref(M.remotable('board')),
  assetPublisher: M.eref(M.remotable('Bank')),
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
 * @param {AssetPublisher} assetPublisher
 */
const makeAssetRegistry = assetPublisher => {
  /**
   * @typedef {{
   *   brand: Brand,
   *   displayInfo: DisplayInfo,
   *   issuer: Issuer,
   *   petname: import('./types').Petname
   * }} BrandDescriptor
   * For use by clients to describe brands to users. Includes `displayInfo` to save a remote call.
   */
  /** @type {MapStore<Brand, BrandDescriptor>} */
  const brandDescriptors = makeScalarMapStore();

  // watch the bank for new issuers to make purses out of
  void observeIteration(E(assetPublisher).getAssetSubscription(), {
    async updateState(desc) {
      const { brand, issuer: issuerP, issuerName: petname } = desc;
      // await issuer identity for use in chainStorage
      const [issuer, displayInfo] = await Promise.all([
        issuerP,
        E(brand).getDisplayInfo(),
      ]);

      brandDescriptors.init(desc.brand, {
        brand,
        issuer,
        petname,
        displayInfo,
      });
    },
  });

  // XXX marshal requires Far, but clients make sync calls
  const registry = Far('AssetRegistry', {
    /** @param {Brand} brand */
    getRegisteredAsset: brand => {
      return brandDescriptors.get(brand);
    },
    getRegisteredBrands: () => [...brandDescriptors.values()],
  });
  return registry;
};

/**
 * @typedef {{
 *   agoricNames: ERef<NameHub>,
 *   board: ERef<import('@agoric/vats').Board>,
 *   assetPublisher: AssetPublisher,
 * }} SmartWalletContractTerms
 *
 * @typedef {import('@agoric/vats').NameHub} NameHub
 *
 * @typedef {{
 *   getAssetSubscription: () => ERef<Subscription<import('@agoric/vats/src/vat-bank').AssetDescriptor>>
 * }} AssetPublisher
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
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const { agoricNames, board, assetPublisher } = zcf.getTerms();

  const zoe = zcf.getZoeService();
  const { storageNode, walletBridgeManager } = privateArgs;

  /** @type {MapStore<string, import('./smartWallet').SmartWallet>} */
  const walletsByAddress = makeScalarBigMapStore('walletsByAddress');
  const provider = makeAtomicProvider(walletsByAddress);

  const handleWalletAction = makeExo(
    'walletActionHandler',
    M.interface('walletActionHandlerI', {
      fromBridge: M.call(shape.WalletBridgeMsg).returns(M.promise()),
    }),
    {
      /**
       *
       * @param {import('./types.js').WalletBridgeMsg} obj validated by shape.WalletBridgeMsg
       */
      fromBridge: async obj => {
        console.log('walletFactory.fromBridge:', obj);

        const canSpend = 'spendAction' in obj;

        // xxx capData body is also a JSON string so this is double-encoded
        // revisit after https://github.com/Agoric/agoric-sdk/issues/2589
        const actionCapData = JSON.parse(
          canSpend ? obj.spendAction : obj.action,
        );
        mustMatch(harden(actionCapData), shape.StringCapData);

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
  const invitationIssuerP = E(zoe).getInvitationIssuer();
  const [
    invitationIssuer,
    invitationBrand,
    invitationDisplayInfo,
    publicMarshaller,
  ] = await Promise.all([
    invitationIssuerP,
    E(invitationIssuerP).getBrand(),
    E(E(invitationIssuerP).getBrand()).getDisplayInfo(),
    E(board).getReadonlyMarshaller(),
  ]);

  const registry = makeAssetRegistry(assetPublisher);

  const shared = harden({
    agoricNames,
    invitationBrand,
    invitationDisplayInfo,
    invitationIssuer,
    publicMarshaller,
    registry,
    zoe,
  });

  /**
   * Holders of this object:
   * - vat (transitively from holding the wallet factory)
   * - wallet-ui (which has key material; dapps use wallet-ui to propose actions)
   */
  const makeSmartWallet = prepareSmartWallet(baggage, shared);

  const creatorFacet = makeExo(
    'walletFactoryCreator',
    M.interface('walletFactoryCreatorI', {
      provideSmartWallet: M.callWhen(
        M.string(),
        M.await(M.remotable('Bank')),
        M.await(M.remotable('namesByAddressAdmin')),
      ).returns([M.remotable('SmartWallet'), M.boolean()]),
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
          const walletStorageNode = E(storageNode).makeChildNode(address);
          const wallet = await makeSmartWallet(
            harden({ address, walletStorageNode, bank, invitationPurse }),
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
