// @ts-check

import { assert, details as X } from '@agoric/assert';
import { makeWeakStore } from '@agoric/store';
import { Far } from '@agoric/marshal';

import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { assertIssuerKeywords } from '../../contractSupport';
import { makeAddPool } from './pool.js';
import { makeMakeAddLiquidityInvitation } from './addLiquidity.js';
import { makeMakeRemoveLiquidityInvitation } from './removeLiquidity.js';

import '../../../exported.js';
import { makeMakeCollectFeesInvitation } from '../newSwap/collectFees.js';
import { makeMakeSwapInvitation } from './swap';
import { makeDoublePool } from './doublePool';

/**
 * Multipool AMM is a rewrite of Uniswap that supports multiple liquidity pools,
 * and direct exchanges across pools. Please see the documentation for more:
 * https://agoric.com/documentation/zoe/guide/contracts/multipoolAMM.html It
 * also uses a unique approach to charging fees. Each pool grows on every trade,
 * and a protocolFee is also extracted.
 *
 * We expect that this contract will have tens to hundreds of issuers.  Each
 * liquidity pool is between the central token and a secondary token. Secondary
 * tokens can be exchanged with each other, but only through the central
 * token. For example, if X and Y are two token types and C is the central
 * token, a swap giving X and wanting Y would first use the pool (X, C) then the
 * pool (Y, C). There are no liquidity pools directly between two secondary
 * tokens.
 *
 * There should only need to be one instance of this contract, so liquidity can
 * be shared as much as possible.
 *
 * When the contract is instantiated, the central token is specified in the
 * terms. Separate invitations are available by calling methods on the
 * publicFacet for adding and removing liquidity and for making trades. Other
 * publicFacet operations support querying prices and the sizes of pools. New
 * Pools can be created with addPool().
 *
 * When making trades or requesting prices, the caller must specify either a
 * maximum input amount (swapIn, getInputPrice) or a minimum output amount
 * (swapOut, getOutPutPrice) or both. For swaps, the required keywords are `In`
 * for the trader's `give` amount, and `Out` for the trader's `want` amount.
 * getInputPrice and getOutputPrice each take two Amounts. The price functions
 * return both amountIn (which may be lower than the original amount) and
 * amountOut (which may be higher). When both prices are specified, no swap will
 * be made (and no price provided) if both restrictions can't be honored.
 *
 * When adding and removing liquidity, the keywords are Central, Secondary, and
 * Liquidity. adding liquidity has Central and Secondary in the `give` section,
 * while removing liquidity has `want` and `give` swapped.
 *
 * Transactions that don't require an invitation include addPool and the
 * queries: getInputPrice, getOutputPrice, getPoolAllocation,
 * getLiquidityIssuer, and getLiquiditySupply.
 *
 * @type {ContractStartFn}
 */
const start = zcf => {
  /**
   * This contract must have a "Central" keyword and issuer in the
   * IssuerKeywordRecord.
   *
   * @typedef {{
   *   brands: { Central: Brand },
   *   timer: TimerService,
   *   poolFeeBP: BasisPoints, // portion of the fees that go into the pool
   *   protocolFeeBP: BasisPoints, // portion of the fees that are shared with validators
   * }} AMMTerms
   *
   * @typedef { bigint } BasisPoints -- hundredths of a percent
   */
  const {
    brands: { Central: centralBrand },
    timer,
    poolFeeBP,
    protocolFeeBP,
  } = /** @type { Terms & AMMTerms } */ (zcf.getTerms());
  assertIssuerKeywords(zcf, ['Central']);
  assert(centralBrand !== undefined, X`centralBrand must be present`);

  /** @type {WeakStore<Brand,XYKPool>} */
  const secondaryBrandToPool = makeWeakStore('secondaryBrand');
  const getPool = secondaryBrandToPool.get;
  const initPool = secondaryBrandToPool.init;
  const isSecondary = secondaryBrandToPool.has;

  const quoteIssuerKit = makeIssuerKit('Quote', AssetKind.SET);

  // For now, this seat collects protocol fees. It needs to be connected to
  // something that will extract the fees.
  const { zcfSeat: protocolSeat } = zcf.makeEmptySeatKit();

  const getLiquiditySupply = brand => getPool(brand).getLiquiditySupply();
  const getLiquidityIssuer = brand => getPool(brand).getLiquidityIssuer();
  const addPool = makeAddPool(
    zcf,
    isSecondary,
    initPool,
    centralBrand,
    timer,
    quoteIssuerKit,
    protocolFeeBP,
    poolFeeBP,
    protocolSeat,
  );
  const getPoolAllocation = brand => {
    return getPool(brand)
      .getPoolSeat()
      .getCurrentAllocation();
  };

  const getPriceAuthorities = brand => {
    const pool = getPool(brand);
    return {
      toCentral: pool.getToCentralPriceAuthority(),
      fromCentral: pool.getFromCentralPriceAuthority(),
    };
  };

  /**
   * @param {Brand} brandIn
   * @param {Brand} brandOut
   * @returns {VPool}
   */
  const provideVPool = (brandIn, brandOut) => {
    if (isSecondary(brandIn) && isSecondary(brandOut)) {
      return makeDoublePool(
        zcf,
        getPool(brandIn),
        getPool(brandOut),
        protocolFeeBP,
        poolFeeBP,
        protocolSeat,
      );
    }

    const pool = isSecondary(brandOut) ? getPool(brandOut) : getPool(brandIn);
    return pool.getVPool();
  };

  const getInputPrice = (amountIn, amountOut) => {
    const pool = provideVPool(amountIn.brand, amountOut.brand);
    return pool.getInputPrice(amountIn, amountOut);
  };
  const getOutputPrice = (amountIn, amountOut) => {
    const pool = provideVPool(amountIn.brand, amountOut.brand);
    return pool.getOutputPrice(amountIn, amountOut);
  };

  const {
    makeSwapInInvitation,
    makeSwapOutInvitation,
  } = makeMakeSwapInvitation(zcf, provideVPool, poolFeeBP);
  const makeAddLiquidityInvitation = makeMakeAddLiquidityInvitation(
    zcf,
    getPool,
  );

  const makeRemoveLiquidityInvitation = makeMakeRemoveLiquidityInvitation(
    zcf,
    getPool,
  );

  const { makeCollectFeesInvitation } = makeMakeCollectFeesInvitation(
    zcf,
    protocolSeat,
    centralBrand,
  );
  const creatorFacet = Far('Creator Facet', {
    makeCollectFeesInvitation,
  });

  /** @type {XYKAMMPublicFacet} */
  const publicFacet = Far('MultipoolAutoswapPublicFacet', {
    addPool,
    getPoolAllocation,
    getLiquidityIssuer,
    getLiquiditySupply,
    getInputPrice,
    getOutputPrice,
    makeSwapInvitation: makeSwapInInvitation,
    makeSwapInInvitation,
    makeSwapOutInvitation,
    makeAddLiquidityInvitation,
    makeRemoveLiquidityInvitation,
    getQuoteIssuer: () => quoteIssuerKit.issuer,
    getPriceAuthorities,
    getAllPoolBrands: () =>
      Object.values(zcf.getTerms().brands).filter(isSecondary),
    getProtocolPoolBalance: () => protocolSeat.getCurrentAllocation(),
  });

  return harden({ publicFacet, creatorFacet });
};

harden(start);
export { start };
