import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

import '@agoric/governance/exported.js';

import { AmountMath, AmountShape, BrandShape, IssuerShape } from '@agoric/ertp';
import { GovernorFacetShape } from '@agoric/governance/src/typeGuards.js';
import { makeTracer } from '@agoric/internal';
import { makeStoredPublisherKit } from '@agoric/notifier';
import { M, makeScalarMapStore, mustMatch } from '@agoric/store';
import { prepareExoClassKit, provideDurableMapStore } from '@agoric/vat-data';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';
import {
  atomicRearrange,
  getAmountIn,
  getAmountOut,
  makeRatioFromAmounts,
  makeRecorderTopic,
  provideCategorySingletons,
  provideEmptySeat,
  SubscriberShape,
  TopicsRecordShape,
  unitAmount,
} from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeCollectFeesInvitation } from '../collectFees.js';
import { scheduleLiquidationWakeups } from './liquidation.js';
import {
  makeVaultParamManager,
  SHORTFALL_INVITATION_KEY,
  vaultParamPattern,
} from './params.js';
import { prepareVaultManagerKit } from './vaultManager.js';

const { Fail, quote: q } = assert;

const trace = makeTracer('VD', false);

/**
 * @typedef {{
 * collaterals: Brand[],
 * rewardPoolAllocation: AmountKeywordRecord,
 * }} MetricsNotification
 *
 * @typedef {Readonly<{
 * }>} ImmutableState
 *
 * @typedef {{
 * }} MutableState
 *
 * @typedef {ImmutableState & MutableState} State
 *
 * @typedef {{
 *  burnDebt: BurnDebt,
 *  getGovernedParams: (collateralBrand: Brand) => import('./vaultManager.js').GovernedParamGetters,
 *  mintAndTransfer: MintAndTransfer,
 *  getShortfallReporter: () => Promise<import('../reserve/assetReserve.js').ShortfallReporter>,
 * }} FactoryPowersFacet
 *
 * @typedef {Readonly<{
 *   state: State;
 * }>} MethodContext
 *
 * @typedef {import('@agoric/governance/src/contractGovernance/typedParamManager').TypedParamManager<import('./params.js').VaultDirectorParams>} VaultDirectorParamManager
 */
// TODO find a way to type 'finish' with the context (state and facets)

const shortfallInvitationKey = 'shortfallInvitation';

/**
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {import('./vaultFactory.js').VaultFactoryZCF} zcf
 * @param {VaultDirectorParamManager} directorParamManager
 * @param {ZCFMint<"nat">} debtMint
 * @param {ERef<import('@agoric/time/src/types').TimerService>} timer
 * @param {ERef<import('../auction/auctioneer.js').AuctioneerPublicFacet>} auctioneer
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit} makeRecorderKit
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').MakeERecorderKit} makeERecorderKit
 */
export const prepareVaultDirector = (
  baggage,
  zcf,
  directorParamManager,
  debtMint,
  timer,
  auctioneer,
  storageNode,
  marshaller,
  makeRecorderKit,
  makeERecorderKit,
) => {
  /** @type {import('../reserve/assetReserve.js').ShortfallReporter} */
  let shortfallReporter;

  /** For holding newly minted tokens until transferred */
  const { zcfSeat: mintSeat } = zcf.makeEmptySeatKit();

  const rewardPoolSeat = provideEmptySeat(zcf, baggage, 'rewardPoolSeat');

  /** @type {MapStore<Brand, number>} index of manager for the given collateral */
  const collateralManagers = provideDurableMapStore(
    baggage,
    'collateralManagers',
  );

  // Non-durable map because param managers aren't durable.
  // In the event they're needed they can be reconstructed from contract terms and off-chain data.
  /**
   * @type {MapStore<Brand, ReturnType<typeof makeVaultParamManager>>}
   */
  const vaultParamManagers = makeScalarMapStore('vaultParamManagers');

  const metricsNode = E(storageNode).makeChildNode('metrics');

  const metricsKit = makeERecorderKit(
    metricsNode,
    /** @type {import('@agoric/zoe/src/contractSupport/recorder.js').TypedMatcher<MetricsNotification>} */ (
      M.any()
    ),
  );

  const managersNode = E(storageNode).makeChildNode('managers');

  /**
   * @returns {MetricsNotification}
   */
  const sampleMetrics = () => {
    return harden({
      collaterals: Array.from(collateralManagers.keys()),
      rewardPoolAllocation: rewardPoolSeat.getCurrentAllocation(),
    });
  };

  const updateShortfallReporter = async () => {
    const oldInvitation = baggage.has(shortfallInvitationKey)
      ? baggage.get(shortfallInvitationKey)
      : undefined;
    const newInvitation = await directorParamManager.getInternalParamValue(
      SHORTFALL_INVITATION_KEY,
    );

    if (newInvitation === oldInvitation) {
      shortfallReporter ||
        Fail`updateShortFallReported called with repeat invitation and no prior shortfallReporter`;
      return;
    }

    // Update the values
    const zoe = zcf.getZoeService();
    // @ts-expect-error cast
    shortfallReporter = E(E(zoe).offer(newInvitation)).getOfferResult();
    if (oldInvitation === undefined) {
      baggage.init(shortfallInvitationKey, newInvitation);
    } else {
      baggage.set(shortfallInvitationKey, newInvitation);
    }
  };

  const factoryPowers = Far('vault factory powers', {
    /**
     * Get read-only params for this manager and its director. This grants all
     * managers access to params from all managers. It's not POLA but it's a
     * public authority and it reduces the number of distinct power objects to
     * create.
     *
     * @param {Brand} brand
     */
    getGovernedParams: brand => {
      const vaultParamManager = vaultParamManagers.get(brand);
      return Far('vault manager param manager', {
        // merge director and manager params
        ...directorParamManager.readonly(),
        ...vaultParamManager.readonly(),
        // redeclare these getters as to specify the kind of the Amount
        getMinInitialDebt: /** @type {() => Amount<'nat'>} */ (
          directorParamManager.readonly().getMinInitialDebt
        ),
        getDebtLimit: /** @type {() => Amount<'nat'>} */ (
          vaultParamManager.readonly().getDebtLimit
        ),
      });
    },

    /**
     * Let the manager add rewards to the rewardPoolSeat without
     * exposing the rewardPoolSeat to them.
     *
     * @type {MintAndTransfer}
     */
    mintAndTransfer: (mintReceiver, toMint, fee, nonMintTransfers) => {
      const kept = AmountMath.subtract(toMint, fee);
      debtMint.mintGains(harden({ Minted: toMint }), mintSeat);
      /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
      const transfers = [
        ...nonMintTransfers,
        [mintSeat, rewardPoolSeat, { Minted: fee }],
        [mintSeat, mintReceiver, { Minted: kept }],
      ];
      try {
        atomicRearrange(zcf, harden(transfers));
      } catch (e) {
        console.error('mintAndTransfer failed to rearrange', e);
        // If the rearrange fails, burn the newly minted tokens.
        // Assume this won't fail because it relies on the internal mint.
        // (Failure would imply much larger problems.)
        debtMint.burnLosses(harden({ Minted: toMint }), mintSeat);
        throw e;
      }
      void E(metricsKit.recorderP).write(sampleMetrics());
    },
    getShortfallReporter: async () => {
      await updateShortfallReporter();
      return shortfallReporter;
    },
    /**
     * @param {Amount<'nat'>} toBurn
     * @param {ZCFSeat} seat
     */
    burnDebt: (toBurn, seat) => {
      debtMint.burnLosses(harden({ Minted: toBurn }), seat);
    },
  });

  const vaultManagers = provideCategorySingletons(
    baggage,
    'Vault Managers',
    prepareVaultManagerKit,
    {
      makeERecorderKit,
      makeRecorderKit,
      marshaller,
      factoryPowers,
      zcf,
    },
  );

  /** @type {(brand: Brand) => VaultManager} */
  const managerForCollateral = brand => {
    const managerIndex = collateralManagers.get(brand);
    const manager = vaultManagers.get(managerIndex).self;
    manager || Fail`no manager ${managerIndex} for collateral ${brand}`;
    return manager;
  };

  // TODO helper to make all the topics at once
  const topics = harden({
    metrics: makeRecorderTopic('Vault Factory metrics', metricsKit),
  });

  const allManagersDo = fn => {
    for (const managerIndex of collateralManagers.values()) {
      const vm = vaultManagers.get(managerIndex).self;
      fn(vm);
    }
  };

  const makeWaker = (name, func) => {
    return Far(name, {
      wake: timestamp => func(timestamp),
    });
  };

  /**
   * @returns {State}
   */
  const initState = () => {
    return {};
  };

  /**
   * "Director" of the vault factory, overseeing "vault managers".
   *
   * @param {import('./vaultFactory.js').VaultFactoryZCF} zcf
   * @param {VaultDirectorParamManager} directorParamManager
   * @param {ZCFMint<"nat">} debtMint
   */
  const makeVaultDirector = prepareExoClassKit(
    baggage,
    'VaultDirector',
    {
      creator: M.interface('creator', {
        ...GovernorFacetShape,
      }),
      machine: M.interface('machine', {
        addVaultType: M.call(IssuerShape, M.string(), M.record()).returns(
          M.promise(),
        ),
        makeCollectFeesInvitation: M.call().returns(M.promise()),
        updateMetrics: M.call().returns(M.promise()),
        getRewardAllocation: M.call().returns({ Minted: AmountShape }),
        makePriceLockWaker: M.call().returns(M.remotable('TimerWaker')),
        makeLiquidationWaker: M.call().returns(M.remotable('TimerWaker')),
        makeReschedulerWaker: M.call().returns(M.remotable('TimerWaker')),
      }),
      public: M.interface('public', {
        getCollateralManager: M.call(BrandShape).returns(M.remotable()),
        getCollaterals: M.call().returns(M.promise()),
        getMetrics: M.call().returns(SubscriberShape),
        getRunIssuer: M.call().returns(IssuerShape),
        getSubscription: M.call({ collateralBrand: BrandShape }).returns(
          SubscriberShape,
        ),
        getElectorateSubscription: M.call().returns(SubscriberShape),
        getGovernedParams: M.call({ collateralBrand: BrandShape }).returns(
          M.record(),
        ),
        getInvitationAmount: M.call(M.string()).returns(AmountShape),
        getPublicTopics: M.call().returns(TopicsRecordShape),
      }),
      helper: M.interface('helper', {
        rescheduleLiquidationWakeups: M.call().returns(),
      }),
    },
    initState,
    {
      creator: {
        getParamMgrRetriever: () =>
          Far('paramManagerRetriever', {
            /** @param {VaultFactoryParamPath} paramPath */
            get: (
              paramPath = { key: /** @type {const} */ 'governedParams' },
            ) => {
              if (paramPath.key === 'governedParams') {
                return directorParamManager;
              } else if (paramPath.key.collateralBrand) {
                return vaultParamManagers.get(paramPath.key.collateralBrand);
              } else {
                assert.fail('Unsupported paramPath');
              }
            },
          }),
        /**
         * @param {string} name
         */
        getInvitation(name) {
          return directorParamManager.getInternalParamValue(name);
        },
        getLimitedCreatorFacet() {
          return this.facets.machine;
        },
        /** @returns {ERef<GovernedApis>} */
        getGovernedApis() {
          // @ts-expect-error cast
          return Far('governedAPIs', {});
        },
        getGovernedApiNames() {
          return harden([]);
        },
        setOfferFilter: strings => zcf.setOfferFilter(strings),
      },
      machine: {
        // TODO move this under governance #3924
        /**
         * @param {Issuer<'nat'>} collateralIssuer
         * @param {Keyword} collateralKeyword
         * @param {VaultManagerParamValues} initialParamValues
         */
        async addVaultType(
          collateralIssuer,
          collateralKeyword,
          initialParamValues,
        ) {
          trace('addVaultType', collateralKeyword, initialParamValues);
          const { facets } = this;
          mustMatch(collateralIssuer, M.remotable(), 'collateralIssuer');
          assertKeywordName(collateralKeyword);
          mustMatch(
            initialParamValues,
            vaultParamPattern,
            'initialParamValues',
          );
          await zcf.saveIssuer(collateralIssuer, collateralKeyword);
          const collateralBrand = zcf.getBrandForIssuer(collateralIssuer);
          // We create only one vault per collateralType.
          !collateralManagers.has(collateralBrand) ||
            Fail`Collateral brand ${q(collateralBrand)} has already been added`;

          // zero-based index of the manager being made
          const managerIndex = vaultManagers.length();
          const managerId = `manager${managerIndex}`;
          const managerStorageNode = await E(managersNode).makeChildNode(
            managerId,
          );

          /** a powerful object; can modify parameters */
          const vaultParamManager = makeVaultParamManager(
            makeStoredPublisherKit(
              managerStorageNode,
              marshaller,
              'governance',
            ),
            initialParamValues,
          );
          vaultParamManagers.init(collateralBrand, vaultParamManager);

          const startTimeStamp = await E(timer).getCurrentTimestamp();

          // alleged okay because used only as a diagnostic tag
          const brandName = await E(collateralBrand).getAllegedName();
          const collateralUnit = await unitAmount(collateralBrand);

          // FIXME need to be able to restore these singletons.
          // The whole "addChild" thing needs to go away. Start over with managing a list of singletons, retaining the precious arguments used to make them

          const result = vaultManagers.makeSingleton(brandName, {
            debtMint,
            collateralBrand,
            collateralUnit,
            descriptionScope: managerId,
            startTimeStamp,
            storageNode: managerStorageNode,
          });
          console.log('DEBUG result', result);
          const { self: vm } = result;
          vm || Fail`no vault`;
          collateralManagers.init(collateralBrand, managerIndex);
          void facets.machine.updateMetrics();
          return vm;
        },
        makeCollectFeesInvitation() {
          return makeCollectFeesInvitation(
            zcf,
            rewardPoolSeat,
            debtMint.getIssuerRecord().brand,
            'Minted',
          );
        },
        updateMetrics() {
          return E(metricsKit.recorderP).write(sampleMetrics());
        },
        // XXX accessors for tests
        getRewardAllocation() {
          return rewardPoolSeat.getCurrentAllocation();
        },

        makeLiquidationWaker() {
          return makeWaker('liquidationWaker', _timestamp => {
            allManagersDo(vm => vm.liquidateVaults(auctioneer));
          });
        },
        makeReschedulerWaker() {
          const { facets } = this;
          return makeWaker('reschedulerWaker', () => {
            facets.helper.rescheduleLiquidationWakeups();
          });
        },
        makePriceLockWaker() {
          return makeWaker('priceLockWaker', () => {
            allManagersDo(vm => vm.lockOraclePrices());
          });
        },
      },
      public: {
        /**
         * @param {Brand} brandIn
         */
        getCollateralManager(brandIn) {
          collateralManagers.has(brandIn) ||
            Fail`Not a supported collateral type ${brandIn}`;
          /** @type {VaultManager} */
          return managerForCollateral(brandIn).getPublicFacet();
        },
        /**
         * @deprecated get `collaterals` list from metrics
         */
        async getCollaterals() {
          // should be collateralManagers.map((vm, brand) => ({
          return harden(
            Promise.all(
              [...collateralManagers.entries()].map(
                async ([brand, managerIndex]) => {
                  const vm = vaultManagers.get(managerIndex).self;
                  const priceQuote = await vm.getCollateralQuote();
                  return {
                    brand,
                    interestRate: vm.getGovernedParams().getInterestRate(),
                    liquidationMargin: vm
                      .getGovernedParams()
                      .getLiquidationMargin(),
                    stabilityFee: vm.getGovernedParams().getMintFee(),
                    marketPrice: makeRatioFromAmounts(
                      getAmountOut(priceQuote),
                      getAmountIn(priceQuote),
                    ),
                  };
                },
              ),
            ),
          );
        },
        /** @deprecated use getPublicTopics */
        getMetrics() {
          return metricsKit.subscriber;
        },
        getRunIssuer() {
          return debtMint.getIssuerRecord().issuer;
        },
        /**
         * @deprecated get from the CollateralManager directly
         *
         * subscription for the paramManager for a particular vaultManager
         *
         * @param {{ collateralBrand: Brand }} selector
         */
        getSubscription({ collateralBrand }) {
          return vaultParamManagers.get(collateralBrand).getSubscription();
        },
        getPublicTopics() {
          return topics;
        },
        /**
         * subscription for the paramManager for the vaultFactory's electorate
         */
        getElectorateSubscription() {
          return directorParamManager.getSubscription();
        },
        /**
         * @param {{ collateralBrand: Brand }} selector
         */
        getGovernedParams({ collateralBrand }) {
          // TODO use named getters of TypedParamManager
          return vaultParamManagers.get(collateralBrand).getParams();
        },
        /**
         * @param {string} name
         */
        getInvitationAmount(name) {
          return directorParamManager.getInvitationAmount(name);
        },
      },
      helper: {
        rescheduleLiquidationWakeups() {
          const { facets } = this;

          const priceLockWaker = facets.machine.makePriceLockWaker();
          const liquidationWaker = facets.machine.makeLiquidationWaker();
          const rescheduleWaker = facets.machine.makeReschedulerWaker();
          void scheduleLiquidationWakeups(
            auctioneer,
            timer,
            priceLockWaker,
            liquidationWaker,
            rescheduleWaker,
          );
        },
      },
    },
    {
      finish: ({ facets }) => {
        facets.helper.rescheduleLiquidationWakeups();
        void updateShortfallReporter();
      },
    },
  );
  return makeVaultDirector;
};
harden(prepareVaultDirector);
