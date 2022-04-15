// @ts-check

import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

import { E } from '@endo/eventual-send';
import '@agoric/governance/src/exported';

import { makeScalarMap } from '@agoric/store';
import {
  assertProposalShape,
  getAmountOut,
  getAmountIn,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/marshal';

import { AmountMath } from '@agoric/ertp';
import { makeVaultManager } from './vaultManager.js';
import { makeLiquidationStrategy } from './liquidateMinimum.js';
import { makeMakeCollectFeesInvitation } from '../collectFees.js';
import {
  makeVaultParamManager,
  RECORDING_PERIOD_KEY,
  CHARGING_PERIOD_KEY,
} from './params.js';

const { details: X } = assert;

/**
 * @typedef {Readonly<{
 * debtMint: ZCFMint<'nat'>,
 * collateralTypes: Store<Brand,VaultManager>,
 * electionManager: Instance,
 * mintSeat: ZCFSeat,
 * penaltyPoolSeat: ZCFSeat,
 * rewardPoolSeat: ZCFSeat,
 * vaultParamManagers: Store<Brand, import('./params.js').VaultParamManager>,
 * zcf: import('./vaultFactory.js').VaultFactoryZCF,
 * }>} ImmutableState
 *
 * @typedef {{
 *  burnDebt: BurnDebt,
 *  getGovernedParams: () => import('./vaultManager.js').GovernedParamGetters,
 *  mintAndReallocate: MintAndReallocate,
 * }} FactoryPowersFacet
 */

/**
 * @param {import('./vaultFactory.js').VaultFactoryZCF} zcf
 * @param {import('@agoric/governance/src/contractGovernance/typedParamManager').TypedParamManager<{Electorate: "invitation"}>} electorateParamManager
 * @param {ZCFMint<"nat">} debtMint
 */
const initState = (zcf, electorateParamManager, debtMint) => {
  /** For temporary staging of newly minted tokens */
  const { zcfSeat: mintSeat } = zcf.makeEmptySeatKit();
  const { zcfSeat: rewardPoolSeat } = zcf.makeEmptySeatKit();
  const { zcfSeat: penaltyPoolSeat } = zcf.makeEmptySeatKit();

  const collateralTypes = makeScalarMap('brand');

  const vaultParamManagers = makeScalarMap('brand');

  return {
    collateralTypes,
    debtMint,
    electorateParamManager,
    mintSeat,
    rewardPoolSeat,
    penaltyPoolSeat,
    vaultParamManagers,
    zcf,
  };
};

/**
 * "Director" of the vault factory, overseeing "vault managers".
 *
 * @param {ZCF<GovernanceTerms<{}> & {
 *   ammPublicFacet: AutoswapPublicFacet,
 *   liquidationInstall: Installation<import('./liquidateMinimum.js').start>,
 *   loanTimingParams: {ChargingPeriod: ParamRecord<'nat'>, RecordingPeriod: ParamRecord<'nat'>},
 *   timerService: TimerService,
 *   priceAuthority: ERef<PriceAuthority>
 * }>} zcf
 * @param {import('@agoric/governance/src/contractGovernance/typedParamManager').TypedParamManager<{Electorate: "invitation"}>} electorateParamManager
 * @param {ZCFMint<"nat">} debtMint
 */
const makeVaultDirector = (zcf, electorateParamManager, debtMint) => {
  const {
    collateralTypes,
    // electorateParamManager,
    mintSeat,
    rewardPoolSeat,
    penaltyPoolSeat,
    vaultParamManagers,
    // zcf,
  } = initState(zcf, electorateParamManager, debtMint);

  /** Make a loan in the vaultManager based on the collateral type.
   *
   * @deprecated
   */
  const makeVaultInvitation = () => {
    /** @param {ZCFSeat} seat */
    const makeVaultHook = async seat => {
      assertProposalShape(seat, {
        give: { Collateral: null },
        want: { RUN: null },
      });
      const {
        give: { Collateral: collateralAmount },
      } = seat.getProposal();
      const { brand: brandIn } = collateralAmount;
      assert(
        collateralTypes.has(brandIn),
        X`Not a supported collateral type ${brandIn}`,
      );
      /** @type {VaultManager} */
      const mgr = collateralTypes.get(brandIn);
      return mgr.makeVaultKit(seat);
    };
    return zcf.makeInvitation(makeVaultHook, 'MakeVault');
  };

  // TODO put on machineFacet for use again in publicFacet
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

  /** @type {VaultFactory} */
  const machineBehavior = {
    // TODO move this under governance #3924
    /** @type {AddVaultType} */
    addVaultType: async (
      collateralIssuer,
      collateralKeyword,
      initialParamValues,
    ) => {
      await zcf.saveIssuer(collateralIssuer, collateralKeyword);
      const collateralBrand = zcf.getBrandForIssuer(collateralIssuer);
      // We create only one vault per collateralType.
      assert(
        !collateralTypes.has(collateralBrand),
        `Collateral brand ${collateralBrand} has already been added`,
      );

      /** a powerful object; can modify parameters */
      const vaultParamManager = makeVaultParamManager(initialParamValues);
      vaultParamManagers.init(collateralBrand, vaultParamManager);

      const zoe = zcf.getZoeService();
      const {
        liquidationInstall,
        ammPublicFacet,
        priceAuthority,
        timerService,
      } = zcf.getTerms();
      const { issuer: debtIssuer, brand: debtBrand } =
        debtMint.getIssuerRecord();
      const { creatorFacet: liquidationFacet } = await E(zoe).startInstance(
        liquidationInstall,
        harden({ RUN: debtIssuer, Collateral: collateralIssuer }),
        harden({
          amm: ammPublicFacet,
          priceAuthority,
          timerService,
          debtBrand,
        }),
      );
      const liquidationStrategy = makeLiquidationStrategy(liquidationFacet);

      const startTimeStamp = await E(timerService).getCurrentTimestamp();

      /**
       * We provide an easy way for the vaultManager to add rewards to
       * the rewardPoolSeat, without directly exposing the rewardPoolSeat to them.
       *
       * @type {MintAndReallocate}
       */
      const mintAndReallocate = (toMint, fee, seat, ...otherSeats) => {
        const kept = AmountMath.subtract(toMint, fee);
        debtMint.mintGains(harden({ RUN: toMint }), mintSeat);
        try {
          rewardPoolSeat.incrementBy(
            mintSeat.decrementBy(harden({ RUN: fee })),
          );
          seat.incrementBy(mintSeat.decrementBy(harden({ RUN: kept })));
          zcf.reallocate(rewardPoolSeat, mintSeat, seat, ...otherSeats);
        } catch (e) {
          mintSeat.clear();
          rewardPoolSeat.clear();
          // Make best efforts to burn the newly minted tokens, for hygiene.
          // That only relies on the internal mint, so it cannot fail without
          // there being much larger problems. There's no risk of tokens being
          // stolen here because the staging for them was already cleared.
          debtMint.burnLosses(harden({ RUN: toMint }), mintSeat);
          throw e;
        } finally {
          assert(
            Object.values(mintSeat.getCurrentAllocation()).every(a =>
              AmountMath.isEmpty(a),
            ),
            X`Stage should be empty of RUN`,
          );
        }
        // TODO add aggregate debt tracking at the vaultFactory level #4482
        // totalDebt = AmountMath.add(totalDebt, toMint);
      };

      /**
       * @param {Amount<'nat'>} toBurn
       * @param {ZCFSeat} seat
       */
      const burnDebt = (toBurn, seat) => {
        debtMint.burnLosses(harden({ RUN: toBurn }), seat);
      };

      const { loanTimingParams } = zcf.getTerms();

      const factoryPowers = Far('vault factory powers', {
        getGovernedParams: () => ({
          ...vaultParamManager.readonly(),
          getChargingPeriod: () => loanTimingParams[CHARGING_PERIOD_KEY].value,
          getRecordingPeriod: () =>
            loanTimingParams[RECORDING_PERIOD_KEY].value,
        }),
        mintAndReallocate,
        burnDebt,
      });

      const vm = makeVaultManager(
        zcf,
        debtMint,
        collateralBrand,
        zcf.getTerms().priceAuthority,
        factoryPowers,
        timerService,
        // @ts-expect-error
        liquidationStrategy,
        penaltyPoolSeat,
        startTimeStamp,
      );
      collateralTypes.init(collateralBrand, vm);
      return vm;
    },
    getCollaterals,
    makeCollectFeesInvitation: makeMakeCollectFeesInvitation(
      zcf,
      rewardPoolSeat,
      debtMint.getIssuerRecord().brand,
      'RUN',
    ).makeCollectFeesInvitation,
    getContractGovernor: () => zcf.getTerms().electionManager,

    // XXX accessors for tests
    getRewardAllocation: rewardPoolSeat.getCurrentAllocation,
    getPenaltyAllocation: penaltyPoolSeat.getCurrentAllocation,
  };

  const machineFacet = Far('vaultFactory machine', machineBehavior);

  const creatorBehavior = {
    getParamMgrRetriever: () =>
      Far('paramManagerRetriever', {
        /** @param {{key: 'governedParams' | {collateralBrand: Brand}}} paramDesc */
        get: paramDesc => {
          if (paramDesc.key === 'governedParams') {
            return electorateParamManager;
          } else if (paramDesc.key.collateralBrand) {
            return vaultParamManagers.get(paramDesc.key.collateralBrand);
          } else {
            assert.fail('Unsupported paramDesc');
          }
        },
      }),
    getInvitation: electorateParamManager.getInternalParamValue,
    getLimitedCreatorFacet: () => machineFacet,
    getGovernedApis: () => harden({}),
    getGovernedApiNames: () => harden({}),
  };

  const publicBehavior = {
    /** @param {Brand} brandIn */
    getCollateralManager: brandIn => {
      assert(
        collateralTypes.has(brandIn),
        X`Not a supported collateral type ${brandIn}`,
      );
      /** @type {VaultManager} */
      return collateralTypes.get(brandIn).getPublicFacet();
    },
    /** @deprecated use getCollateralManager and then makeVaultInvitation instead */
    makeLoanInvitation: makeVaultInvitation,
    /** @deprecated use getCollateralManager and then makeVaultInvitation instead */
    makeVaultInvitation,
    getCollaterals,
    getRunIssuer: () => debtMint.getIssuerRecord().issuer,
    /** subscription for the paramManager for a particular vaultManager */
    getSubscription: () => paramDesc =>
      vaultParamManagers.get(paramDesc.collateralBrand).getSubscription(),
    /** subscription for the paramManager for the vaultFactory's electorate */
    getElectorateSubscription: () => electorateParamManager.getSubscription(),
    getGovernedParams: ({ collateralBrand }) =>
      // TODO use named getters of TypedParamManager
      vaultParamManagers.get(collateralBrand).getParams(),
    /** @returns {Promise<GovernorPublic>} */
    getContractGovernor: () =>
      // PERF consider caching
      E(zcf.getZoeService()).getPublicFacet(zcf.getTerms().electionManager),
    getInvitationAmount: electorateParamManager.getInvitationAmount,
  };

  return harden({
    creatorFacet: Far('powerful vaultFactory wrapper', creatorBehavior),
    publicFacet: Far('vaultFactory public facet', publicBehavior),
  });
};

harden(makeVaultDirector);
export { makeVaultDirector };
