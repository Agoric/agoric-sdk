// @ts-check
import { assert, details as X } from '@agoric/assert';
import { AmountMath, AssetKind } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { Nat } from '@agoric/nat';
import { makeSubscriptionKit } from '@agoric/notifier';
import { makePromiseKit } from '@agoric/promise-kit';
import { makeStore, makeWeakStore } from '@agoric/store';

import { makeVirtualPurse } from './virtual-purse.js';

import '@agoric/notifier/exported.js';
/**
 * @typedef {import('./virtual-purse').VirtualPurseController} VirtualPurseController
 * @typedef {ReturnType<typeof makeVirtualPurse>} VirtualPurse
 */

/**
 * @callback BalanceUpdater
 * @param {any} value
 */

/**
 * @typedef {Object} PurseControllerParams
 * @property {(obj: any) => Promise<any>} bankCall
 * @property {string} denom
 * @property {Brand} brand
 * @property {string} address
 * @property {(obj: any) => boolean} updateBalances
 * @property {(updater: BalanceUpdater) => void} registerBalanceUpdater
 * @property {() => Amount} getNotifierThresholdAmount
 */

/**
 * A generator that yields the latest balance of a virtual purse.
 *
 * @param {PurseControllerParams} param0
 */
const makeBalanceGenerator = ({
  bankCall,
  denom,
  brand,
  address,
  registerBalanceUpdater,
  getNotifierThresholdAmount,
}) => {
  const getNotifierThresholdValue = () => {
    const {
      brand: thresholdBrand,
      value: thresholdValue,
    } = getNotifierThresholdAmount();
    assert.equal(thresholdBrand, brand);
    assert.typeof(thresholdValue, 'bigint');
    return Nat(thresholdValue);
  };

  /** @type {PromiseRecord<Amount>} */
  let amountPK = makePromiseKit();

  let lastBalanceValue = -1n;

  /**
   * TODO: Use bankCall messages to declare high- and low- water marks, which
   * would either return a promise for the value now if the balance is already
   * out of range, or make a one-shot subscription that publishes via the
   * registered balance updater when it changes to be out of range.  Let them
   * race against each other.
   *
   * @param {bigint} value
   */
  const updateBalance = value => {
    // Notify if there's a change to zero, but only once.
    if (value !== 0n || lastBalanceValue === 0n) {
      const notifierThresholdValue = getNotifierThresholdValue();
      const lowWaterMark = lastBalanceValue - notifierThresholdValue;
      const highWaterMark = lastBalanceValue + notifierThresholdValue;

      if (lowWaterMark < value && value < highWaterMark) {
        // Within range, don't notify.
        return;
      }
    }

    amountPK.resolve(AmountMath.make(brand, value));
    lastBalanceValue = value;
  };

  const balanceUpdater = Far(`${denom} updater`, stringValue => {
    const value = BigInt(stringValue);
    updateBalance(value);
  });
  registerBalanceUpdater(balanceUpdater);

  /**
   * @yields {Amount}
   */
  async function* generateBalances() {
    // Get initial balance.
    bankCall({
      type: 'VBANK_GET_BALANCE',
      address,
      denom,
    }).then(balanceUpdater);

    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const amount = await amountPK.promise;
      // Immediately switch to the next promise.
      amountPK = makePromiseKit();
      yield amount;
    }
  }
  return generateBalances();
};

/**
 * @param {PurseControllerParams} opts
 * @returns {VirtualPurseController}
 */
const makePurseController = opts => {
  const { bankCall, address, brand, denom, updateBalances } = opts;

  const balancesIterable = makeBalanceGenerator(opts);

  return harden({
    getBalances(b) {
      assert.equal(b, brand);
      return balancesIterable;
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
 * @typedef {Object} AssetIssuerKit
 * @property {Mint} [mint]
 * @property {Issuer} issuer
 * @property {Brand} brand
 * @property {Amount} [notifierThresholdAmount]
 */

/**
 * @typedef {AssetIssuerKit & {
 *   denom: string,
 *   escrowPurse?: ERef<Purse>,
 *   notifierThresholdAmount: Amount
 * }} AssetRecord
 */

/**
 * @typedef {Object} Bank
 * @property {() => Subscription<AssetDescriptor>} getAssetSubscription Returns
 * assets as they are added to the bank
 * @property {(brand: Brand) => VirtualPurse} getPurse Find any existing vpurse
 * (keyed by address and brand) or create a new one.
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
          case 'VBANK_BALANCE_UPDATE': {
            for (const update of obj.updated) {
              const { address, denom, amount: value } = update;
              if (denomToAddressUpdater.has(denom)) {
                const addressToUpdater = denomToAddressUpdater.get(denom);
                if (addressToUpdater.has(address)) {
                  const updater = addressToUpdater.get(address);
                  updater(value);
                }
              }
            }
            return true;
          }
          default: {
            return false;
          }
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

            // Create and return the virtual purse.
            const vpc = makePurseController({
              bankCall,
              getNotifierThresholdAmount: () =>
                brandToAssetRecord.get(brand).notifierThresholdAmount,
              denom: assetRecord.denom,
              brand,
              address,
              updateBalances,
              registerBalanceUpdater: updater =>
                addressToUpdater.init(address, updater),
            });
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
         * @returns {import('@agoric/eventual-send').EOnly<DepositFacet>}
         */
        getFeeCollectorDepositFacet(denom, feeKit) {
          if (!bankCall) {
            throw Error(`Bank doesn't implement fee collectors`);
          }

          /** @type {VirtualPurseController} */
          const feeVpc = harden({
            async *getBalances(_brand) {
              // Never resolve!
              yield new Promise(_ => {});
            },
            async pullAmount(_amount) {
              throw Error(`Cannot pull from fee collector`);
            },
            async pushAmount(amount) {
              const value = AmountMath.getValue(feeKit.brand, amount);
              await bankCall({
                type: 'VBANK_GIVE_TO_FEE_COLLECTOR',
                denom,
                amount: `${value}`,
              });
            },
          });
          const vp = makeVirtualPurse(feeVpc, feeKit);
          return E(vp).getDepositFacet();
        },

        /**
         * Add an asset to the bank, and publish it to the subscriptions.
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

          /** @type {AssetRecord} */
          const assetRecord = harden({
            notifierThresholdAmount: AmountMath.makeEmpty(brand),
            escrowPurse,
            issuer: kit.issuer,
            mint: kit.mint,
            denom,
            brand,
          });
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
         * Change the threshold amount used to decide the low and high
         * watermarks for a given asset (which has already been added via
         * `addAsset`).
         *
         * NOTE: We would ideally trigger balance updates for every vpurse that
         * matches the new threshold.  Unfortunately, that would expose our vat
         * to denial-of-service in the form of either a) too many callbacks in
         * one crank, or equivalently, b) a promise resolution that triggers too
         * many callbacks.
         *
         * @param {Amount} thresholdAmount
         */
        setNotifierThresholdAmount: thresholdAmount => {
          const { brand, value } = thresholdAmount;
          const assetRecord = brandToAssetRecord.get(brand);
          assert.typeof(value, 'bigint');

          const notifierThresholdAmount = AmountMath.make(brand, Nat(value));

          const newAssetRecord = harden({
            ...assetRecord,
            notifierThresholdAmount,
          });
          brandToAssetRecord.set(brand, newAssetRecord);
        },
        getBankForAddress,
      });
    },
  });
}
