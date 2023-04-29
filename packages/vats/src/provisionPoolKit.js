// @ts-check
import { AmountMath, BrandShape } from '@agoric/ertp';
import { UnguardedHelperI } from '@agoric/inter-protocol/src/typeGuards.js';
import { observeIteration, observeNotifier } from '@agoric/notifier';
import { M, makeScalarBigMapStore, prepareExoClassKit } from '@agoric/vat-data';
import {
  makeRecorderTopic,
  PublicTopicShape,
} from '@agoric/zoe/src/contractSupport/topics.js';
import { InstanceHandleShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import { Far } from '@endo/marshal';
import { PowerFlags } from './walletFlags.js';

const { details: X, quote: q } = assert;

/** @typedef {import('@agoric/zoe/src/zoeService/utils').Instance<import('@agoric/inter-protocol/src/psm/psm.js').prepare>} PsmInstance */

/**
 * @typedef {object} MetricsNotification
 * Metrics naming scheme is that nouns are present values and past-participles
 * are accumulative.
 *
 * @property {bigint} walletsProvisioned  count of new wallets provisioned
 * @property {Amount<'nat'>} totalMintedProvided  running sum of Minted provided to new wallets
 * @property {Amount<'nat'>} totalMintedConverted  running sum of Minted
 * ever received by the contract from PSM
 */

/**
 * Given attenuated access to the funding purse,
 * handle requests to provision smart wallets.
 *
 * @param {(depositBank: ERef<Bank>) => Promise<void>} sendInitialPayment
 * @param {() => void} onProvisioned
 * @typedef {import('./vat-bank.js').Bank} Bank
 */
export const makeBridgeProvisionTool = (sendInitialPayment, onProvisioned) => {
  /**
   * @param {{
   *   bankManager: ERef<BankManager>,
   *   namesByAddressAdmin: ERef<import('@agoric/vats').NameAdmin>,
   *   walletFactory: ERef<import('@agoric/vats/src/core/startWalletFactory').WalletFactoryStartResult['creatorFacet']>
   * }} io
   */
  const makeHandler = ({ bankManager, namesByAddressAdmin, walletFactory }) =>
    Far('provisioningHandler', {
      fromBridge: async obj => {
        assert.equal(
          obj.type,
          'PLEASE_PROVISION',
          X`Unrecognized request ${obj.type}`,
        );
        console.info('PLEASE_PROVISION', obj);
        const { address, powerFlags } = obj;
        assert(
          powerFlags.includes(PowerFlags.SMART_WALLET),
          'missing SMART_WALLET in powerFlags',
        );

        const bank = E(bankManager).getBankForAddress(address);
        await sendInitialPayment(bank);
        // only proceed  if we can provide funds

        const [_, created] = await E(walletFactory).provideSmartWallet(
          address,
          bank,
          namesByAddressAdmin,
        );
        if (created) {
          onProvisioned();
        }
        console.info(created ? 'provisioned' : 're-provisioned', address);
      },
    });
  return makeHandler;
};

/**
 *
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {{
 * makeRecorderKit: import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit,
 * params: *,
 * poolBank: import('@endo/far').ERef<Bank>,
 * zcf: ZCF}} powers
 */
export const prepareProvisionPoolKit = (
  baggage,
  { makeRecorderKit, params, poolBank, zcf },
) => {
  const zoe = zcf.getZoeService();

  const makeProvisionPoolKitInternal = prepareExoClassKit(
    baggage,
    'ProvisionPoolKit',
    {
      machine: M.interface('ProvisionPoolKit machine', {
        makeHandler: M.call({
          bankManager: M.any(),
          namesByAddressAdmin: M.any(),
          walletFactory: M.any(),
        }).returns(M.remotable('BridgeHandler')),
        initPSM: M.call(BrandShape, InstanceHandleShape).returns(),
      }),
      helper: UnguardedHelperI,
      public: M.interface('ProvisionPoolKit public', {
        getPublicTopics: M.call().returns({ metrics: PublicTopicShape }),
      }),
    },
    /**
     * @param {object} opts
     * @param {Purse<'nat'>} opts.fundPurse
     * @param {Brand} opts.poolBrand
     * @param {StorageNode} opts.storageNode
     */
    ({ fundPurse, poolBrand, storageNode }) => {
      /** @type {import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<MetricsNotification>} */
      const metricsRecorderKit = makeRecorderKit(storageNode);

      /** @type {MapStore<Brand, PsmInstance>} */
      const brandToPSM = makeScalarBigMapStore('brandToPSM', { durable: true });

      return {
        brandToPSM,
        fundPurse,
        metricsRecorderKit,
        poolBrand,
        walletsProvisioned: 0n,
        totalMintedProvided: AmountMath.makeEmpty(poolBrand),
        totalMintedConverted: AmountMath.makeEmpty(poolBrand),
      };
    },
    {
      // aka "limitedCreatorFacet"
      machine: {
        /**
         * @param {{
         *   bankManager: *,
         *   namesByAddressAdmin: *,
         *   walletFactory: *,
         * }} opts
         */
        makeHandler(opts) {
          const {
            facets: { helper },
          } = this;
          // a bit obtuse but leave for backwards compatibility with tests
          const innerMake = makeBridgeProvisionTool(
            bank => helper.sendInitialPayment(bank),
            () => helper.onProvisioned(),
          );
          return innerMake(opts);
        },
        /**
         *
         * @param {Brand} brand
         * @param {PsmInstance} instance
         */
        initPSM(brand, instance) {
          const { brandToPSM } = this.state;
          brandToPSM.init(brand, instance);
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
        onProvisioned() {
          const { state, facets } = this;
          state.walletsProvisioned += 1n;
          facets.helper.publishMetrics();
        },
        /**
         *
         * @param {ERef<Bank>} destBank
         */
        async sendInitialPayment(destBank) {
          const {
            facets: { helper },
            state: { fundPurse, poolBrand },
          } = this;
          const perAccountInitialAmount = /** @type {Amount<'nat'>} */ (
            params.getPerAccountInitialAmount()
          );
          const initialPmt = await E(fundPurse).withdraw(
            perAccountInitialAmount,
          );

          const destPurse = E(destBank).getPurse(poolBrand);
          return E(destPurse)
            .deposit(initialPmt)
            .then(amt => {
              helper.onSendFunds(perAccountInitialAmount);
              console.log('provisionPool sent', amt);
            })
            .catch(reason => {
              console.error(X`initial deposit failed: ${q(reason)}`);
              void E(fundPurse).deposit(initialPmt);
              throw reason;
            });
        },
        start() {
          const {
            state: { brandToPSM, poolBrand },
            facets: { helper },
          } = this;

          // Must match. poolBrand is from durable state and the param is from
          // the contract, so it technically can change between incarnations.
          // That would be a severe bug.
          AmountMath.coerce(poolBrand, params.getPerAccountInitialAmount());

          void observeIteration(E(poolBank).getAssetSubscription(), {
            updateState: async desc => {
              console.log('provisionPool notified of new asset', desc.brand);
              await zcf.saveIssuer(desc.issuer, desc.issuerName);
              /** @type {ERef<Purse>} */
              // @ts-expect-error vbank purse is close enough for our use.
              const exchangePurse = E(poolBank).getPurse(desc.brand);
              void observeNotifier(
                E(exchangePurse).getCurrentAmountNotifier(),
                {
                  updateState: async amount => {
                    console.log('provisionPool balance update', amount);
                    if (
                      AmountMath.isEmpty(amount) ||
                      amount.brand === poolBrand
                    ) {
                      return;
                    }
                    if (!brandToPSM.has(desc.brand)) {
                      console.error(
                        'funds arrived but no PSM instance',
                        desc.brand,
                      );
                      return;
                    }
                    const instance = brandToPSM.get(desc.brand);
                    const payment = E(exchangePurse).withdraw(amount);
                    await helper
                      .swap(payment, amount, instance)
                      .catch(async reason => {
                        console.error(X`swap failed: ${reason}`);
                        const resolvedPayment = await payment;
                        return E(exchangePurse).deposit(resolvedPayment);
                      });
                  },
                  fail: reason => console.error(reason),
                },
              );
            },
          });
        },
        /**
         * @param {ERef<Payment>} payIn
         * @param {Amount} amount
         * @param {PsmInstance} instance
         */
        async swap(payIn, amount, instance) {
          const {
            facets: { helper },
            state: { fundPurse },
          } = this;
          const psmPub = E(zoe).getPublicFacet(instance);
          const proposal = harden({ give: { In: amount } });
          const invitation = E(psmPub).makeWantMintedInvitation();
          const seat = E(zoe).offer(invitation, proposal, { In: payIn });
          const payout = await E(seat).getPayout('Out');
          const rxd = await E(fundPurse).deposit(payout);
          helper.onTrade(rxd);
          return rxd;
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
   * @param {Brand} opts.poolBrand
   * @param {ERef<StorageNode>} opts.storageNode
   */
  const makeProvisionPoolKit = async ({ poolBrand, storageNode }) => {
    /** @type {Purse<'nat'>} */
    // @ts-expect-error vbank purse is close enough for our use.
    const fundPurse = await E(poolBank).getPurse(poolBrand);

    return makeProvisionPoolKitInternal({
      fundPurse,
      poolBrand,
      storageNode: await storageNode,
    });
  };

  return makeProvisionPoolKit;
};
