// @ts-check
import { assert, Fail } from '@agoric/assert';
import { AmountMath, AssetKind } from '@agoric/ertp';
import { E, Far } from '@endo/far';
import { makeNotifierKit, makeSubscriptionKit } from '@agoric/notifier';
import { makeScalarMapStore, makeScalarWeakMapStore } from '@agoric/store';
import { whileTrue } from '@agoric/internal';
import { makeVirtualPurse } from './virtual-purse.js';

import '@agoric/notifier/exported.js';

/**
 * @typedef {import('./virtual-purse').VirtualPurseController} VirtualPurseController
 * @typedef {ReturnType<typeof makeVirtualPurse>} VirtualPurse
 */

/**
 * @callback BalanceUpdater
 * @param {string} value
 * @param {string} [nonce]
 */

/**
 * @param {(obj: any) => Promise<any>} bankCall
 * @param {string} denom
 * @param {Brand} brand
 * @param {string} address
 * @param {Notifier<Amount>} balanceNotifier
 * @param {(obj: any) => boolean} updateBalances
 * @returns {VirtualPurseController}
 */
const makePurseController = (
  bankCall,
  denom,
  brand,
  address,
  balanceNotifier,
  updateBalances,
) => {
  return harden({
    async *getBalances(b) {
      assert.equal(b, brand);
      let updateRecord = await balanceNotifier.getUpdateSince();
      for await (const _ of whileTrue(() => updateRecord.updateCount)) {
        yield updateRecord.value;
        // eslint-disable-next-line no-await-in-loop
        updateRecord = await balanceNotifier.getUpdateSince(
          updateRecord.updateCount,
        );
      }
      return updateRecord.value;
    },
    async pushAmount(amt) {
      const value = AmountMath.getValue(brand, amt);
      const update = await bankCall({
        type: 'VBANK_GIVE',
        recipient: address,
        denom,
        amount: `${value}`,
      });
      updateBalances(update);
    },
    async pullAmount(amt) {
      const value = AmountMath.getValue(brand, amt);
      const update = await bankCall({
        type: 'VBANK_GRAB',
        sender: address,
        denom,
        amount: `${value}`,
      });
      updateBalances(update);
    },
  });
};

/**
 * @template {AssetKind} [K=AssetKind]
 * @typedef {object} AssetIssuerKit
 * @property {ERef<Mint<K>>} [mint]
 * @property {ERef<Issuer<K>>} issuer
 * @property {Brand<K>} brand
 */

/**
 * @typedef {AssetIssuerKit & { denom: string, escrowPurse?: ERef<Purse> }} AssetRecord
 */

/**
 * @typedef {object} AssetDescriptor
 * @property {Brand} brand
 * @property {ERef<Issuer>} issuer
 * @property {string} issuerName
 * @property {string} denom
 * @property {string} proposedName
 */

/**
 * @typedef { AssetDescriptor & {
 *   issuer: Issuer<'nat'>, // settled identity
 *   displayInfo: DisplayInfo,
 * }} AssetInfo
 */

/**
 * @typedef {object} Bank
 * @property {() => Subscription<AssetDescriptor>} getAssetSubscription Returns
 * assets as they are added to the bank
 * @property {(brand: Brand) => VirtualPurse} getPurse Find any existing vpurse
 * (keyed by address and brand) or create a new one.
 */

export function buildRootObject() {
  return Far('bankMaker', {
    /**
     * @param {ERef<import('./types.js').ScopedBridgeManager | undefined>} [bankBridgeManagerP] a bridge
     * manager for the "remote" bank (such as on cosmos-sdk).  If not supplied
     * (such as on sim-chain), we just use local purses.
     * @param {ERef<{ update: import('./types.js').NameAdmin['update'] }>} [nameAdmin] update facet of
     *   a NameAdmin; see addAsset() for detail.
     */
    async makeBankManager(
      bankBridgeManagerP = undefined,
      nameAdmin = undefined,
    ) {
      const bankBridgeManager = await bankBridgeManagerP;
      /** @type {WeakMapStore<Brand, AssetRecord>} */
      const brandToAssetRecord = makeScalarWeakMapStore('brand');

      /** @type {MapStore<string, MapStore<string, BalanceUpdater>>} */
      const denomToAddressUpdater = makeScalarMapStore('denom');

      const updateBalances = obj => {
        switch (obj && obj.type) {
          case 'VBANK_BALANCE_UPDATE': {
            for (const update of obj.updated) {
              try {
                const { address, denom, amount: value } = update;
                const addressToUpdater = denomToAddressUpdater.get(denom);
                const updater = addressToUpdater.get(address);

                updater(value, obj.nonce);
                console.info('bank balance update', update);
              } catch (e) {
                // console.error('Unregistered update', update);
              }
            }
            return true;
          }
          default:
            return false;
        }
      };

      /**
       * @param {ERef<import('./types.js').ScopedBridgeManager>} [bankBridgeMgr]
       */
      async function makeBankCaller(bankBridgeMgr) {
        // We do the logic here if the bridge manager is available.  Otherwise,
        // the bank is not "remote" (such as on sim-chain), so we just use
        // immediate purses instead of virtual ones.
        if (!bankBridgeMgr) {
          return undefined;
        }
        // We need to synchronise with the remote bank.
        const handler = Far('bankHandler', {
          async fromBridge(obj) {
            if (!updateBalances(obj)) {
              Fail`Unrecognized request ${obj && obj.type}`;
            }
          },
        });

        await E(bankBridgeMgr).setHandler(handler);

        // We can only downcall to the bank if there exists a bridge manager.
        return obj => E(bankBridgeMgr).toBridge(obj);
      }

      const bankCall = await makeBankCaller(bankBridgeManager);

      /** @type {SubscriptionRecord<AssetDescriptor>} */
      const { subscription: assetSubscription, publication: assetPublication } =
        makeSubscriptionKit();

      /** @type {MapStore<string, Bank>} */
      const addressToBank = makeScalarMapStore('address');

      /**
       * Create a new personal bank interface for a given address.
       *
       * @param {string} address lower-level bank account address
       * @returns {Bank}
       */
      const getBankForAddress = address => {
        assert.typeof(address, 'string');
        if (addressToBank.has(address)) {
          return addressToBank.get(address);
        }

        /** @type {WeakMapStore<Brand, VirtualPurse>} */
        const brandToVPurse = makeScalarWeakMapStore('brand');

        /** @type {Bank} */
        const bank = Far('bank', {
          getAssetSubscription() {
            return assetSubscription;
          },
          async getPurse(brand) {
            if (brandToVPurse.has(brand)) {
              return brandToVPurse.get(brand);
            }

            const assetRecord = brandToAssetRecord.get(brand);
            if (!bankCall) {
              // Just emulate with a real purse.
              const purse = E(assetRecord.issuer).makeEmptyPurse();
              brandToVPurse.init(brand, purse);
              return purse;
            }

            const addressToUpdater = denomToAddressUpdater.get(
              assetRecord.denom,
            );

            /** @type {NotifierRecord<Amount>} */
            const { updater, notifier } = makeNotifierKit();
            /** @type {bigint} */
            let lastBalanceUpdate = -1n;
            /** @type {BalanceUpdater} */
            const balanceUpdater = Far(
              'balanceUpdater',
              (value, nonce = undefined) => {
                if (nonce !== undefined) {
                  const thisBalanceUpdate = BigInt(nonce);
                  if (thisBalanceUpdate <= lastBalanceUpdate) {
                    return;
                  }
                  lastBalanceUpdate = thisBalanceUpdate;
                }
                // Convert the string value to a bigint.
                const amt = AmountMath.make(brand, BigInt(value));
                updater.updateState(amt);
              },
            );

            // Get the initial balance.
            addressToUpdater.init(address, balanceUpdater);
            const balanceString = await bankCall({
              type: 'VBANK_GET_BALANCE',
              address,
              denom: assetRecord.denom,
            });
            balanceUpdater(balanceString);

            // Create and return the virtual purse.
            const vpc = makePurseController(
              bankCall,
              assetRecord.denom,
              brand,
              address,
              notifier,
              updateBalances,
            );
            const vpurse = makeVirtualPurse(vpc, assetRecord);
            brandToVPurse.init(brand, vpurse);
            return vpurse;
          },
        });
        addressToBank.init(address, bank);
        return bank;
      };

      return Far('bankManager', {
        /**
         * Returns assets as they are added to the bank.
         *
         * @returns {Subscription<AssetDescriptor>}
         */
        getAssetSubscription() {
          return harden(assetSubscription);
        },
        /**
         * @param {string} denom
         * @param {AssetIssuerKit} feeKit
         * @returns {import('@endo/far').EOnly<DepositFacet>}
         */
        getRewardDistributorDepositFacet(denom, feeKit) {
          if (!bankCall) {
            throw Error(`Bank doesn't implement reward collectors`);
          }

          /** @type {VirtualPurseController} */
          const feeVpc = harden({
            async *getBalances(_brand) {
              // Never resolve!
              yield new Promise(_ => {});
            },
            async pullAmount(_amount) {
              throw Error(`Cannot pull from reward distributor`);
            },
            async pushAmount(amount) {
              const value = AmountMath.getValue(feeKit.brand, amount);
              await bankCall({
                type: 'VBANK_GIVE_TO_REWARD_DISTRIBUTOR',
                denom,
                amount: `${value}`,
              });
            },
          });
          const vp = makeVirtualPurse(feeVpc, feeKit);
          return E(vp).getDepositFacet();
        },

        /**
         * Get the address of named module account.
         *
         * @param {string} moduleName
         * @returns {Promise<string | null>} address of named module account, or
         * null if unimplemented (no bankCall)
         */
        getModuleAccountAddress: async moduleName => {
          if (!bankCall) {
            return null;
          }

          return bankCall({
            type: 'VBANK_GET_MODULE_ACCOUNT_ADDRESS',
            moduleName,
          });
        },

        /**
         * Add an asset to the bank, and publish it to the subscriptions.
         * If nameAdmin is defined, update with denom to AssetInfo entry.
         *
         * Note that AssetInfo has the settled identity of the issuer,
         * not just a promise for it.
         *
         * @param {string} denom lower-level denomination string
         * @param {string} issuerName
         * @param {string} proposedName
         * @param {AssetIssuerKit & { payment?: ERef<Payment> }} kit ERTP issuer kit (mint, brand, issuer)
         */
        async addAsset(denom, issuerName, proposedName, kit) {
          assert.typeof(denom, 'string');
          assert.typeof(issuerName, 'string');
          assert.typeof(proposedName, 'string');

          const brand = await kit.brand;
          const assetKind = await E(kit.issuer).getAssetKind();
          assert.equal(
            assetKind,
            AssetKind.NAT,
            `Only fungible assets are allowed, not ${assetKind}`,
          );

          // Create an escrow purse for this asset, seeded with the payment.
          const escrowPurse = E(kit.issuer).makeEmptyPurse();
          const payment = await kit.payment;
          await (payment && E(escrowPurse).deposit(payment));

          const assetRecord = harden({
            escrowPurse,
            issuer: kit.issuer,
            mint: kit.mint,
            denom,
            brand,
          });
          brandToAssetRecord.init(brand, assetRecord);
          denomToAddressUpdater.init(denom, makeScalarMapStore('address'));
          assetPublication.updateState(
            harden({
              brand,
              denom,
              issuerName,
              issuer: kit.issuer,
              proposedName,
            }),
          );

          if (nameAdmin) {
            // publish settled issuer identity
            void Promise.all([kit.issuer, E(kit.brand).getDisplayInfo()]).then(
              ([issuer, displayInfo]) =>
                E(nameAdmin).update(
                  denom,
                  /** @type { AssetInfo } */ (
                    harden({
                      brand,
                      issuer,
                      issuerName,
                      denom,
                      proposedName,
                      displayInfo,
                    })
                  ),
                ),
            );
          }
        },
        getBankForAddress,
      });
    },
  });
}
