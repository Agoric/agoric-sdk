// @ts-check
import { assert, details as X } from '@agoric/assert';
import { amountMath, MathKind } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeNotifierKit, makeSubscriptionKit } from '@agoric/notifier';
import { makeStore, makeWeakStore } from '@agoric/store';

import { makeVirtualPurse } from './virtual-purse';

import '@agoric/notifier/exported';

/**
 * @typedef {import('./virtual-purse').VirtualPurseController} VirtualPurseController
 * @typedef {ReturnType<typeof makeVirtualPurse>} VirtualPurse
 */

/**
 * @callback BalanceUpdater
 * @param {any} value
 * @param {any} [nonce]
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
      while (updateRecord.updateCount) {
        yield updateRecord.value;
        // eslint-disable-next-line no-await-in-loop
        updateRecord = await balanceNotifier.getUpdateSince(
          updateRecord.updateCount,
        );
      }
      return updateRecord.value;
    },
    async pushAmount(amt) {
      const value = amountMath.getValue(brand, amt);
      const update = await bankCall({
        type: 'VPURSE_GIVE',
        recipient: address,
        denom,
        amount: `${value}`,
      });
      updateBalances(update);
    },
    async pullAmount(amt) {
      const value = amountMath.getValue(brand, amt);
      const update = await bankCall({
        type: 'VPURSE_GRAB',
        sender: address,
        denom,
        amount: `${value}`,
      });
      updateBalances(update);
    },
  });
};

/**
 * @typedef {Object} AssetIssuerKit
 * @property {Mint} [mint]
 * @property {Issuer} issuer
 * @property {Brand} brand
 */

/**
 * @typedef {AssetIssuerKit & { denom: string }} AssetRecord
 */

/**
 * @typedef {Object} Bank
 * @property {() => Subscription<AssetDescriptor>}
 * getAssetSubscription Returns assets as they are added to the bank
 * @property {(brand: Brand) => VirtualPurse} getPurse Find any existing vpurse (keyed by address and brand) or create a
 * new one.
 */

export function buildRootObject(_vatPowers) {
  return Far('bankMaker', {
    /**
     * @param {import('./bridge').BridgeManager} [bankBridgeManager] a bridge
     * manager for the "remote" bank (such as on cosmos-sdk).  If not supplied
     * (such as on sim-chain), we just use local purses.
     */
    async makeBankManager(bankBridgeManager = undefined) {
      /** @type {WeakStore<Brand, AssetRecord>} */
      const brandToAssetRecord = makeWeakStore('brand');

      /** @type {Store<string, Store<string, BalanceUpdater>>} */
      const denomToAddressUpdater = makeStore('denom');

      const updateBalances = obj => {
        switch (obj && obj.type) {
          case 'VPURSE_BALANCE_UPDATE': {
            for (const update of obj.updated) {
              try {
                const { address, denom, amount: value } = update;
                const addressToUpdater = denomToAddressUpdater.get(denom);
                const updater = addressToUpdater.get(address);

                updater(value, obj.nonce);
                console.error('Successful update', update);
              } catch (e) {
                console.error('Unregistered update', update);
              }
            }
            return true;
          }
          default:
            return false;
        }
      };

      /**
       * @param {import('./bridge').BridgeManager} bankBridgeMgr
       */
      async function makeBankCaller(bankBridgeMgr) {
        // We need to synchronise with the remote bank.
        const handler = Far('bankHandler', {
          async fromBridge(_srcID, obj) {
            if (!updateBalances(obj)) {
              assert.fail(X`Unrecognized request ${obj && obj.type}`);
            }
          },
        });

        await E(bankBridgeMgr).register('bank', handler);

        // We can only downcall to the bank if there exists a bridge manager.
        return obj => E(bankBridgeMgr).toBridge('bank', obj);
      }

      // We do the logic here if the bridge manager is available.  Otherwise,
      // the bank is not "remote" (such as on sim-chain), so we just use
      // immediate purses instead of virtual ones.
      const bankCall = await (bankBridgeManager
        ? makeBankCaller(bankBridgeManager)
        : undefined);

      /**
       * @typedef {Object} AssetDescriptor
       * @property {Brand} brand
       * @property {Issuer} issuer
       * @property {string} issuerName
       * @property {string} denom
       * @property {string} proposedName
       */
      /** @type {SubscriptionRecord<AssetDescriptor>} */
      const {
        subscription: assetSubscription,
        publication: assetPublication,
      } = makeSubscriptionKit();

      /** @type {Store<string, Bank>} */
      const addressToBank = makeStore('address');

      /** @type {NotifierRecord<string[]>} */
      const {
        notifier: accountsNotifier,
        updater: accountsUpdater,
      } = makeNotifierKit([...addressToBank.keys()]);

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

        /** @type {WeakStore<Brand, VirtualPurse>} */
        const brandToVPurse = makeWeakStore('brand');

        /** @type {Bank} */
        const bank = Far('bank', {
          getAssetSubscription() {
            return harden(assetSubscription);
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
            const balanceUpdater = (value, nonce = undefined) => {
              if (nonce !== undefined) {
                const thisBalanceUpdate = BigInt(nonce);
                if (thisBalanceUpdate <= lastBalanceUpdate) {
                  return;
                }
                lastBalanceUpdate = thisBalanceUpdate;
              }
              // Convert the string value to a bigint.
              const amt = amountMath.make(brand, BigInt(value));
              updater.updateState(amt);
            };

            // Get the initial balance.
            addressToUpdater.init(address, balanceUpdater);
            const balanceString = await bankCall({
              type: 'VPURSE_GET_BALANCE',
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
        accountsUpdater.updateState([...addressToBank.keys()]);
        return bank;
      };

      const bankDepositFacet = Far('bankDepositFacet', {
        getAccountsNotifier() {
          return accountsNotifier;
        },
        /**
         * Send many independent deposits, all of the same brand. If any of them
         * fail, then you should reclaim the corresponding payments since they
         * didn't get deposited.
         *
         * @param {Brand} brand
         * @param {Array<string>} accounts
         * @param {Array<Payment>} payments
         * @returns {Promise<PromiseSettledResult<Amount>[]>}
         */
        depositMultiple(brand, accounts, payments) {
          /**
           * @param {string} account
           * @param {Payment} payment
           */
          const doDeposit = (account, payment) => {
            // We can get the alleged brand, because the purse we send it to
            // will do the proper verification as part of deposit.
            const bank = getBankForAddress(account);
            const purse = bank.getPurse(brand);
            return E(purse).deposit(payment);
          };

          // We want just a regular iterable that yields deposit promises.
          function* generateDepositPromises() {
            const max = Math.max(accounts.length, payments.length);
            for (let i = 0; i < max; i += 1) {
              // Create a deposit promise.
              yield doDeposit(accounts[i], payments[i]);
            }
          }

          // We wait for all deposits to settle so that the whole batch
          // completes, even if there are failures with individual accounts,
          // payments, or deposits.
          return Promise.allSettled(generateDepositPromises());
        },
      });

      return Far('bankManager', {
        /**
         * Returns assets as they are added to the bank.
         *
         * @returns {Subscription<AssetDescriptor>}
         */
        getAssetSubscription() {
          return harden(assetSubscription);
        },
        getDepositFacet() {
          return bankDepositFacet;
        },
        /**
         * Add an asset to the bank, and publish it to the subscriptions.
         *
         * @param {string} denom lower-level denomination string
         * @param {string} issuerName
         * @param {string} proposedName
         * @param {AssetIssuerKit} kit ERTP issuer kit (mint, brand, issuer)
         */
        async addAsset(denom, issuerName, proposedName, kit) {
          assert.typeof(denom, 'string');
          assert.typeof(issuerName, 'string');
          assert.typeof(proposedName, 'string');

          const brand = await kit.brand;
          const mathKind = await E(kit.issuer).getAmountMathKind();
          assert.equal(
            mathKind,
            MathKind.NAT,
            `Only fungible assets are allowed, not ${mathKind}`,
          );

          const assetRecord = harden({ ...kit, denom, brand });
          brandToAssetRecord.init(brand, assetRecord);
          denomToAddressUpdater.init(denom, makeStore('address'));
          assetPublication.updateState(
            harden({
              brand,
              denom,
              issuerName,
              issuer: kit.issuer,
              proposedName,
            }),
          );
        },
        getBankForAddress,
      });
    },
  });
}
