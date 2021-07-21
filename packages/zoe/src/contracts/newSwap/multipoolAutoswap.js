// @ts-check

import { assert, details as X } from '@agoric/assert';
import { makeWeakStore } from '@agoric/store';
import { Far } from '@agoric/marshal';

import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { assertIssuerKeywords } from '../../contractSupport';
import { makeAddPool } from '../multipoolAutoswap/pool';
import { makeGetCurrentPrice } from './getCurrentPrice';
import { makeMakeSwapInvitation } from './swap';
import { makeMakeAddLiquidityInvitation } from '../multipoolAutoswap/addLiquidity';
import { makeMakeRemoveLiquidityInvitation } from '../multipoolAutoswap/removeLiquidity';

import '../../../exported';
import { makeMakeCollectFeesInvitation } from './collectFees';

/**
 * Multipool Autoswap is a rewrite of Uniswap that supports multiple liquidity
 * pools, and direct exchanges across pools. Please see the documentation for
 * more: https://agoric.com/documentation/zoe/guide/contracts/multipoolAutoswap.html
 *
 * We expect that this contract will have tens to hundreds of issuers.
 * Each liquidity pool is between the central token and a secondary
 * token. Secondary tokens can be exchanged with each other, but only
 * through the central token. For example, if X and Y are two token
 * types and C is the central token, a swap giving X and wanting Y
 * would first use the pool (X, C) then the pool (Y, C). There are no
 * liquidity pools between two secondary tokens.
 *
 * There should only need to be one instance of this contract, so
 * liquidity can be shared as much as possible.
 *
 * When the contract is instantiated, the central token is specified
 * in the terms. Separate invitations are available by calling methods
 * on the publicFacet for adding and removing liquidity and for
 * making trades. Other publicFacet operations support querying
 * prices and the sizes of pools. New Pools can be created with addPool().
 *
 * When making trades or requesting prices, the caller must specify that either
 * the input price (swapIn, getInputPrice) or the output price (swapOut,
 * getOutPutPrice) is fixed. For swaps, the required keywords are `In` for the
 * trader's `give` amount, and `Out` for the trader's `want` amount.
 * getInputPrice and getOutputPrice each take an Amount for the direction that
 * is being specified, and just a brand for the desired value, which is returned
 * as the appropriate amount.
 *
 * When adding and removing liquidity, the keywords are Central, Secondary, and
 * Liquidity. adding liquidity has Central and Secondary in the `give` section,
 * while removing liquidity has `want` and `give` swapped.
 *
 * Transactions that don't require an invitation include addPool, and the
 * queries: getInputPrice, getOutputPrice, getPoolAllocation,
 * getLiquidityIssuer, and getLiquiditySupply.
 *
 * @type {ContractStartFn}
 */
const start = zcf => {
  // This contract must have a "Central" keyword and issuer in the
  // IssuerKeywordRecord.
  // poolFee is the portion of the fees that go into the pool (in BP).
  // protocolFee is the portion of the fees that are used shared with validators
  const {
    brands: { Central: centralBrand },
    timer,
    poolFee,
    protocolFee,
  } = zcf.getTerms();
  assertIssuerKeywords(zcf, ['Central']);
  assert(centralBrand !== undefined, X`centralBrand must be present`);

  /** @type {WeakStore<Brand,Pool>} */
  const secondaryBrandToPool = makeWeakStore('secondaryBrand');
  const getPool = secondaryBrandToPool.get;
  const initPool = secondaryBrandToPool.init;
  const isSecondary = secondaryBrandToPool.has;
  const isCentral = brand => brand === centralBrand;

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

  const {
    getOutputForGivenInput,
    getInputForGivenOutput,
    getPriceGivenAvailableInput: getInternalPriceGivenAvailableInput,
    getPriceGivenRequiredOutput: getInternalPriceGivenRequiredOutput,
  } = makeGetCurrentPrice(
    isSecondary,
    isCentral,
    getPool,
    centralBrand,
    poolFee,
    protocolFee,
  );

  const getPriceGivenRequiredOutput = (brandIn, amountOutInitial) => {
    const { amountIn, amountOut } = getInternalPriceGivenRequiredOutput(
      brandIn,
      amountOutInitial,
    );
    // dropping centralAmount from the public method
    return { amountIn, amountOut };
  };

  const getPriceGivenAvailableInput = (amountInInitial, brandOut) => {
    const { amountIn, amountOut } = getInternalPriceGivenAvailableInput(
      amountInInitial,
      brandOut,
    );
    // dropping centralAmount from the public method
    return { amountIn, amountOut };
  };

  const {
    makeSwapInInvitation,
    makeSwapOutInvitation,
  } = makeMakeSwapInvitation(
    zcf,
    isSecondary,
    isCentral,
    getPool,
    getInternalPriceGivenAvailableInput,
    getInternalPriceGivenRequiredOutput,
    protocolSeat,
  );
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
  const creatorFacet = Far('Private Facet', {
    makeCollectFeesInvitation,
  });

  /** @type {MultipoolAutoswapPublicFacet} */
  const publicFacet = Far('MultipoolAutoswapPublicFacet', {
    addPool,
    getPoolAllocation,
    getLiquidityIssuer,
    getLiquiditySupply,
    getInputPrice: getOutputForGivenInput,
    getOutputPrice: getInputForGivenOutput,
    getPriceGivenRequiredOutput,
    getPriceGivenAvailableInput,
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
