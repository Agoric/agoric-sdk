// @ts-check

import { E } from '@endo/eventual-send';
import { AmountMath, AssetKind } from '@agoric/ertp';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';

import { definePoolKind } from './pool.js';

const { details: X } = assert;

const DISPLAY_INFO = harden({ decimalPlaces: 6 });

/**
 * @param {ZCF} zcf
 * @param {(Brand) => boolean} isInSecondaries
 * @param {import('@agoric/store/src/stores/store-utils.js').AtomicProvider<Brand, ZCFMint>} brandToLiquidityMintProvider
 * @param {() => (secondaryBrand: Brand) => Promise<void>} getAddIssuerToReserve
 */
export const makeAddIssuer = (
  zcf,
  isInSecondaries,
  brandToLiquidityMintProvider,
  getAddIssuerToReserve,
) => {
  /**
   * Add a new issuer. If we previously received a request for the same issuer,
   * we'll return the issuer or a promise for it.
   *
   * @param {Issuer} secondaryIssuer
   * @param {string} keyword
   */
  const addIssuer = async (secondaryIssuer, keyword) => {
    const [secondaryAssetKind, secondaryBrand] = await Promise.all([
      E(secondaryIssuer).getAssetKind(),
      E(secondaryIssuer).getBrand(),
    ]);
    // AWAIT ///////////////

    assert(
      secondaryAssetKind === AssetKind.NAT,
      X`${keyword} asset not fungible (must use NAT math)`,
    );

    /** @type {(brand: Brand) => Promise<ZCFMint>} */
    const makeLiquidityMint = brand => {
      assert(
        !isInSecondaries(brand),
        X`issuer ${secondaryIssuer} already has a pool`,
      );

      const liquidityKeyword = `${keyword}Liquidity`;
      zcf.assertUniqueKeyword(liquidityKeyword);

      return E.when(
        Promise.all([
          zcf.saveIssuer(secondaryIssuer, keyword),
          zcf.makeZCFMint(liquidityKeyword, AssetKind.NAT, DISPLAY_INFO),
        ]),
        ([issuer, mint]) => {
          console.log(
            X`Saved issuer ${secondaryIssuer} to keyword ${keyword} and got back ${issuer}`,
          );
          return mint;
        },
      ).catch(e => {
        console.error(
          X`Failure Saving issuer ${secondaryIssuer}. Not added to Reserve`,
        );
        throw e;
      });
    };

    /** @type {(brand: Brand) => Promise<void>} */
    const finish = brand => {
      // defer lookup until necessary. more aligned with governed
      // param we expect this to be eventually.
      const addIssuerToReserve = getAddIssuerToReserve();

      // tell the reserve about this brand, which it will validate by
      // calling back to AMM for the issuer
      return addIssuerToReserve(brand);
    };

    return brandToLiquidityMintProvider
      .provideAsync(secondaryBrand, makeLiquidityMint, finish)
      .then(mint => mint.getIssuerRecord().issuer);
  };

  return addIssuer;
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
