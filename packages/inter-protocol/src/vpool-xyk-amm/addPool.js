import { E } from '@endo/eventual-send';
import { AmountMath, AssetKind } from '@agoric/ertp';
import {
  assertProposalShape,
  atomicTransfer,
} from '@agoric/zoe/src/contractSupport/index.js';

import { definePoolKind } from './pool.js';

const { quote: q, Fail } = assert;

const DISPLAY_INFO = harden({ decimalPlaces: 6 });

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * @param {ZCF} zcf
 * @param {(Brand) => boolean} isInSecondaries
 * @param {import('@agoric/store/src/stores/store-utils.js').AtomicProvider<Brand<'nat'>, ZCFMint<'nat'>>} brandToLiquidityMintProvider
 * @param {() => (secondaryBrand: Brand<'nat'>) => Promise<void>} getAddIssuerToReserve
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
   * @param {import('./pool.js').MethodContext} _context
   * @param {Issuer<'nat'>} secondaryIssuer
   * @param {string} keyword
   */
  const addIssuer = async (_context, secondaryIssuer, keyword) => {
    const [secondaryAssetKind, secondaryBrand] = await Promise.all([
      E(secondaryIssuer).getAssetKind(),
      E(secondaryIssuer).getBrand(),
    ]);
    // AWAIT ///////////////
    secondaryAssetKind === AssetKind.NAT ||
      Fail`${q(keyword)} asset not fungible (must use NAT math)`;

    /** @type {(brand: Brand<'nat'>) => Promise<ZCFMint<'nat'>>} */
    const makeLiquidityMint = brand => {
      !isInSecondaries(brand) ||
        Fail`issuer ${secondaryIssuer} already has a pool`;

      const liquidityKeyword = `${keyword}Liquidity`;
      zcf.assertUniqueKeyword(liquidityKeyword);

      return E.when(
        Promise.all([
          zcf.saveIssuer(secondaryIssuer, keyword),
          zcf.makeZCFMint(liquidityKeyword, AssetKind.NAT, DISPLAY_INFO),
        ]),
        ([issuer, mint]) => {
          console.log(
            `Saved issuer ${secondaryIssuer} to keyword ${keyword} and got back ${issuer}`,
          );
          return mint;
        },
      ).catch(e => {
        console.error(
          `Failure Saving issuer ${secondaryIssuer}. Not added to Reserve`,
        );
        throw e;
      });
    };

    /** @type {(brand: Brand<'nat'>) => Promise<void>} */
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
 * @param {Baggage} baggage
 * @param {import('./multipoolMarketMaker.js').AmmPowers} ammPowers
 * @param {(secondaryBrand: Brand, reserveLiquidityTokenSeat: ZCFSeat, liquidityKeyword: Keyword) => Promise<void>} onOfferHandled
 * @param {ERef<StorageNode>} storageNode
 * @param {ERef<Marshaller>} marshaller
 */
export const makeAddPoolInvitation = (
  baggage,
  ammPowers,
  onOfferHandled,
  storageNode,
  marshaller,
) => {
  const { zcf } = ammPowers;
  const makePool = definePoolKind(baggage, ammPowers, storageNode, marshaller);

  /** @type {(Brand) => Promise<{poolFacets: PoolFacets, liquidityZcfMint: ZCFMint}>} */
  const addPool = async secondaryBrand => {
    const liquidityZcfMint =
      ammPowers.secondaryBrandToLiquidityMint.get(secondaryBrand);

    const { zcfSeat: poolSeat } = ammPowers.zcf.makeEmptySeatKit();
    const poolFacets = makePool(liquidityZcfMint, poolSeat, secondaryBrand);

    ammPowers.secondaryBrandToPool.init(secondaryBrand, poolFacets);
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

    const { brand: liquidityBrand, issuer } =
      ammPowers.secondaryBrandToLiquidityMint
        .get(secondaryBrand)
        .getIssuerRecord();

    /** @type {Amount<'nat'>} */
    // @ts-expect-error cast governance types
    const minPoolLiquidity = ammPowers.params.getMinInitialPoolLiquidity();

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
      AmountMath.isGTE(funderLiquidityAmount, wantLiquidityAmount) ||
        Fail`Requested too many liquidity tokens (${wantLiquidityAmount}, max: ${funderLiquidityAmount}`;
    }
    AmountMath.isGTE(centralAmount, minPoolLiquidity) ||
      Fail`The minimum initial liquidity is ${minPoolLiquidity}, rejecting ${centralAmount}`;
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

    const { zcfSeat: reserveLiquidityTokenSeat } = zcf.makeEmptySeatKit();
    atomicTransfer(
      zcf,
      seat,
      reserveLiquidityTokenSeat,
      { Liquidity: minLiqAmount },
      { [liquidityKeyword]: minLiqAmount },
    );

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
