// @ts-check
import { Fail, X, q } from '@endo/errors';
import { E } from '@endo/far';

import { AmountMath } from '@agoric/ertp';
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { UnguardedHelperI } from '@agoric/internal/src/typeGuards.js';
import { isUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';
import {
  observeIteration,
  observeNotifier,
  subscribeEach,
} from '@agoric/notifier';
import { makeAtomicProvider, makeScalarMapStore } from '@agoric/store';
import { M, makeScalarBigSetStore } from '@agoric/vat-data';
import {
  PublicTopicShape,
  makeRecorderTopic,
} from '@agoric/zoe/src/contractSupport/topics.js';
import { PowerFlags } from './walletFlags.js';

/**
 * @import {EReturn} from '@endo/far';
 * @import {BridgeMessage} from '@agoric/cosmic-swingset/src/types.js';
 * @import {Amount, Brand, Payment, Purse} from '@agoric/ertp';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {ZCF} from '@agoric/zoe';
 * @import {ERef} from '@endo/far'
 * @import {Bank, BankManager} from '@agoric/vats/src/vat-bank.js'
 * @import {MapStore, SetStore} from '@agoric/store';
 */

const trace = makeTracer('ProvPool');

const FIRST_UPPER_KEYWORD = /^[A-Z][a-zA-Z0-9_$]*$/;
// see https://github.com/Agoric/agoric-sdk/issues/8238
const FIRST_LOWER_NEAR_KEYWORD = /^[a-z][a-zA-Z0-9_$]*$/;

// XXX when inferred, error TS2742: cannot be named without a reference to '../../../node_modules/@endo/exo/src/get-interface.js'. This is likely not portable. A type annotation is necessary.
/**
 * @typedef {{
 *   machine: any;
 *   helper: any;
 *   forHandler: any;
 *   public: any;
 * }} ProvisionPoolKit
 */

/**
 * @typedef {object} ProvisionPoolKitReferences
 * @property {ERef<BankManager>} bankManager
 * @property {ERef<import('@agoric/vats').NameAdmin>} namesByAddressAdmin
 * @property {ERef<
 *   import('@agoric/vats/src/core/startWalletFactory.js').WalletFactoryStartResult['creatorFacet']
 * >} walletFactory
 */

/**
 * @typedef {object} MetricsNotification Metrics naming scheme is that nouns are
 *   present values and past-participles are accumulative.
 * @property {bigint} walletsProvisioned count of new wallets provisioned
 * @property {Amount<'nat'>} totalMintedProvided running sum of Minted provided
 *   to new wallets
 * @property {Amount<'nat'>} totalMintedConverted running sum of Minted ever
 *   received by the contract
 */

/**
 * Given attenuated access to the funding purse, handle requests to provision
 * smart wallets.
 *
 * @param {import('@agoric/zone').Zone} zone
 */
export const prepareBridgeProvisionTool = zone =>
  zone.exoClass(
    'smartWalletProvisioningHandler',
    M.interface('ProvisionBridgeHandlerMaker', {
      fromBridge: M.callWhen(M.record()).returns(),
    }),
    /**
     * @param {ERef<BankManager>} bankManager
     * @param {ERef<
     *   EReturn<
     *     import('@agoric/smart-wallet/src/walletFactory.js').start
     *   >['creatorFacet']
     * >} walletFactory
     * @param {ERef<import('@agoric/vats').NameAdmin>} namesByAddressAdmin
     * @param {ProvisionPoolKit['forHandler']} forHandler
     */
    (bankManager, walletFactory, namesByAddressAdmin, forHandler) => ({
      bankManager,
      walletFactory,
      namesByAddressAdmin,
      forHandler,
    }),
    {
      /** @param {BridgeMessage} obj */
      async fromBridge(obj) {
        if (obj.type !== 'PLEASE_PROVISION')
          throw Fail`Unrecognized request ${obj.type}`;
        trace('PLEASE_PROVISION', obj);
        const { address, powerFlags } = obj;
        // XXX expects powerFlags to be an array, but if it's a string then
        // this allows a string that has 'SMART_WALLET' in it.
        powerFlags.includes(PowerFlags.SMART_WALLET) ||
          Fail`missing SMART_WALLET in powerFlags`;

        const { bankManager, walletFactory, namesByAddressAdmin, forHandler } =
          this.state;

        const bank = E(bankManager).getBankForAddress(address);
        // only proceed if we can provide funds
        await forHandler.sendInitialPayment(bank);

        const [_, created] = await E(walletFactory).provideSmartWallet(
          address,
          bank,
          namesByAddressAdmin,
        );
        if (created) {
          forHandler.onProvisioned();
        }
        trace(created ? 'provisioned' : 're-provisioned', address);
      },
    },
  );

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {{
 *   makeRecorderKit: import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit;
 *   params: any;
 *   poolBank: import('@endo/far').ERef<Bank>;
 *   zcf: ZCF;
 *   makeBridgeProvisionTool: ReturnType<typeof prepareBridgeProvisionTool>;
 * }} powers
 */
export const prepareProvisionPoolKit = (
  zone,
  { makeRecorderKit, params, poolBank, zcf, makeBridgeProvisionTool },
) => {
  const ephemeralPurses = makeScalarMapStore('fundingPurseForBrand');
  const purseProvider = makeAtomicProvider(ephemeralPurses);
  const getFundingPurseForBrand = async poolBrand => {
    await null;
    try {
      const purse = await purseProvider.provideAsync(poolBrand, brand =>
        E(poolBank).getPurse(brand),
      );
      return purse;
    } catch (err) {
      trace(`🚨 could not get purse for brand ${poolBrand}`, err);
      throw err;
    }
  };

  const makeProvisionPoolKitInternal = zone.exoClassKit(
    'ProvisionPoolKit',
    {
      machine: M.interface('ProvisionPoolKit machine', {
        addRevivableAddresses: M.call(M.arrayOf(M.string())).returns(),
        getWalletReviver: M.call().returns(
          M.remotable('ProvisionPoolKit wallet reviver'),
        ),
        setReferences: M.callWhen({
          bankManager: M.eref(M.remotable('bankManager')),
          namesByAddressAdmin: M.eref(M.remotable('nameAdmin')),
          walletFactory: M.eref(M.remotable('walletFactory')),
        }).returns(),
        makeHandler: M.call().returns(M.remotable('BridgeHandler')),
      }),
      walletReviver: M.interface('ProvisionPoolKit wallet reviver', {
        reviveWallet: M.callWhen(M.string()).returns(
          M.remotable('SmartWallet'),
        ),
        ackWallet: M.call(M.string()).returns(M.boolean()),
      }),
      helper: UnguardedHelperI,
      forHandler: UnguardedHelperI,
      public: M.interface('ProvisionPoolKit public', {
        getPublicTopics: M.call().returns({ metrics: PublicTopicShape }),
      }),
    },
    /**
     * @param {object} opts
     * @param {Purse<'nat'>} [opts.fundPurse]
     * @param {Brand<'nat'>} opts.poolBrand
     * @param {StorageNode} opts.metricsNode
     */
    ({ fundPurse, poolBrand, metricsNode }) => {
      /** @type {import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<MetricsNotification>} */
      const metricsRecorderKit = makeRecorderKit(metricsNode);

      const revivableAddresses = makeScalarBigSetStore('revivableAddresses', {
        durable: true,
        keyShape: M.string(),
      });

      /**
       * to be set by `setReferences`
       *
       * @type {Partial<ProvisionPoolKitReferences>}
       */
      const references = {
        bankManager: undefined,
        namesByAddressAdmin: undefined,
        walletFactory: undefined,
      };

      return {
        fundPurse,
        metricsRecorderKit,
        poolBrand,
        walletsProvisioned: 0n,
        totalMintedProvided: AmountMath.makeEmpty(poolBrand),
        totalMintedConverted: AmountMath.makeEmpty(poolBrand),
        revivableAddresses,
        ...references,
      };
    },
    {
      // aka "limitedCreatorFacet"
      machine: {
        /** @param {string[]} oldAddresses */
        addRevivableAddresses(oldAddresses) {
          trace('revivableAddresses count', oldAddresses.length);
          this.state.revivableAddresses.addAll(oldAddresses);
        },
        getWalletReviver() {
          return this.facets.walletReviver;
        },
        /** @param {ProvisionPoolKitReferences} erefs */
        async setReferences(erefs) {
          const { bankManager, namesByAddressAdmin, walletFactory } = erefs;
          const obj = harden({
            bankManager,
            namesByAddressAdmin,
            walletFactory,
          });
          const refs = await deeplyFulfilledObject(obj);
          Object.assign(this.state, refs);
        },
        /** @returns {import('@agoric/vats').BridgeHandler} */
        makeHandler() {
          const { bankManager, namesByAddressAdmin, walletFactory } =
            this.state;
          if (!bankManager || !namesByAddressAdmin || !walletFactory) {
            throw Fail`must set references before handling requests`;
          }

          const { forHandler } = this.facets;

          const provisionHandler = makeBridgeProvisionTool(
            bankManager,
            walletFactory,
            namesByAddressAdmin,
            forHandler,
          );

          return provisionHandler;
        },
      },
      walletReviver: {
        /** @param {string} address */
        async reviveWallet(address) {
          const {
            revivableAddresses,
            bankManager,
            namesByAddressAdmin,
            walletFactory,
          } = this.state;
          if (!bankManager || !namesByAddressAdmin || !walletFactory) {
            throw Fail`must set references before handling requests`;
          }
          revivableAddresses.has(address) ||
            Fail`non-revivable address ${address}`;
          const bank = E(bankManager).getBankForAddress(address);
          const [wallet, _created] = await E(walletFactory).provideSmartWallet(
            address,
            bank,
            namesByAddressAdmin,
          );
          return wallet;
        },
        /**
         * @param {string} address
         * @returns {boolean} isRevive
         */
        ackWallet(address) {
          const { revivableAddresses } = this.state;
          if (!revivableAddresses.has(address)) {
            return false;
          }
          revivableAddresses.delete(address);
          return true;
        },
      },
      helper: {
        publishMetrics() {
          const {
            metricsRecorderKit,
            walletsProvisioned,
            totalMintedConverted,
            totalMintedProvided,
          } = this.state;
          void metricsRecorderKit.recorder.write(
            harden({
              walletsProvisioned,
              totalMintedProvided,
              totalMintedConverted,
            }),
          );
        },
        onTrade(converted) {
          const { state, facets } = this;
          state.totalMintedConverted = AmountMath.add(
            state.totalMintedConverted,
            converted,
          );
          facets.helper.publishMetrics();
        },
        onSendFunds(provided) {
          const { state, facets } = this;
          state.totalMintedProvided = AmountMath.add(
            state.totalMintedProvided,
            provided,
          );
          facets.helper.publishMetrics();
        },
        /**
         * @param {ERef<Purse>} exchangePurse
         * @param {ERef<Brand>} brand
         */
        watchCurrentAmount(exchangePurse, brand) {
          const { helper } = this.facets;
          void observeNotifier(E(exchangePurse).getCurrentAmountNotifier(), {
            updateState: async amount => {
              trace('provisionPool balance update', amount);
            },
            fail: reason => {
              if (isUpgradeDisconnection(reason)) {
                void helper.watchCurrentAmount(exchangePurse, brand);
              } else {
                console.error(reason);
              }
            },
          });
        },
        watchAssetSubscription() {
          const { facets } = this;
          const { helper } = facets;

          /** @param {import('@agoric/vats/src/vat-bank.js').AssetDescriptor} desc */
          const repairDesc = desc => {
            if (desc.issuerName.match(FIRST_UPPER_KEYWORD)) {
              trace(`Saving Issuer ${desc.issuerName}`);
              return desc;
            } else if (desc.issuerName.match(FIRST_LOWER_NEAR_KEYWORD)) {
              const bad = desc.issuerName;
              const goodName = bad.replace(bad[0], bad[0].toUpperCase());

              trace(
                `Saving Issuer ${desc.issuerName} with repaired keyword ${goodName}`,
              );
              return { ...desc, issuerName: goodName };
            } else {
              console.error(
                `unable to save issuer with illegal keyword: ${desc.issuerName}`,
              );
              return undefined;
            }
          };

          return observeIteration(
            subscribeEach(E(poolBank).getAssetSubscription()),
            {
              updateState: async desc => {
                await null;
                const issuer = zcf.getTerms().issuers[desc.issuerName];
                if (issuer === desc.issuer) {
                  trace('provisionPool re-notified of known asset', desc.brand);
                } else {
                  const goodDesc = repairDesc(desc);
                  if (goodDesc) {
                    await zcf.saveIssuer(goodDesc.issuer, goodDesc.issuerName);
                  } else {
                    console.error(
                      `unable to save issuer with illegal keyword: ${desc.issuerName}`,
                    );
                  }
                }

                /** @type {ERef<Purse>} */
                const exchangePurse = E(poolBank).getPurse(desc.brand);
                helper.watchCurrentAmount(exchangePurse, desc.brand);
              },
              fail: _reason => {
                void helper.watchAssetSubscription();
              },
            },
          );
        },
        /**
         * @param {Brand<'nat'>} poolBrand
         * @param {object} [options]
         * @param {MetricsNotification} [options.metrics]
         */
        start(poolBrand, { metrics } = {}) {
          const { facets, state } = this;
          const { helper } = facets;
          const lastPoolBrand = state.poolBrand;

          // The PerAccountInitialAmount param must use the correct brand for
          // this incarnation.
          AmountMath.coerce(poolBrand, params.getPerAccountInitialAmount());

          // Restore old metrics.
          if (metrics) {
            const {
              walletsProvisioned,
              totalMintedProvided,
              totalMintedConverted,
            } = metrics;
            assert.typeof(walletsProvisioned, 'bigint');
            AmountMath.coerce(lastPoolBrand, totalMintedProvided);
            AmountMath.coerce(lastPoolBrand, totalMintedConverted);
            Object.assign(state, {
              walletsProvisioned,
              totalMintedProvided,
              totalMintedConverted,
            });
            helper.publishMetrics();
          }

          // Update as needed when `poolBrand` changes.
          if (poolBrand !== lastPoolBrand) {
            state.poolBrand = poolBrand;
            state.fundPurse = undefined;
            void getFundingPurseForBrand(poolBrand).then(purse =>
              helper.updateFundPurse(purse, poolBrand),
            );
            state.totalMintedProvided = AmountMath.makeEmpty(poolBrand);
            state.totalMintedConverted = AmountMath.makeEmpty(poolBrand);
            helper.publishMetrics();
          }

          void helper.watchAssetSubscription();
        },
        /**
         * @param {Purse<'nat'>} purse
         * @param {Brand<'nat'>} brand
         */
        updateFundPurse(purse, brand) {
          const { state } = this;
          if (brand !== state.poolBrand || state.fundPurse) return;
          state.fundPurse = purse;
        },
      },
      forHandler: {
        onProvisioned() {
          const { facets, state } = this;
          state.walletsProvisioned += 1n;
          facets.helper.publishMetrics();
        },
        /** @param {ERef<Bank>} destBank */
        async sendInitialPayment(destBank) {
          await null;
          const { facets, state } = this;
          const { helper } = facets;
          const {
            poolBrand,
            fundPurse = await getFundingPurseForBrand(poolBrand),
          } = state;
          const perAccountInitialAmount = /** @type {Amount<'nat'>} */ (
            params.getPerAccountInitialAmount()
          );
          trace('sendInitialPayment withdrawing', perAccountInitialAmount);
          const initialPmt = await E(fundPurse).withdraw(
            perAccountInitialAmount,
          );

          const destPurse = E(destBank).getPurse(poolBrand);
          return E(destPurse)
            .deposit(initialPmt)
            .then(amt => {
              helper.onSendFunds(perAccountInitialAmount);
              trace('provisionPool sent', amt);
            })
            .catch(reason => {
              console.error(X`initial deposit failed: ${q(reason)}`);
              void E(fundPurse).deposit(initialPmt);
              throw reason;
            });
        },
      },
      public: {
        getPublicTopics() {
          return {
            metrics: makeRecorderTopic(
              'Provision Pool metrics',
              this.state.metricsRecorderKit,
            ),
          };
        },
      },
    },
    {
      finish: ({ facets }) => {
        facets.helper.publishMetrics();
      },
    },
  );

  /**
   * Prepare synchronous values before passing to real Exo maker
   *
   * @param {object} opts
   * @param {Brand<'nat'>} opts.poolBrand
   * @param {ERef<StorageNode>} opts.storageNode
   * @returns {Promise<ProvisionPoolKit>}
   */
  const makeProvisionPoolKit = async ({ poolBrand, storageNode }) => {
    const fundPurse = await getFundingPurseForBrand(poolBrand);
    const metricsNode = await E(storageNode).makeChildNode('metrics');

    return makeProvisionPoolKitInternal({
      fundPurse,
      poolBrand,
      metricsNode,
    });
  };

  return makeProvisionPoolKit;
};
