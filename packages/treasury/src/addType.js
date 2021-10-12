// @ts-check

import { E } from '@agoric/eventual-send';
import {
  assertProposalShape,
  ceilMultiplyBy,
  offerTo,
} from '@agoric/zoe/src/contractSupport';
import { AmountMath } from '@agoric/ertp';
import { makeLiquidationStrategy } from './liquidateMinimum';
import { makeVaultManager } from './vaultManager';
import { makePoolParamManager } from './params';
import { makeTracer } from './makeTracer';

const trace = makeTracer('ST');

const makeMakeAddTypeInvitation = (
  zcf,
  poolParamManagers,
  rewardPoolSeat,
  autoswapAPI,
  collateralTypes,
  runKit,
  govKit,
) => {
  // We process only one offer per collateralType. They must tell us the
  // dollar value of their collateral, and we create that many RUN.
  // collateralKeyword = 'aEth'
  return async (collateralIssuer, collateralKeyword, rates) => {
    await zcf.saveIssuer(collateralIssuer, collateralKeyword);

    const {
      priceAuthority,
      loanParams,
      timerService,
      liquidationInstall,
    } = zcf.getTerms();

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

    const collateralBrand = zcf.getBrandForIssuer(collateralIssuer);
    assert(!collateralTypes.has(collateralBrand));

    const poolParamManager = makePoolParamManager(loanParams, rates);
    poolParamManagers.init(collateralBrand, poolParamManager);

    const { creatorFacet: liquidationFacet } = await E(
      zcf.getZoeService(),
    ).startInstance(
      liquidationInstall,
      { RUN: runKit.issuer },
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
      const govAmount = AmountMath.make(runAmount.value, govKit.brand);

      // Create new governance tokens, trade them with the incoming offer for
      // collateral. The offer uses the keywords Collateral and Governance.
      // govSeat stores the collateral as Secondary. We then mint new RUN for
      // govSeat and store them as Central. govSeat then creates a liquidity
      // pool for autoswap, trading in Central and Secondary for governance
      // tokens as Liquidity. These governance tokens are held by govSeat
      const { zcfSeat: govSeat } = zcf.makeEmptySeatKit();
      // TODO this should create the seat for us
      govKit.mint.mintGains({ Governance: govAmount }, govSeat);

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
      runKit.mint.mintGains({ Central: runAmount }, govSeat);

      // TODO: check for existing pool, use its price instead of the
      // user-provided 'rate'. Or throw an error if it already exists.
      // `addPool` should combine initial liquidity with pool setup

      const liquidityIssuer = await E(autoswapAPI).addPool(
        collateralIssuer,
        collateralKeyword,
      );
      const { brand: liquidityBrand } = await zcf.saveIssuer(
        liquidityIssuer,
        `${collateralKeyword}Liquidity`,
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
        runKit.mint,
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
  };
};

const makeAddTypeNoAmm = (
  zcf,
  poolParamManagers,
  rewardPoolSeat,
  issuers,
  autoswapAPI,
  collateralTypes,
  runKit,
) => {
  // We process only one offer per collateralType. They must tell us the
  // dollar value of their collateral, and we create that many RUN.
  // collateralKeyword = 'aEth'
  return async (collateralIssuer, collateralKeyword, rates) => {
    await zcf.saveIssuer(collateralIssuer, collateralKeyword);

    const {
      priceAuthority,
      loanParams,
      timerService,
      liquidationInstall,
    } = zcf.getTerms();

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

    const collateralBrand = zcf.getBrandForIssuer(collateralIssuer);
    assert(!collateralTypes.has(collateralBrand));

    const poolParamManager = makePoolParamManager(loanParams, rates);
    poolParamManagers.init(collateralBrand, poolParamManager);

    const { creatorFacet: liquidationFacet } = await E(
      zcf.getZoeService(),
    ).startInstance(
      liquidationInstall,
      { RUN: issuers.run },
      { autoswap: autoswapAPI },
    );

    const liquidationStrategy = makeLiquidationStrategy(liquidationFacet);

    // do something with the liquidity we just bought
    const vm = makeVaultManager(
      zcf,
      autoswapAPI,
      runKit.mint,
      collateralBrand,
      priceAuthority,
      poolParamManager.getParams,
      reallocateReward,
      timerService,
      liquidationStrategy,
    );
    collateralTypes.init(collateralBrand, vm);
    return vm;
  };
};

harden(makeMakeAddTypeInvitation);
harden(makeAddTypeNoAmm);

export { makeMakeAddTypeInvitation, makeAddTypeNoAmm };
