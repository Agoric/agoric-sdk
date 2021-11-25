// @ts-check

import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

// The StableCoinMachine owns a number of VaultManagers, and a mint for the
// "RUN" stablecoin.
//
// addVaultType is a closely held method that adds a brand new collateral type.
// It specifies the initial exchange rate for that type. It depends on a
// separately specified AMM to provide the ability to liquidate loans that are
// in arrears. We could check that the AMM has sufficient liquidity, but for the
// moment leave that to those participating in the governance process for adding
// new collateral type to ascertain.

import { E } from '@agoric/eventual-send';
import '@agoric/governance/src/exported';

import { makeScalarMap } from '@agoric/store';
import {
  assertProposalShape,
  getAmountOut,
  getAmountIn,
} from '@agoric/zoe/src/contractSupport/index.js';
import { HIGH_FEE, LONG_EXP } from '@agoric/zoe/src/constants.js';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/ratio.js';
import { AmountMath } from '@agoric/ertp';
import { sameStructure } from '@agoric/same-structure';
import { Far } from '@agoric/marshal';

import { makeVaultManager } from './vaultManager.js';
import { makeLiquidationStrategy } from './liquidateMinimum.js';
import { makeMakeCollectFeesInvitation } from './collectRewardFees.js';
import {
  makeVaultParamManager,
  governedParameterTerms as governedParameterLocal,
} from './params.js';

const { quote: q, details: X } = assert;

/** @type {ContractStartFn} */
export async function start(zcf, privateArgs) {
  // loanParams has time limits for charging interest
  const {
    ammPublicFacet,
    priceAuthority,
    loanParams,
    timerService,
    liquidationInstall,
    bootstrapPaymentValue = 0n,
    electionManager,
    governedParams,
  } = zcf.getTerms();
  const governorPublic = E(zcf.getZoeService()).getPublicFacet(electionManager);

  const { feeMintAccess } = privateArgs;
  const runMint = await zcf.registerFeeMint('RUN', feeMintAccess);
  const { issuer: runIssuer, brand: runBrand } = runMint.getIssuerRecord();
  zcf.setTestJig(() => ({
    runIssuerRecord: runMint.getIssuerRecord(),
  }));

  assert.typeof(
    loanParams.chargingPeriod,
    'bigint',
    X`chargingPeriod (${q(loanParams.chargingPeriod)}) must be a BigInt`,
  );
  assert.typeof(
    loanParams.recordingPeriod,
    'bigint',
    X`recordingPeriod (${q(loanParams.recordingPeriod)}) must be a BigInt`,
  );

  assert(
    sameStructure(governedParams, harden(governedParameterLocal)),
    X`Terms ${governedParams} must match ${governedParameterLocal}`,
  );

  const { zcfSeat: rewardPoolSeat } = zcf.makeEmptySeatKit();

  /**
   * We provide an easy way for the vaultManager to add rewards to
   * the rewardPoolSeat, without directly exposing the rewardPoolSeat to them.
   *
   * @type {ReallocateReward}
   */
  function reallocateReward(amount, fromSeat, otherSeat = undefined) {
    rewardPoolSeat.incrementBy(
      fromSeat.decrementBy(
        harden({
          RUN: amount,
        }),
      ),
    );
    if (otherSeat !== undefined) {
      zcf.reallocate(rewardPoolSeat, fromSeat, otherSeat);
    } else {
      zcf.reallocate(rewardPoolSeat, fromSeat);
    }
  }

  /** @type {Store<Brand,VaultManager>} */
  const collateralTypes = makeScalarMap('brand');

  const zoe = zcf.getZoeService();

  /** @type { Store<Brand, VaultParamManager> } */
  const vaultParamManagers = makeScalarMap('brand');

  async function addVaultType(collateralIssuer, collateralKeyword, rates) {
    await zcf.saveIssuer(collateralIssuer, collateralKeyword);
    const collateralBrand = zcf.getBrandForIssuer(collateralIssuer);
    // We create only one vault per collateralType.
    assert(
      !collateralTypes.has(collateralBrand),
      `Collateral brand ${collateralBrand} has already been added`,
    );

    const vaultParamManager = makeVaultParamManager(loanParams, rates);
    vaultParamManagers.init(collateralBrand, vaultParamManager);

    const { creatorFacet: liquidationFacet } = await E(zoe).startInstance(
      liquidationInstall,
      harden({ RUN: runIssuer, Collateral: collateralIssuer }),
      harden({ amm: ammPublicFacet }),
    );
    const liquidationStrategy = makeLiquidationStrategy(liquidationFacet);

    const vm = makeVaultManager(
      zcf,
      runMint,
      collateralBrand,
      priceAuthority,
      vaultParamManager.getParams,
      reallocateReward,
      timerService,
      liquidationStrategy,
    );
    collateralTypes.init(collateralBrand, vm);
    return vm;
  }

  /** Make a loan in the vaultManager based on the collateral type. */
  function makeLoanInvitation() {
    /** @param {ZCFSeat} seat */
    async function makeLoanHook(seat) {
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
      return mgr.makeLoanKit(seat);
    }

    return zcf.makeInvitation(
      makeLoanHook,
      'MakeLoan',
      undefined,
      HIGH_FEE,
      LONG_EXP,
    );
  }

  async function getCollaterals() {
    // should be collateralTypes.map((vm, brand) => ({
    return harden(
      Promise.all(
        collateralTypes.entries().map(async ([brand, vm]) => {
          const priceQuote = await vm.getCollateralQuote();
          return {
            brand,
            interestRate: vm.getInterestRate(),
            liquidationMargin: vm.getLiquidationMargin(),
            initialMargin: vm.getInitialMargin(),
            stabilityFee: vm.getLoanFee(),
            marketPrice: makeRatioFromAmounts(
              getAmountOut(priceQuote),
              getAmountIn(priceQuote),
            ),
          };
        }),
      ),
    );
  }

  // Eventually the reward pool will live elsewhere. For now it's here for
  // bookkeeping. It's needed in tests.
  function getRewardAllocation() {
    return rewardPoolSeat.getCurrentAllocation();
  }

  // TODO(#4021) remove this method
  function mintBootstrapPayment() {
    const {
      zcfSeat: bootstrapZCFSeat,
      userSeat: bootstrapUserSeat,
    } = zcf.makeEmptySeatKit();
    const bootstrapAmount = AmountMath.make(runBrand, bootstrapPaymentValue);
    runMint.mintGains(
      harden({
        Bootstrap: bootstrapAmount,
      }),
      bootstrapZCFSeat,
    );
    bootstrapZCFSeat.exit();
    const bootstrapPayment = E(bootstrapUserSeat).getPayout('Bootstrap');

    /**
     * @param {Amount=} expectedAmount - if provided, assert that the bootstrap
     * payment is at least the expected amount
     */
    function getBootstrapPayment(expectedAmount) {
      if (expectedAmount) {
        assert(
          AmountMath.isGTE(bootstrapAmount, expectedAmount),
          X`${bootstrapAmount} is not at least ${expectedAmount}`,
        );
      }
      return bootstrapPayment;
    }
    return getBootstrapPayment;
  }

  const getParams = paramDesc => {
    return vaultParamManagers.get(paramDesc.collateralBrand).getParams();
  };

  const getRatioParamState = paramDesc => {
    return vaultParamManagers
      .get(paramDesc.collateralBrand)
      .getRatio(paramDesc.parameterName);
  };

  const getNatParamState = paramDesc => {
    return vaultParamManagers
      .get(paramDesc.collateralBrand)
      .getNat(paramDesc.parameterName);
  };

  const publicFacet = Far('stablecoin public facet', {
    makeLoanInvitation,
    getCollaterals,
    // TODO this is in the terms, so could be retrieved from there.
    // This API is here to consider for usability/discoverability
    getRunIssuer() {
      return runIssuer;
    },
    getNatParamState,
    getRatioParamState,
    getParams,
    getContractGovernor: () => governorPublic,
  });

  const { makeCollectFeesInvitation } = makeMakeCollectFeesInvitation(
    zcf,
    rewardPoolSeat,
    runBrand,
  );

  const getParamMgrRetriever = () =>
    Far('paramManagerAccessor', {
      get: paramDesc => {
        return vaultParamManagers.get(paramDesc.collateralBrand);
      },
    });

  /** @type {StablecoinMachine} */
  const stablecoinMachine = Far('stablecoin machine', {
    addVaultType,
    getCollaterals,
    getRewardAllocation,
    getBootstrapPayment: mintBootstrapPayment(),
    makeCollectFeesInvitation,
    getContractGovernor: () => electionManager,
  });

  const stablecoinMachineWrapper = Far('powerful stablecoinMachine wrapper', {
    getParamMgrRetriever,
    getLimitedCreatorFacet: () => stablecoinMachine,
  });

  return harden({
    creatorFacet: stablecoinMachineWrapper,
    publicFacet,
  });
}
