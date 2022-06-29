// @ts-check

import { E } from '@endo/eventual-send';
import { AmountMath, AssetKind } from '@agoric/ertp';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';
import { makePromiseKit } from '@endo/promise-kit';

import { definePoolKind } from './pool.js';

const { details: X } = assert;

const DISPLAY_INFO = harden({ decimalPlaces: 6 });

/**
 * @param {ZCF} zcf
 * @param {(Brand) => boolean} isInSecondaries
 * @param {WeakStore<Brand,ZCFMint>} brandToLiquidityMint
 * @param {WeakStore<Brand,ERef<Issuer>>} brandToLiquidityIssuer
 * @param {() => (secondaryBrand: Brand) => Promise<void>} getAddIssuerToReserve
 */
export const makeAddIssuer = (
  zcf,
  isInSecondaries,
  brandToLiquidityMint,
  brandToLiquidityIssuer,
  getAddIssuerToReserve,
) => {
  /**
   * Add a new issuer. If we previously received a request for the same issuer,
   * we'll return the issuer or a promise for it.
   *
   * @param {Issuer} secondaryIssuer
   * @param {string} keyword
   */
  return async (secondaryIssuer, keyword) => {
    const [secondaryAssetKind, secondaryBrand] = await Promise.all([
      E(secondaryIssuer).getAssetKind(),
      E(secondaryIssuer).getBrand(),
    ]);
    // AWAIT ///////////////

    assert(
      secondaryAssetKind === AssetKind.NAT,
      X`${keyword} asset not fungible (must use NAT math)`,
    );

    if (brandToLiquidityIssuer.has(secondaryBrand)) {
      return brandToLiquidityIssuer.get(secondaryBrand);
    }

    assert(
      !isInSecondaries(secondaryBrand),
      X`issuer ${secondaryIssuer} already has a pool`,
    );

    if (brandToLiquidityMint.has(secondaryBrand)) {
      const { issuer } = brandToLiquidityMint
        .get(secondaryBrand)
        .getIssuerRecord();
      return issuer;
    }

    /** @type {import('@endo/promise-kit').PromiseKit<Issuer<'nat'>>} */
    const liquidityPromiseKit = makePromiseKit();
    brandToLiquidityIssuer.init(secondaryBrand, liquidityPromiseKit.promise);

    const liquidityKeyword = `${keyword}Liquidity`;
    zcf.assertUniqueKeyword(liquidityKeyword);

    return Promise.all([
      zcf.saveIssuer(secondaryIssuer, keyword),
      zcf.makeZCFMint(liquidityKeyword, AssetKind.NAT, DISPLAY_INFO),
    ])
      .then(([issuer, mint]) => {
        console.log(
          X`Saved issuer ${secondaryIssuer} to keyword ${keyword} and got back ${issuer}`,
        );
        // this ensures that getSecondaryIssuer(thisIssuer) will return even
        // before the pool is created
        brandToLiquidityMint.init(secondaryBrand, mint);
        const { issuer: liquidityIssuer } = mint.getIssuerRecord();
        liquidityPromiseKit.resolve(liquidityIssuer);
        // we only need entries in this table until brandToLiquidityIssuer knows
        // the issuer and the promise is resolved.
        brandToLiquidityIssuer.delete(secondaryBrand);

        // defer lookup until necessary. more aligned with governed
        // param we expect this to be eventually.
        const addIssuerToReserve = getAddIssuerToReserve();

        // tell the reserve about this brand, which it will validate by
        // calling back to AMM for the issuer
        return addIssuerToReserve(secondaryBrand).then(() => liquidityIssuer);
      })
      .catch(e => {
        console.error(
          X`Failure Saving issuer ${secondaryIssuer}. Not added to Reserve`,
        );
        liquidityPromiseKit.reject(e);
        brandToLiquidityIssuer.delete(secondaryBrand);
        brandToLiquidityMint.delete(secondaryBrand);
        throw e;
      });
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
 * @param {WeakStore<Brand,ZCFMint>} brandToLiquidityMint
 * @param {(secondaryBrand: Brand, reserveLiquidityTokenSeat: ZCFSeat, liquidityKeyword: Keyword) => Promise<void>} onOfferHandled
 * @param {ERef<StorageNode>} [storageNode]
 * @param {ERef<Marshaller>} [marshaller]
 */
export const makeAddPoolInvitation = (
  zcf,
  initPool,
  centralBrand,
  timer,
  quoteIssuerKit,
  params,
  protocolSeat,
  brandToLiquidityMint,
  onOfferHandled,
  storageNode,
  marshaller,
) => {
  const makePool = definePoolKind(
    zcf,
    centralBrand,
    timer,
    quoteIssuerKit,
    params,
    protocolSeat,
    storageNode,
    marshaller,
  );

  /** @type {(Brand) => Promise<{poolFacets: PoolFacets, liquidityZcfMint: ZCFMint}>} */
  const addPool = async secondaryBrand => {
    const liquidityZcfMint = brandToLiquidityMint.get(secondaryBrand);

    const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();
    /** @type {PoolFacets} */
    const poolFacets = makePool(liquidityZcfMint, poolSeat, secondaryBrand);

    initPool(secondaryBrand, poolFacets);
    return { liquidityZcfMint, poolFacets };
  };

  /** @param {ZCFSeat} seat */
  const handleAddPoolOffer = async seat => {
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

    assert(
      AmountMath.isGTE(centralAmount, minPoolLiquidity),
      X`The minimum initial liquidity is ${minPoolLiquidity}, rejecting ${centralAmount}`,
    );
    const minLiqAmount = AmountMath.make(
      liquidityBrand,
      minPoolLiquidity.value,
    );

    // @ts-expect-error find might return undefined
    const [liquidityKeyword] = Object.entries(zcf.getTerms().issuers).find(
      ([_, i]) => i === issuer,
    );
    assert(liquidityKeyword, 'liquidity brand required');

    // COMMIT POINT /////////////////////

    const {
      poolFacets: { pool, helper },
    } = await addPool(secondaryBrand);

    // in addLiquidityInternal, funder provides centralAmount & secondaryAmount,
    // and receives liquidity tokens equal to centralAmount. Afterward, we'll
    // transfer minPoolLiquidity in tokens from the funder to the reserve.
    helper.addLiquidityInternal(seat, secondaryAmount, centralAmount);

    seat.decrementBy({ Liquidity: minLiqAmount });
    const { zcfSeat: reserveLiquidityTokenSeat } = zcf.makeEmptySeatKit();
    reserveLiquidityTokenSeat.incrementBy({ [liquidityKeyword]: minLiqAmount });
    zcf.reallocate(reserveLiquidityTokenSeat, seat);
    seat.exit();
    pool.updateState();

    await onOfferHandled(
      secondaryBrand,
      reserveLiquidityTokenSeat,
      liquidityKeyword,
    );
    return 'Added liquidity.';
  };

  return () => zcf.makeInvitation(handleAddPoolOffer, 'Add Pool and Liquidity');
};
