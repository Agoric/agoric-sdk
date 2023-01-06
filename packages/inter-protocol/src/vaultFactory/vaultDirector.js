// @ts-check

import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

import '@agoric/governance/src/exported.js';
import { E } from '@endo/eventual-send';

import { fit, keyEQ, M, makeScalarMap } from '@agoric/store';
import {
  assertProposalShape,
  getAmountIn,
  getAmountOut,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/marshal';

import { AmountMath, AmountShape, IssuerShape } from '@agoric/ertp';
import { makeStoredPublisherKit, observeIteration } from '@agoric/notifier';
import {
  defineDurableKindMulti,
  makeKindHandle,
  makeScalarBigMapStore,
  provideDurableMapStore,
  provideDurableSetStore,
  vivifyFarInstance,
} from '@agoric/vat-data';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { publicMixinAPI } from '@agoric/governance';
import { makeVatManagerFactory } from '@agoric/swingset-vat/src/kernel/vat-loader/manager-factory.js';
import { makeMakeCollectFeesInvitation } from '../collectFees.js';
import {
  makeMetricsPublisherKit,
  provideChildBaggage,
  provideEmptySeat,
} from '../contractSupport.js';
import {
  CHARGING_PERIOD_KEY,
  makeVaultParamManager,
  RECORDING_PERIOD_KEY,
  SHORTFALL_INVITATION_KEY,
  vaultParamPattern,
} from './params.js';
import { makeVaultManager } from './vaultManager.js';

const { details: X, quote: q } = assert;

/** @typedef {{
 * debtMint: ZCFMint<'nat'>,
 * directorParamManager: import('@agoric/governance/src/contractGovernance/typedParamManager').TypedParamManager<import('./params.js').VaultDirectorParams>,
 * marshaller: ERef<Marshaller>,
 * metricsPublication: IterationObserver<MetricsNotification>
 * metricsSubscription: StoredSubscription<MetricsNotification>
 * shortfallReporter: import('../reserve/assetReserve.js').ShortfallReporter,
 * storageNode: ERef<StorageNode>,
 * vaultParamManagers: Store<Brand, import('./params.js').VaultParamManager>,
 * zcf: import('./vaultFactory.js').VaultFactoryZCF,
 * }} Ephemera
 */

/**
 * Ephemera is the state we cannot (or merely need not) keep durably. For
 * vaultDirector we can keep it in module scope because there is (exactly) one
 * vaultDirector per vaultFactory contract and (exactly) one contract per vat.
 *
 * @type {Ephemera}
 */
// @ts-expect-error not actually full until after initState
// UNTIL resolution to https://github.com/Agoric/agoric-sdk/issues/5759
const ephemera = {};

/**
 * @typedef {{
 * collaterals: Brand[],
 * rewardPoolAllocation: AmountKeywordRecord,
 * }} MetricsNotification
 *
 * @typedef {Readonly<{
 * collateralTypes: Store<Brand,VaultManager>,
 * mintSeat: ZCFSeat,
 * rewardPoolSeat: ZCFSeat,
 * shortfallInvitation: Invitation,
 * }>} ImmutableState
 *
 * @typedef {ImmutableState & MutableState} State
 *
 *  @typedef {{
 *  burnDebt: BurnDebt,
 *  getGovernedParams: () => import('./vaultManager.js').GovernedParamGetters,
 *  mintAndReallocate: MintAndReallocate,
 *  getShortfallReporter: () => Promise<import('../reserve/assetReserve.js').ShortfallReporter>,
 * }} FactoryPowersFacet
 *
 * @typedef {Readonly<{
 *   state: State;
 *   facets: import('@agoric/vat-data/src/types').KindFacets<typeof behavior>;
 * }>} MethodContext
 */

/**
 * @param {ERef<ZoeService>} zoe
 * @param {Ephemera['directorParamManager']} paramMgr
 * @param {import('../reserve/assetReserve.js').ShortfallReporter} [oldShortfallReporter]
 * @param {ERef<Invitation>} [oldInvitation]
 * @returns {Promise<{
 *   shortfallInvitation: ERef<Invitation>,
 *   shortfallReporter: import('../reserve/assetReserve.js').ShortfallReporter,
 * }>}
 */
const updateShortfallReporter = async (
  zoe,
  paramMgr,
  oldShortfallReporter,
  oldInvitation,
) => {
  const newInvitation = paramMgr.getInternalParamValue(
    SHORTFALL_INVITATION_KEY,
  );

  if (newInvitation !== oldInvitation) {
    return {
      // @ts-expect-error cast
      shortfallReporter: E(E(zoe).offer(newInvitation)).getOfferResult(),
      shortfallInvitation: newInvitation,
    };
  } else {
    assert(
      oldShortfallReporter,
      'updateShortFallReported called with repeat invitation and no oldShortfallReporter',
    );
    return {
      shortfallReporter: oldShortfallReporter,
      shortfallInvitation: oldInvitation,
    };
  }
};

/**
 * "Director" of the vault factory, overseeing "vault managers".
 *
 * @param {ZCF<GovernanceTerms<{}> & {
 *   ammPublicFacet: AutoswapPublicFacet,
 *   liquidationInstall: Installation<import('./liquidateMinimum.js').start>,
 *   loanTimingParams: {ChargingPeriod: ParamValueTyped<'nat'>, RecordingPeriod: ParamValueTyped<'nat'>},
 *   reservePublicFacet: AssetReservePublicFacet,
 *   timerService: TimerService,
 *   priceAuthority: ERef<PriceAuthority>
 * }>} zcf
 * @param {import('@agoric/governance/src/contractGovernance/typedParamManager').TypedParamManager<import('./params.js').VaultDirectorParams>} directorParamManager
 * @param {ZCFMint<"nat">} debtMint
 */
// const makeVaultDirector = defineDurableKindMulti(
//   makeKindHandle('VaultDirector'),
//   initState,
//   behavior,
//   { finish },
// );

/**
 * @param {Ephemera['zcf']} zcf
 * @param contractBaggage
 * @param {Ephemera['directorParamManager']} directorParamManager
 * @param {Ephemera['debtMint']} debtMint
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 */
const vivifyVaultDirector = (
  zcf,
  contractBaggage,
  directorParamManager,
  debtMint,
  marshaller,
) => {
  /** For temporary staging of newly minted tokens */
  const mintSeat = provideEmptySeat(
    zcf,
    contractBaggage,
    'mintSeat',
  );
  const rewardPoolSeat = provideEmptySeat(
    zcf,
    contractBaggage,
    'rewardSeat',
  );

  const vaultManagerBaggage = provideChildBaggage(contractBaggage, 'VaultManagerBaggage');

  const collateralTypes = provideDurableMapStore(
    contractBaggage,
    'collateralTypes',
  );

  let managerCounter = collateralTypes.getSize();

  const [collateralAmountShape, mintedAmountShape] = await Promise.all([
    E(anchorBrand).getAmountShape(),
    E(debtBrand).getAmountShape(),
  ]);

  // Non-durable map because param managers aren't durable.
  // In the event they're needed they can be reconstructed from contract terms and off-chain data.
  const vaultParamManagers = makeScalarMap('vaultParamManagers');

  const { metricsPublication, metricsSubscription } = makeMetricsPublisherKit(
    storageNode,
    marshaller,
  );

  Object.assign(ephemera, {
    debtMint,
    directorParamManager,
    marshaller,
    metricsPublication,
    // Subscription can't yet be held durably https://github.com/Agoric/agoric-sdk/issues/4567
    metricsSubscription,
    storageNode,
    vaultParamManagers,
  });

  /**
   * @param {Pick<State, 'collateralTypes' | 'rewardPoolSeat'>} state
   * @returns {MetricsNotification}
   */
  const metrics = () => {
    return harden({
      collaterals: Array.from(collateralTypes.keys()),
      rewardPoolAllocation: rewardPoolSeat.getCurrentAllocation(),
    });
  };


  /**
   * Make a loan in the vaultManager based on the collateral type.
   *
   * @deprecated
   */
  const makeVaultInvitation = () => {

    /** @param {ZCFSeat} seat */
    const makeVaultHook = async seat => {
      const {
        give: { Collateral: collateralAmount },
        want: { Minted: requestedAmount },
      } = seat.getProposal();
      const { brand: brandIn } = collateralAmount;
      collateralTypes.has(brandIn) ||
        assert.fail(X`Not a supported collateral type ${brandIn}`);

      assert(
        AmountMath.isGTE(
          requestedAmount,
          directorParamManager.getMinInitialDebt(),
        ),
        X`The request must be for at least ${
          directorParamManager.getMinInitialDebt().value
        }. ${requestedAmount.value} is too small`,
      );

      /** @type {VaultManager} */
      const mgr = collateralTypes.get(brandIn);
      return mgr.makeVaultKit(seat);
    };
    return zcf.makeInvitation(makeVaultHook, 'MakeVault',  
      M.split({
        give: { Collateral: collateralAmountShape },
        want: { Minted: mintedAmountShape },
      }),
    );
  };

  /**
   * @param collateralTypes
   * @deprecated get `collaterals` list from metrics
   */
  const getCollaterals = async () => {
    // should be collateralTypes.map((vm, brand) => ({
    return harden(
      Promise.all(
        [...collateralTypes.entries()].map(async ([brand, vm]) => {
          const priceQuote = await vm.getCollateralQuote();
          return {
            brand,
            interestRate: vm.getGovernedParams().getInterestRate(),
            liquidationMargin: vm.getGovernedParams().getLiquidationMargin(),
            stabilityFee: vm.getGovernedParams().getLoanFee(),
            marketPrice: makeRatioFromAmounts(
              getAmountOut(priceQuote),
              getAmountIn(priceQuote),
            ),
          };
        }),
      ),
    );
  };
  /**
   * @param {Ephemera['directorParamManager']} directorParamManager
   */
  const getLiquidationConfig = directorParamManager => ({
    install: directorParamManager.getLiquidationInstall(),
    terms: directorParamManager.getLiquidationTerms(),
  });

  /**
   *
   * @param {Ephemera['directorParamManager']} govParams
   * @param {VaultManager} vaultManager
   * @param {Installation<unknown>} oldInstall
   * @param {unknown} oldTerms
   */
  const watchGovernance = (govParams, vaultManager, oldInstall, oldTerms) => {
    const subscription = govParams.getSubscription();
    void observeIteration(subscription, {
      updateState(_paramUpdate) {
        const { install, terms } = getLiquidationConfig(govParams);
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

  // * @typedef {object} VaultManagerParamValues
  // * @property {Ratio} liquidationMargin - margin below which collateral will be
  // * liquidated to satisfy the debt.
  // * @property {Ratio} liquidationPenalty - penalty charged upon liquidation as proportion of debt
  // * @property {Ratio} interestRate - annual interest rate charged on loans
  // * @property {Ratio} loanFee - The fee (in BasisPoints) charged when opening
  // * or increasing a loan.
  // * @property {Amount<'nat'>} debtLimit

  const VaultDirectorCreatorI = M.interface('VaultDirectorCreator', {
    // TODO have a better shape than M.any here
    addVaultType: M.call(IssuerShape, M.string(), M.any()),
    getCollaterals: M.call(),
    makeCollectFeesInvitation: M.call().returns(InvitationShape),
    getContractGovernor: M.call().returns(InvitationShape),
    updateMetrics: M.call().returns(AmountShape),
    getRewardAllocation: M.call().returns(AmountShape),
  });

  const creatorFacet = vivifyFarInstance(
    contractBaggage,
    `VaultDirectorCreator`,
    VaultDirectorCreatorI,
    {
      // TODO move this under governance #3924
      /**
       * @param {Issuer} collateralIssuer
       * @param {Keyword} collateralKeyword
       * @param {VaultManagerParamValues} initialParamValues
       */
      async addVaultType(
        collateralIssuer,
        collateralKeyword,
        initialParamValues,
      ) {
        fit(collateralIssuer, M.remotable(), 'collateralIssuer');
        assertKeywordName(collateralKeyword);
        fit(initialParamValues, vaultParamPattern, 'initialParamValues');
        await zcf.saveIssuer(collateralIssuer, collateralKeyword);
        const collateralBrand = zcf.getBrandForIssuer(collateralIssuer);
        // We create only one vault manager per collateralType.
        !collateralTypes.has(collateralBrand) ||
          assert.fail(
            X`Collateral brand ${q(collateralBrand)} has already been added`,
          );

        const managerStorageNode =
          storageNode &&
          E(storageNode).makeChildNode(`manager${managerCounter}`);
          managerCounter += 1;

        /** a powerful object; can modify parameters */
        const vaultParamManager = makeVaultParamManager(
          makeStoredPublisherKit(managerStorageNode, marshaller, 'governance'),
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
          creatorFacet.updateMetrics();
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
          getGovernedParams: () => ({
            ...vaultParamManager.readonly(),
            getChargingPeriod: () =>
              loanTimingParams[CHARGING_PERIOD_KEY].value,
            getRecordingPeriod: () =>
              loanTimingParams[RECORDING_PERIOD_KEY].value,
          }),
          mintAndReallocate,
          getShortfallReporter: async () => {
            const reporterKit = await updateShortfallReporter(
              zcf.getZoeService(),
              directorParamManager,
              shortfallReporter,
              shortfallInvitation,
            );
            return reporterKit.shortfallReporter;
          },
          burnDebt,
        });

        const vm = makeVaultManager(
          zcf,
          debtMint,
          collateralBrand,
          zcf.getTerms().priceAuthority,
          factoryPowers,// term
          timerService,// term
          startTimeStamp,
          managerStorageNode,
          marshaller,
        );
        collateralTypes.init(collateralBrand, vm);
        const { install, terms } = getLiquidationConfig(directorParamManager);
        await vm.setupLiquidator(install, terms);
        watchGovernance(directorParamManager, vm, install, terms);
        creatorFacet.updateMetrics();
        return vm;
      },

      getCollaterals,

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
        // TODO why is this hardening state?!
        metricsPublication.updateState(metrics());
      },

      // XXX accessors for tests
      getRewardAllocation() {
        return rewardPoolSeat.getCurrentAllocation();
      },
    },
  );

  const govFacet = Far('governorFacet', {
    getParamMgrRetriever: () =>
      Far('paramManagerRetriever', {
        /** @param {VaultFactoryParamPath} paramPath */
        get: paramPath => {
          if (paramPath.key === 'governedParams') {
            return directorParamManager;
          } else if (paramPath.key.collateralBrand) {
            return vaultParamManagers.get(
              paramPath.key.collateralBrand,
            );
          } else {
            assert.fail('Unsupported paramPath');
          }
        },
      }),
    /**
     * @param {MethodContext} context
     * @param {string} name
     */
    getInvitation: (context, name) =>
      directorParamManager.getInternalParamValue(name),
    getLimitedCreatorFacet: () => creatorFacet,
    getGovernedApis: () => harden({}),
    getGovernedApiNames: () => harden({}),
  });

  const VaultDirectorI = M.interface('VaultDirector', {
    // TODO have a better shape than M.any here
    getCollateralManager: M.call(IssuerShape, M.string(), M.any()),
    getCollaterals: M.call(),
    getMetrics: M.call().returns(InvitationShape),
    makeLoanInvitation: M.call().returns(InvitationShape),
    makeVaultInvitation: M.call().returns(InvitationShape),
    getRunIssuer: M.call().returns(IssuerShape),
    getRewardAllocation: M.call().returns(AmountShape),
    ...publicMixinAPI,
  });

  const publicFacet = vivifyFarInstance(
    contractBaggage,
    `VaultDirector`,
    VaultDirectorI,
    {
      /**
       * @param {Brand} brandIn
       */
      getCollateralManager(brandIn) {
        collateralTypes.has(brandIn) ||
          assert.fail(X`Not a supported collateral type ${brandIn}`);
        /** @type {VaultManager} */
        return collateralTypes.get(brandIn).getPublicFacet();
      },
      getMetrics() {
        return metricsSubscription;
      },

      /** @deprecated use getCollateralManager and then makeVaultInvitation instead */
      makeLoanInvitation: makeVaultInvitation,
      /** @deprecated use getCollateralManager and then makeVaultInvitation instead */
      makeVaultInvitation,
      getCollaterals,
      getRunIssuer() {
        return debtMint.getIssuerRecord().issuer;
      },
      /**
       * subscription for the paramManager for a particular vaultManager
       *
       * @param {{ collateralBrand: Brand }} selector
       */
      getSubscription({ collateralBrand }) {
        return vaultParamManagers.get(collateralBrand).getSubscription();
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
       * @returns {Promise<GovernorPublic>}
       */
      getContractGovernor() {
        // PERF consider caching
        return E(zcf.getZoeService()).getPublicFacet(
          zcf.getTerms().electionManager,
        );
      },
      /**
       * @param {string} name
       */
      getInvitationAmount(name) {
        return directorParamManager.getInvitationAmount(name);
      },
    },
  );

  // TODO straighten this out
  const finish = async ({ state }) => {
    const { shortfallReporter, shortfallInvitation } =
      await updateShortfallReporter(
        zcf.getZoeService(),
        directorParamManager,
      );
    state.shortfallReporter = shortfallReporter;
    // @ts-expect-error write once
    state.shortfallInvitation = shortfallInvitation;
  };

// vivify - get blob, setup in memory
/**
 * for each blob
 *  setup(blob)
// create - make blod, write blob, setup in memory
/**
 * const bloc = ...
 * bagge.write(blob)
 * setup(blob)
 */

  for (const baggage of vaultManagerBaggage.children()) {
    vivifyVaultManagerKit(
      baggage,
      zcf, // arg
      debtMint, // arg
      collateralBrand, // baggage, also keyword
      priceAuthority, // term
      factoryPowers, // built
      timerService, // term
      startTimeStamp, // vm baggage


      directorParamManager, // arg
      debtMint, // arg
      storageNode, // arg
      marshaller, // arg
    );
  }
  return { creatorFacet, publicFacet, govFacet };
};

harden(vivifyVaultDirector);
export { vivifyVaultDirector };


