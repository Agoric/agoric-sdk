// @ts-check
import { assert, details as X } from '@agoric/assert';
import { amountMath, MathKind } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeNotifierKit, makeSubscriptionKit } from '@agoric/notifier';
import { makeStore } from '@agoric/store';

import { makeVirtualPurse } from './virtual-purse';

import '@agoric/notifier/exported';

/**
 * @typedef {import('./virtual-purse').VirtualPurseController} VirtualPurseController
 * @typedef {ReturnType<typeof makeVirtualPurse>} VirtualPurse
 */

/**
 * @param {(obj: any) => Promise<any>} bankCall
 * @param {string} denom
 * @param {Brand} brand
 * @param {string} address
 * @param {Notifier<Amount>} balanceNotifier
 * @returns {VirtualPurseController}
 */
const makePurseController = (
  bankCall,
  denom,
  brand,
  address,
  balanceNotifier,
) =>
  harden({
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
      const value = amountMath.getValue(amt, brand);
      return bankCall({
        type: 'VPURSE_GIVE',
        recipient: address,
        denom,
        amount: `${value}`,
      });
    },
    async pullAmount(amt) {
      const value = amountMath.getValue(amt, brand);
      return bankCall({
        type: 'VPURSE_GRAB',
        sender: address,
        denom,
        amount: `${value}`,
      });
    },
  });

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
     * @param {import('./bridge').BridgeManager} bridgeMgr
     */
    async makeBankManager(bridgeMgr) {
      const bankCall = obj => E(bridgeMgr).toBridge('bank', obj);

      /** @type {Store<Brand, AssetRecord>} */
      const brandToAssetRecord = makeStore('brand');
      /** @type {Store<string, Store<string, (amount: any) => void>>} */
      const denomToAddressUpdater = makeStore('denom');

      const handler = Far('bankHandler', {
        async fromBridge(_srcID, obj) {
          switch (obj.type) {
            case 'VPURSE_BALANCE_UPDATE': {
              for (const update of obj.updated) {
                try {
                  const { address, denom, amount: value } = update;
                  const addressToUpdater = denomToAddressUpdater.get(denom);
                  const updater = addressToUpdater.get(address);

                  updater(value);
                } catch (e) {
                  console.error('Unregistered update', update);
                }
              }
              break;
            }
            default:
              assert.fail(X`Unrecognized request ${obj.type}`);
          }
        },
      });

      await E(bridgeMgr).register('bank', handler);

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
        /**
         * Create a new personal bank interface for a given address.
         *
         * @param {string} address lower-level bank account address
         * @returns {Bank}
         */
        getBankForAddress(address) {
          assert.typeof(address, 'string');
          if (addressToBank.has(address)) {
            return addressToBank.get(address);
          }

          /** @type {Store<Brand, VirtualPurse>} */
          const brandToVPurse = makeStore('brand');

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
              const addressToUpdater = denomToAddressUpdater.get(
                assetRecord.denom,
              );

              /** @typedef {NotifierRecord<Amount>} */
              const { updater, notifier } = makeNotifierKit();
              const balanceUpdater = value => {
                // Convert the string value to a bigint.
                const amt = amountMath.make(BigInt(value), brand);
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
              );
              const vpurse = makeVirtualPurse(vpc, assetRecord);
              brandToVPurse.init(brand, vpurse);
              return vpurse;
            },
          });
          addressToBank.init(address, bank);
          return bank;
        },
      });
    },
  });
}
