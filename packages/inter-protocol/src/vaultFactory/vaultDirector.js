import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

import '@agoric/governance/exported.js';
import { E } from '@endo/eventual-send';

import { keyEQ, M, makeScalarMapStore, mustMatch } from '@agoric/store';
import {
  assertProposalShape,
  getAmountIn,
  getAmountOut,
  provideChildBaggage,
  provideEmptySeat,
  unitAmount,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/marshal';

import { AmountMath, AmountShape, BrandShape, IssuerShape } from '@agoric/ertp';
import {
  makeStoredPublisherKit,
  makePublicTopic,
  observeIteration,
  pipeTopicToStorage,
  prepareDurablePublishKit,
  SubscriberShape,
  TopicsRecordShape,
} from '@agoric/notifier';
import {
  defineDurableExoClassKit,
  makeKindHandle,
  provideDurableMapStore,
} from '@agoric/vat-data';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';
import { makeMakeCollectFeesInvitation } from '../collectFees.js';
import {
  CHARGING_PERIOD_KEY,
  makeVaultParamManager,
  RECORDING_PERIOD_KEY,
  SHORTFALL_INVITATION_KEY,
  vaultParamPattern,
} from './params.js';
import { prepareVaultManagerKit } from './vaultManager.js';

const { details: X, quote: q, Fail } = assert;

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
 * managerCounter: number,
 * }} MutableState
 *
 * @typedef {ImmutableState & MutableState} State
 *
 * @typedef {{
 *  burnDebt: BurnDebt,
 *  getGovernedParams: () => import('./vaultManager.js').GovernedParamGetters,
 *  mintAndReallocate: MintAndReallocate,
 *  getShortfallReporter: () => Promise<import('../reserve/assetReserve.js').ShortfallReporter>,
 * }} FactoryPowersFacet
 *
 * @typedef {Readonly<{
 *   state: State;
 * }>} MethodContext
 */
// TODO find a way to type 'finish' with the context (state and facets)

const shortfallInvitationKey = 'shortfallInvitation';

/**
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {import('./vaultFactory.js').VaultFactoryZCF} zcf
 * @param {import('@agoric/governance/src/contractGovernance/typedParamManager').TypedParamManager<import('./params.js').VaultDirectorParams>} directorParamManager
 * @param {ZCFMint<"nat">} debtMint
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 */
export const prepareVaultDirector = (
  baggage,
  zcf,
  directorParamManager,
  debtMint,
  storageNode,
  marshaller,
) => {
  const makeVaultDirectorPublishKit = prepareDurablePublishKit(
    baggage,
    'Vault Director publish kit',
  );
  /** For temporary staging of newly minted tokens */
  const mintSeat = provideEmptySeat(zcf, baggage, 'mintSeat');
  const rewardPoolSeat = provideEmptySeat(zcf, baggage, 'rewardPoolSeat');

  const collateralTypes = provideDurableMapStore(baggage, 'collateralTypes');

  // Non-durable map because param managers aren't durable.
  // In the event they're needed they can be reconstructed from contract terms and off-chain data.
  /** @type {MapStore<Brand, ReturnType<typeof makeVaultParamManager>>} */
  const vaultParamManagers = makeScalarMapStore('vaultParamManagers');

  /** @type {PublishKit<MetricsNotification>} */
  const { publisher: metricsPublisher, subscriber: metricsSubscriber } =
    makeVaultDirectorPublishKit();

  const metricsNode = E(storageNode).makeChildNode('metrics');
  pipeTopicToStorage(metricsSubscriber, metricsNode, marshaller);
  const topics = harden({
    metrics: makePublicTopic(
      'Vault Factory metrics',
      metricsSubscriber,
      metricsNode,
    ),
  });

  const managerBaggages = provideChildBaggage(baggage, 'Vault Manager baggage');

  /** @type {import('../reserve/assetReserve.js').ShortfallReporter} */
  let shortfallReporter;

  /**
   * @returns {State}
   */
  const initState = () => {
    return {
      managerCounter: 0,
    };
  };

  const getLiquidationConfig = () => ({
    install: directorParamManager.getLiquidationInstall(),
    terms: directorParamManager.getLiquidationTerms(),
  });

  /**
   * @returns {MetricsNotification}
   */
  const sampleMetrics = () => {
    return harden({
      collaterals: Array.from(collateralTypes.keys()),
      rewardPoolAllocation: rewardPoolSeat.getCurrentAllocation(),
    });
  };

  /**
   *
   * @param {VaultManager} vaultManager
   * @param {Installation<unknown>} oldInstall
   * @param {unknown} oldTerms
   */
  const watchGovernance = (vaultManager, oldInstall, oldTerms) => {
    const subscription = directorParamManager.getSubscription();
    void observeIteration(subscription, {
      updateState(_paramUpdate) {
        const { install, terms } = getLiquidationConfig();
        if (install === oldInstall && keyEQ(terms, oldTerms)) {
          return;
        }
        oldInstall = install;
        oldTerms = terms;
        vaultManager
          .setupLiquidator(install, terms)
          .catch(e => console.error('Failed to setup liquidator', e));
      },
    });
  };

  const updateShortfallReporter = async () => {
    const oldInvitation = baggage.has(shortfallInvitationKey)
      ? baggage.get(shortfallInvitationKey)
      : undefined;
    const newInvitation = directorParamManager.getInternalParamValue(
      SHORTFALL_INVITATION_KEY,
    );

    if (newInvitation === oldInvitation) {
      shortfallReporter ||
        'updateShortFallReported called with repeat invitation and no prior shortfallReporter';
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

  const finish = async () => {
    await updateShortfallReporter();
  };

  /**
   * "Director" of the vault factory, overseeing "vault managers".
   *
   * @param {import('./vaultFactory.js').VaultFactoryZCF} zcf
   * @param {import('@agoric/governance/src/contractGovernance/typedParamManager').TypedParamManager<import('./params.js').VaultDirectorParams>} directorParamManager
   * @param {ZCFMint<"nat">} debtMint
   */
  const makeVaultDirector = defineDurableExoClassKit(
    makeKindHandle('VaultDirector'),
    {
      creator: M.interface('creator', {
        getParamMgrRetriever: M.call().returns(M.remotable()),
        getInvitation: M.call(M.string()).returns(M.promise()),
        getLimitedCreatorFacet: M.call().returns(M.remotable()),
        getGovernedApis: M.call().returns(M.record()),
        getGovernedApiNames: M.call().returns(M.record()),
        setOfferFilter: M.call(M.arrayOf(M.string())).returns(),
      }),
      machine: M.interface('machine', {
        addVaultType: M.call(IssuerShape, M.string(), M.record()).returns(
          M.promise(),
        ),
        makeCollectFeesInvitation: M.call().returns(M.promise()),
        getContractGovernor: M.call().returns(M.remotable()),
        updateMetrics: M.call().returns(),
        getRewardAllocation: M.call().returns({ Minted: AmountShape }),
      }),
      public: M.interface('public', {
        getCollateralManager: M.call(BrandShape).returns(M.remotable()),
        getCollaterals: M.call().returns(M.promise()),
        getMetrics: M.call().returns(SubscriberShape),
        makeVaultInvitation: M.call().returns(M.promise()),
        getRunIssuer: M.call().returns(IssuerShape),
        getSubscription: M.call()
          .optional({ collateralBrand: BrandShape })
          .returns(SubscriberShape),
        getGovernedParams: M.call({ collateralBrand: BrandShape }).returns(
          M.record(),
        ),
        getContractGovernor: M.call().returns(M.remotable()),
        getInvitationAmount: M.call(M.string()).returns(AmountShape),
        getPublicTopics: M.call().returns(TopicsRecordShape),
      }),
    },
    initState,
    {
      creator: {
        getParamMgrRetriever: () =>
          Far('paramManagerRetriever', {
            /** @param {VaultFactoryParamPath} paramPath */
            get: paramPath => {
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
        getGovernedApis() {
          return harden({});
        },
        getGovernedApiNames() {
          return harden([]);
        },
        setOfferFilter(_strings) {
          Fail`FIXME not yet implemented`;
        },
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
          const { state, facets } = this;
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
          !collateralTypes.has(collateralBrand) ||
            Fail`Collateral brand ${q(collateralBrand)} has already been added`;

          const managerStorageNode =
            storageNode &&
            E(storageNode).makeChildNode(`manager${state.managerCounter}`);
          state.managerCounter += 1;

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

          const { timerService } = zcf.getTerms();
          const startTimeStamp = await E(timerService).getCurrentTimestamp();

          /**
           * We provide an easy way for the vaultManager to add rewards to
           * the rewardPoolSeat, without directly exposing the rewardPoolSeat to them.
           *
           * @type {MintAndReallocate}
           */
          const mintAndReallocate = (toMint, fee, seat, ...otherSeats) => {
            const kept = AmountMath.subtract(toMint, fee);
            debtMint.mintGains(harden({ Minted: toMint }), mintSeat);
            try {
              rewardPoolSeat.incrementBy(
                mintSeat.decrementBy(harden({ Minted: fee })),
              );
              seat.incrementBy(mintSeat.decrementBy(harden({ Minted: kept })));
              zcf.reallocate(rewardPoolSeat, mintSeat, seat, ...otherSeats);
            } catch (e) {
              console.error('mintAndReallocate caught', e);
              mintSeat.clear();
              rewardPoolSeat.clear();
              // Make best efforts to burn the newly minted tokens, for hygiene.
              // That only relies on the internal mint, so it cannot fail without
              // there being much larger problems. There's no risk of tokens being
              // stolen here because the staging for them was already cleared.
              debtMint.burnLosses(harden({ Minted: toMint }), mintSeat);
              throw e;
            } finally {
              // Note that if this assertion may fail because of an error in the
              // try{} block, but that error won't be thrown because this executes
              // before the catch that rethrows it.
              assert(
                Object.values(mintSeat.getCurrentAllocation()).every(a =>
                  AmountMath.isEmpty(a),
                ),
                X`Stage should be empty of Minted`,
              );
            }
            facets.machine.updateMetrics();
          };

          /**
           * @param {Amount<'nat'>} toBurn
           * @param {ZCFSeat} seat
           */
          const burnDebt = (toBurn, seat) => {
            debtMint.burnLosses(harden({ Minted: toBurn }), seat);
          };

          const { loanTimingParams } = zcf.getTerms();

          const factoryPowers = Far('vault factory powers', {
            getGovernedParams: () =>
              Far('vault manager param manager', {
                ...vaultParamManager.readonly(),
                /** @type {() => Amount<'nat'>} */
                // @ts-expect-error cast
                getDebtLimit: vaultParamManager.readonly().getDebtLimit,
                getChargingPeriod: () =>
                  loanTimingParams[CHARGING_PERIOD_KEY].value,
                getRecordingPeriod: () =>
                  loanTimingParams[RECORDING_PERIOD_KEY].value,
              }),
            mintAndReallocate,
            getShortfallReporter: async () => {
              await updateShortfallReporter();
              return shortfallReporter;
            },
            burnDebt,
          });

          // alleged okay because used only as a diagnostic tag
          const brandName = await E(collateralBrand).getAllegedName();
          const collateralUnit = await unitAmount(collateralBrand);

          const makeVaultManager = managerBaggages.addChild(
            brandName,
            prepareVaultManagerKit,
            zcf,
            debtMint,
            collateralBrand,
            collateralUnit,
            factoryPowers,
            startTimeStamp,
            managerStorageNode,
            marshaller,
          );

          const { self: vm } = makeVaultManager();
          collateralTypes.init(collateralBrand, vm);
          const { install, terms } = getLiquidationConfig();
          await vm.setupLiquidator(install, terms);
          watchGovernance(vm, install, terms);
          facets.machine.updateMetrics();
          return vm;
        },
        makeCollectFeesInvitation() {
          return makeMakeCollectFeesInvitation(
            zcf,
            rewardPoolSeat,
            debtMint.getIssuerRecord().brand,
            'Minted',
          ).makeCollectFeesInvitation();
        },
        getContractGovernor() {
          return zcf.getTerms().electionManager;
        },
        updateMetrics() {
          return metricsPublisher.publish(sampleMetrics());
        },
        // XXX accessors for tests
        getRewardAllocation() {
          return rewardPoolSeat.getCurrentAllocation();
        },
      },
      public: {
        /**
         * @param {Brand} brandIn
         */
        getCollateralManager(brandIn) {
          collateralTypes.has(brandIn) ||
            Fail`Not a supported collateral type ${brandIn}`;
          /** @type {VaultManager} */
          return collateralTypes.get(brandIn).getPublicFacet();
        },
        /**
         * @deprecated get `collaterals` list from metrics
         */
        async getCollaterals() {
          // should be collateralTypes.map((vm, brand) => ({
          return harden(
            Promise.all(
              [...collateralTypes.entries()].map(async ([brand, vm]) => {
                const priceQuote = await vm.getCollateralQuote();
                return {
                  brand,
                  interestRate: vm.getGovernedParams().getInterestRate(),
                  liquidationMargin: vm
                    .getGovernedParams()
                    .getLiquidationMargin(),
                  stabilityFee: vm.getGovernedParams().getLoanFee(),
                  marketPrice: makeRatioFromAmounts(
                    getAmountOut(priceQuote),
                    getAmountIn(priceQuote),
                  ),
                };
              }),
            ),
          );
        },
        /** @deprecated use getPublicTopics */
        getMetrics() {
          return metricsSubscriber;
        },
        /**
         * @deprecated use getCollateralManager and then makeVaultInvitation instead
         *
         * Make a vault in the vaultManager based on the collateral type.
         */
        makeVaultInvitation() {
          /** @param {ZCFSeat} seat */
          const makeVaultHook = async seat => {
            assertProposalShape(seat, {
              give: { Collateral: null },
              want: { Minted: null },
            });
            const {
              give: { Collateral: collateralAmount },
              want: { Minted: requestedAmount },
            } = seat.getProposal();
            const { brand: brandIn } = collateralAmount;
            collateralTypes.has(brandIn) ||
              Fail`Not a supported collateral type ${brandIn}`;

            AmountMath.isGTE(
              requestedAmount,
              directorParamManager.getMinInitialDebt(),
            ) ||
              Fail`The request must be for at least ${
                directorParamManager.getMinInitialDebt().value
              }. ${requestedAmount.value} is too small`;

            /** @type {VaultManager} */
            const mgr = collateralTypes.get(brandIn);
            return mgr.makeVaultKit(seat);
          };
          return zcf.makeInvitation(makeVaultHook, 'MakeVault');
        },
        getRunIssuer() {
          return debtMint.getIssuerRecord().issuer;
        },
        getPublicTopics() {
          return topics;
        },
        /**
         * subscription for the paramManager for the vaultFactory's electorate or a particular collateral manager
         *
         * @param {object} [path]
         * @param {Brand} [path.collateralBrand]
         */
        getSubscription(path) {
          if (path && path.collateralBrand) {
            const { collateralBrand } = path;
            return vaultParamManagers.get(collateralBrand).getSubscription();
          }
          return directorParamManager.getSubscription();
        },
        /**
         * @param {{ collateralBrand: Brand }} selector
         */
        getGovernedParams({ collateralBrand }) {
          // TODO use named getters of TypedParamManager
          return vaultParamManagers.get(collateralBrand).getParams();
        },
        getContractGovernor() {
          return zcf.getTerms().electionManager;
        },
        /**
         * @param {string} name
         */
        getInvitationAmount(name) {
          return directorParamManager.getInvitationAmount(name);
        },
      },
    },
    { finish },
  );
  return makeVaultDirector;
};
harden(prepareVaultDirector);
