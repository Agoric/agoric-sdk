// @ts-check

import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

// The StableCoinMachine owns a number of VaultManagers, and a mint for the
// "RUN" stablecoin. This overarching SCM will hold ownershipTokens in the
// individual per-type vaultManagers.
//
// makeAddTypeInvitation is a closely held method that adds a brand new
// collateral type. It specifies the initial exchange rate for that type.
//
// a second closely held method (not implemented yet) would add collateral of a
// type for which there is an existing pool. It gets the current price from the
// pool.
//
// ownershipTokens for vaultManagers entitle holders to distributions, but you
// can't redeem them outright, that would drain the utility from the economy.

import { E } from '@agoric/eventual-send';
import '@agoric/governance/src/exported';

import { makeScalarMap } from '@agoric/store';
import {
  assertProposalShape,
  offerTo,
  getAmountOut,
  getAmountIn,
} from '@agoric/zoe/src/contractSupport/index.js';
import { HIGH_FEE, LONG_EXP } from '@agoric/zoe/src/constants.js';
import {
  ceilMultiplyBy,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { AmountMath } from '@agoric/ertp';
import { sameStructure } from '@agoric/same-structure';
import { Far } from '@agoric/marshal';

import { makeTracer } from './makeTracer.js';
import { makeVaultManager } from './vaultManager.js';
import { makeLiquidationStrategy } from './liquidateMinimum.js';
import { makeMakeCollectFeesInvitation } from './collectRewardFees.js';
import {
  makePoolParamManager,
  makeFeeParamManager,
  PROTOCOL_FEE_KEY,
  POOL_FEE_KEY,
  governedParameterTerms as governedParameterLocal,
  ParamKey,
} from './params.js';

const { quote: q, details: X } = assert;

const trace = makeTracer('ST');

// The StableCoinMachine owns a number of VaultManagers, and a mint for the
// "RUN" stablecoin. This overarching SCM will hold ownershipTokens in the
// individual per-type vaultManagers.
//
// makeAddTypeInvitation is a closely held method that adds a brand new
// collateral type. It specifies the initial exchange rate for that type.
//
// a second closely held method (not implemented yet) would add collateral of a
// type for which there is an existing pool. It gets the current price from the
// pool.
//
// ownershipTokens for vaultManagers entitle holders to distributions, but you
// can't redeem them outright; that would drain the utility from the economy.

/** @type {ContractStartFn} */
export async function start(zcf, privateArgs) {
  // loanParams has time limits for charging interest
  const {
    autoswapInstall,
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
    X`Terms must match ${governedParameterLocal}`,
  );
  const feeParams = makeFeeParamManager(loanParams);

  const [runMint, govMint] = await Promise.all([
    zcf.registerFeeMint('RUN', feeMintAccess),
    zcf.makeZCFMint('Governance', undefined, harden({ decimalPlaces: 6 })),
  ]);
  const { issuer: runIssuer, brand: runBrand } = runMint.getIssuerRecord();

  const { brand: govBrand } = govMint.getIssuerRecord();

  // This is a stand-in for a reward pool. For now, it's a place to squirrel
  // away fees so the tests show that the funds have been removed.
  const { zcfSeat: rewardPoolSeat } = zcf.makeEmptySeatKit();

  /**
   * We provide an easy way for the vaultManager and vaults to add rewards to
   * the rewardPoolSeat, without directly exposing the rewardPoolSeat to them.
   *
   * @type {ReallocateReward}
   */
  function reallocateReward(amount, fromSeat, otherSeat = undefined) {
    rewardPoolSeat.incrementBy(
      fromSeat.decrementBy({
        RUN: amount,
      }),
    );
    if (otherSeat !== undefined) {
      zcf.reallocate(rewardPoolSeat, fromSeat, otherSeat);
    } else {
      zcf.reallocate(rewardPoolSeat, fromSeat);
    }
  }

  /** @type {Store<Brand,VaultManager>} */
  const collateralTypes = makeScalarMap('brand'); // Brand -> vaultManager

  const zoe = zcf.getZoeService();

  // we assume the multipool-autoswap is public, so folks can buy/sell
  // through it without our involvement
  // Should it use creatorFacet, creatorInvitation, instance?
  /** @type {{ publicFacet: MultipoolAutoswapPublicFacet, instance: Instance,
   *  creatorFacet: MultipoolAutoswapCreatorFacet }} */
  const {
    publicFacet: autoswapAPI,
    instance: autoswapInstance,
    creatorFacet: autoswapCreatorFacet,
  } = await E(zoe).startInstance(
    autoswapInstall,
    { Central: runIssuer },
    {
      timer: timerService,
      // TODO(#3862): make the AMM use a paramManager. For now, the values
      //  are fixed after creation of an autoswap instance.
      poolFee: feeParams.getParam(POOL_FEE_KEY).value,
      protocolFee: feeParams.getParam(PROTOCOL_FEE_KEY).value,
    },
  );

  /** @type { Store<Brand, PoolParamManager> } */
  const poolParamManagers = makeScalarMap('brand');

  // We process only one offer per collateralType. They must tell us the
  // dollar value of their collateral, and we create that many RUN.
  // collateralKeyword = 'aEth'
  async function makeAddTypeInvitation(
    collateralIssuer,
    collateralKeyword,
    rates,
  ) {
    await zcf.saveIssuer(collateralIssuer, collateralKeyword);
    const collateralBrand = zcf.getBrandForIssuer(collateralIssuer);
    assert(!collateralTypes.has(collateralBrand));

    const poolParamManager = makePoolParamManager(loanParams, rates);
    poolParamManagers.init(collateralBrand, poolParamManager);

    const { creatorFacet: liquidationFacet } = await E(zoe).startInstance(
      liquidationInstall,
      { RUN: runIssuer },
      { autoswap: autoswapAPI },
    );

    async function addTypeHook(seat) {
      assertProposalShape(seat, {
        give: { Collateral: null },
        want: { Governance: null },
      });
      const {
        give: { Collateral: collateralIn },
        want: { Governance: _govOut }, // ownership of the whole stablecoin machine
      } = seat.getProposal();
      assert(!collateralTypes.has(collateralBrand));
      // initialPrice is in rates, but only used at creation, so not in governor
      const runAmount = ceilMultiplyBy(collateralIn, rates.initialPrice);
      // arbitrarily, give governance tokens equal to RUN tokens
      const govAmount = AmountMath.make(runAmount.value, govBrand);

      // Create new governance tokens, trade them with the incoming offer for
      // collateral. The offer uses the keywords Collateral and Governance.
      // govSeat stores the collateral as Secondary. We then mint new RUN for
      // govSeat and store them as Central. govSeat then creates a liquidity
      // pool for autoswap, trading in Central and Secondary for governance
      // tokens as Liquidity. These governance tokens are held by govSeat
      const { zcfSeat: govSeat } = zcf.makeEmptySeatKit();
      // TODO this should create the seat for us
      govMint.mintGains({ Governance: govAmount }, govSeat);

      // trade the governance tokens for collateral, putting the
      // collateral on Secondary to be positioned for Autoswap
      seat.incrementBy(govSeat.decrementBy({ Governance: govAmount }));
      seat.decrementBy({ Collateral: collateralIn });
      govSeat.incrementBy({ Secondary: collateralIn });

      zcf.reallocate(govSeat, seat);
      // the collateral is now on the temporary seat

      // once we've done that, we can put both the collateral and the minted
      // RUN into the autoswap, giving us liquidity tokens, which we store

      // mint the new RUN to the Central position on the govSeat
      // so we can setup the autoswap pool
      runMint.mintGains({ Central: runAmount }, govSeat);

      // TODO: check for existing pool, use its price instead of the
      // user-provided 'rate'. Or throw an error if it already exists.
      // `addPool` should combine initial liquidity with pool setup

      const liquidityIssuer = await E(autoswapAPI).addPool(
        collateralIssuer,
        collateralKeyword,
      );
      const { brand: liquidityBrand } = await zcf.saveIssuer(
        liquidityIssuer,
        `${collateralKeyword}_Liquidity`,
      );

      // inject both the collateral and the RUN into the new autoswap, to
      // provide the initial liquidity pool
      const liqProposal = harden({
        give: {
          Secondary: collateralIn,
          Central: runAmount,
        },
        want: { Liquidity: AmountMath.makeEmpty(liquidityBrand) },
      });
      const liqInvitation = E(autoswapAPI).makeAddLiquidityInvitation();

      const { deposited } = await offerTo(
        zcf,
        liqInvitation,
        undefined,
        liqProposal,
        govSeat,
      );

      const depositValue = await deposited;

      // TODO(hibbert): make use of these assets (Liquidity: 19899 Aeth)
      trace('depositValue', depositValue);

      const liquidationStrategy = makeLiquidationStrategy(liquidationFacet);

      // do something with the liquidity we just bought
      const vm = makeVaultManager(
        zcf,
        autoswapAPI,
        runMint,
        collateralBrand,
        priceAuthority,
        poolParamManager.getParams,
        reallocateReward,
        timerService,
        liquidationStrategy,
      );
      collateralTypes.init(collateralBrand, vm);
      return vm;
    }

    return zcf.makeInvitation(addTypeHook, 'AddCollateralType');
  }

  /**
   * Make a loan in the vaultManager based on the collateral type.
   */
  function makeLoanInvitation() {
    /**
     * @param {ZCFSeat} seat
     */
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

  zcf.setTestJig(() => ({
    runIssuerRecord: runMint.getIssuerRecord(),
    govIssuerRecord: govMint.getIssuerRecord(),
    autoswap: autoswapAPI,
  }));

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

  function mintBootstrapPayment() {
    const {
      zcfSeat: bootstrapZCFSeat,
      userSeat: bootstrapUserSeat,
    } = zcf.makeEmptySeatKit();
    const bootstrapAmount = AmountMath.make(runBrand, bootstrapPaymentValue);
    runMint.mintGains(
      {
        Bootstrap: bootstrapAmount,
      },
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
    switch (paramDesc.key) {
      case ParamKey.FEE:
        return feeParams.getParams();
      case ParamKey.POOL:
        return poolParamManagers.get(paramDesc.collateralBrand).getParams();
      default:
        throw Error(`Unrecognized param key for Params '${paramDesc.key}'`);
    }
  };

  const getParamState = paramDesc => {
    switch (paramDesc.keyl) {
      case ParamKey.FEE:
        return feeParams.getParam(paramDesc.parameterName);
      case ParamKey.POOL:
        return poolParamManagers
          .get(paramDesc.collateralBrand)
          .getParam(paramDesc.parameterName);
      default:
        throw Error(`Unrecognized param key for State '${paramDesc.key}'`);
    }
  };

  const publicFacet = Far('stablecoin public facet', {
    getAMM() {
      return autoswapInstance;
    },
    makeLoanInvitation,
    getCollaterals,
    // TODO this is in the terms, so could be retrieved from there.
    // This API is here to consider for usability/discoverability
    getRunIssuer() {
      return runIssuer;
    },
    getParamState,
    getParams,
    getContractGovernor: () => governorPublic,
  });

  const { makeCollectFeesInvitation } = makeMakeCollectFeesInvitation(
    zcf,
    rewardPoolSeat,
    autoswapCreatorFacet,
    runBrand,
  );

  const getParamMgrRetriever = () =>
    Far('paramManagerAccessor', {
      get: paramDesc => {
        switch (paramDesc.key) {
          case ParamKey.FEE:
            return feeParams;
          case ParamKey.POOL:
            return poolParamManagers.get(paramDesc.collateralBrand);
          default:
            throw Error(
              `Unrecognized param key for accessor '${paramDesc.key}'`,
            );
        }
      },
    });

  /** @type {StablecoinMachine} */
  const stablecoinMachine = Far('stablecoin machine', {
    makeAddTypeInvitation,
    getAMM() {
      return autoswapInstance;
    },
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
    ParamKey,
  });
}
