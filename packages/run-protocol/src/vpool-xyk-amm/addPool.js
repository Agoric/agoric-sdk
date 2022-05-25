// @ts-check

import { E } from '@endo/eventual-send';
import { AmountMath, AssetKind } from '@agoric/ertp';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';

import { definePoolKind } from './pool.js';

const { details: X } = assert;

/**
 * @param {ZCF} zcf
 * @param {(Brand) => boolean} isInSecondaries
 * @param {WeakStore<Brand,ZCFMint>} brandToLiquidityMint
 */
export const makeAddIssuer = (zcf, isInSecondaries, brandToLiquidityMint) => {
  /**
   * @param {Issuer} secondaryIssuer
   * @param {string} keyword
   */
  return async (secondaryIssuer, keyword) => {
    const [secondaryAssetKind, secondaryBrand] = await Promise.all([
      E(secondaryIssuer).getAssetKind(),
      E(secondaryIssuer).getBrand(),
    ]);

    assert(
      !isInSecondaries(secondaryBrand),
      X`issuer ${secondaryIssuer} already has a pool`,
    );
    assert(
      secondaryAssetKind === AssetKind.NAT,
      X`${keyword} asset not fungible (must use NAT math)`,
    );
    const liquidityKeyword = `${keyword}Liquidity`;
    zcf.assertUniqueKeyword(liquidityKeyword);

    return E.when(
      zcf.makeZCFMint(
        liquidityKeyword,
        AssetKind.NAT,
        harden({ decimalPlaces: 6 }),
      ),
      /** @param {ZCFMint} mint */
      async mint => {
        await zcf.saveIssuer(secondaryIssuer, keyword);
        brandToLiquidityMint.init(secondaryBrand, mint);
        const { issuer: liquidityIssuer } = mint.getIssuerRecord();
        return liquidityIssuer;
      },
    );
  };
};

/**
 * @param {ZCF<import('./multipoolMarketMaker.js').AMMTerms>} zcf
 * @param {(brand: Brand, pool: PoolFacets) => void} initPool add new pool to store
 * @param {Brand} centralBrand
 * @param {ERef<Timer>} timer
 * @param {IssuerKit} quoteIssuerKit
 * @param {import('./multipoolMarketMaker.js').AMMParamGetters} params retrieve governed params
 * @param {ZCFSeat} protocolSeat seat that holds collected fees
 * @param {ZCFSeat} reserveLiquidityTokenSeat seat that holds liquidity tokens
 *   from adding pool liquidity. It is expected to be collected by the Reserve.
 * @param {WeakStore<Brand,ZCFMint>} brandToLiquidityMint
 * @param {() => void} updateMetrics
 */
export const makeAddPoolInvitation = (
  zcf,
  initPool,
  centralBrand,
  timer,
  quoteIssuerKit,
  params,
  protocolSeat,
  reserveLiquidityTokenSeat,
  brandToLiquidityMint,
  updateMetrics,
) => {
  // TODO: get this as an argument from start()
  const makePool = definePoolKind(
    zcf,
    centralBrand,
    timer,
    quoteIssuerKit,
    params,
    protocolSeat,
  );

  /** @type {(Brand) => Promise<{poolFacets: PoolFacets, liquidityZcfMint: ZCFMint}>} */
  const addPool = async secondaryBrand => {
    const liquidityZcfMint = brandToLiquidityMint.get(secondaryBrand);

    const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();
    /** @type {PoolFacets} */
    const poolFacets = makePool(liquidityZcfMint, poolSeat, secondaryBrand);

    initPool(secondaryBrand, poolFacets);
    updateMetrics();
    return { liquidityZcfMint, poolFacets };
  };

  /** @param {ZCFSeat} seat */
  const addPoolAndLiquidityHandler = async seat => {
    assertProposalShape(seat, {
      give: { Central: null, Secondary: null },
    });

    const {
      give: { Central: centralAmount, Secondary: secondaryAmount },
      want: proposalWant,
    } = seat.getProposal();
    const secondaryBrand = secondaryAmount.brand;

    const { brand: liquidityBrand, issuer } = brandToLiquidityMint
      .get(secondaryBrand)
      .getIssuerRecord();

    const minPoolLiquidity = params.getMinInitialPoolLiquidity();

    if (proposalWant.Liquidity) {
      const { Liquidity: wantLiquidityAmount } = proposalWant;
      const centralAboveMinimum =
        // @ts-expect-error central is NAT
        centralAmount.value - minPoolLiquidity.value;
      // when providing initial liquidity, the liquidity tokens issued will be
      // equal to the central provided. Here, the reserve gets the minimum
      const funderLiquidityAmount = AmountMath.make(
        liquidityBrand,
        centralAboveMinimum,
      );

      assert(
        AmountMath.isGTE(funderLiquidityAmount, wantLiquidityAmount),
        X`Requested too many liquidity tokens (${wantLiquidityAmount}, max: ${funderLiquidityAmount}`,
      );
    }

    const {
      poolFacets: { pool, helper },
    } = await addPool(secondaryBrand);

    assert(
      AmountMath.isGTE(centralAmount, minPoolLiquidity),
      `The minimum initial liquidity is ${minPoolLiquidity}, rejecting ${centralAmount}`,
    );
    const minLiqAmount = AmountMath.make(
      liquidityBrand,
      minPoolLiquidity.value,
    );

    // @ts-expect-error find might return undefined
    const [liquidityKeyword] = Object.entries(zcf.getTerms().issuers).find(
      ([_, i]) => i === issuer,
    );

    // in addLiquidityInternal, funder provides centralAmount & secondaryAmount,
    // and receives liquidity tokens equal to centralAmount. Afterward, we'll
    // transfer minPoolLiquidity in tokens from the funder to the reserve.
    helper.addLiquidityInternal(seat, secondaryAmount, centralAmount);

    seat.decrementBy({ Liquidity: minLiqAmount });
    reserveLiquidityTokenSeat.incrementBy({ [liquidityKeyword]: minLiqAmount });
    zcf.reallocate(reserveLiquidityTokenSeat, seat);
    seat.exit();
    pool.updateState();
    brandToLiquidityMint.delete(secondaryBrand);

    return 'Added liquidity.';
  };

  return () =>
    zcf.makeInvitation(addPoolAndLiquidityHandler, 'Add Pool and Liquidity');
};
