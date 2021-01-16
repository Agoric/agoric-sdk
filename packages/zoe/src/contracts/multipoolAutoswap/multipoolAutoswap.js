// @ts-check

import { assert, details } from '@agoric/assert';
import { makeWeakStore } from '@agoric/store';

import { assertIssuerKeywords } from '../../contractSupport';
import { makeAddPool } from './pool';
import { makeGetCurrentPrice } from './getCurrentPrice';
import { makeMakeSwapInvitation } from './swap';
import { makeMakeAddLiquidityInvitation } from './addLiquidity';
import { makeMakeRemoveLiquidityInvitation } from './removeLiquidity';

import '../../../exported';

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
  const {
    brands: { Central: centralBrand },
  } = zcf.getTerms();
  assertIssuerKeywords(zcf, ['Central']);
  assert(centralBrand !== undefined, details`centralBrand must be present`);

  /** @type {WeakStore<Brand,Pool>} */
  const secondaryBrandToPool = makeWeakStore();
  const getPool = secondaryBrandToPool.get;
  const initPool = secondaryBrandToPool.init;
  const isSecondary = secondaryBrandToPool.has;
  const isCentral = brand => brand === centralBrand;

  const getLiquiditySupply = brand => getPool(brand).getLiquiditySupply();
  const getLiquidityIssuer = brand => getPool(brand).getLiquidityIssuer();
  const addPool = makeAddPool(zcf, isSecondary, initPool, centralBrand);
  const getPoolAllocation = brand => {
    return getPool(brand)
      .getPoolSeat()
      .getCurrentAllocation();
  };

  const {
    getOutputForGivenInput,
    getInputForGivenOutput,
  } = makeGetCurrentPrice(isSecondary, isCentral, getPool, centralBrand);
  const {
    makeSwapInInvitation,
    makeSwapOutInvitation,
  } = makeMakeSwapInvitation(zcf, isSecondary, isCentral, getPool);
  const makeAddLiquidityInvitation = makeMakeAddLiquidityInvitation(
    zcf,
    getPool,
  );

  const makeRemoveLiquidityInvitation = makeMakeRemoveLiquidityInvitation(
    zcf,
    getPool,
  );

  /** @type {MultipoolAutoswapPublicFacet} */
  const publicFacet = {
    addPool,
    getPoolAllocation,
    getLiquidityIssuer,
    getLiquiditySupply,
    getInputPrice: getOutputForGivenInput,
    getOutputPrice: getInputForGivenOutput,
    makeSwapInvitation: makeSwapInInvitation,
    makeSwapInInvitation,
    makeSwapOutInvitation,
    makeAddLiquidityInvitation,
    makeRemoveLiquidityInvitation,
  };

  return harden({ publicFacet });
};

harden(start);
export { start };
