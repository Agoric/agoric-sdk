// @ts-check

import { assert, details } from '@agoric/assert';
import makeWeakStore from '@agoric/weak-store';

import { assertIssuerKeywords } from '../../contractSupport';
import { makeAddPool } from './pool';
import { makeGetCurrentPrice } from './getCurrentPrice';
import { makeMakeSwapInvitation } from './swap';
import { makeMakeAddLiquidityInvitation } from './addLiquidity';
import { makeMakeRemoveLiquidityInvitation } from './removeLiquidity';

import '../../../exported';

/**
 * Autoswap is a rewrite of Uniswap. Please see the documentation for
 * more
 * https://agoric.com/documentation/zoe/guide/contracts/autoswap.html
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
 * on the publicFacet for adding and removing liquidity, and for
 * making trades. Other publicFacet operations support monitoring
 * prices and the sizes of pools.
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

  const secondaryBrandToPool = makeWeakStore();
  const getPool = secondaryBrandToPool.get;
  const initPool = secondaryBrandToPool.init;
  const isSecondary = secondaryBrandToPool.has;
  const isCentral = brand => brand === centralBrand;

  const getLiquidityIssuer = brand => getPool(brand).getLiquidityIssuer();
  const addPool = makeAddPool(zcf, isSecondary, initPool, centralBrand);
  const getPoolAllocation = brand => {
    return getPool(brand)
      .getPoolSeat()
      .getCurrentAllocation();
  };
  const getCurrentPrice = makeGetCurrentPrice(isSecondary, isCentral, getPool);
  const makeSwapInvitation = makeMakeSwapInvitation(
    zcf,
    isSecondary,
    isCentral,
    getPool,
  );
  const makeAddLiquidityInvitation = makeMakeAddLiquidityInvitation(
    zcf,
    getPool,
  );

  const makeRemoveLiquidityInvitation = makeMakeRemoveLiquidityInvitation(
    zcf,
    getPool,
  );

  const publicFacet = {
    addPool,
    getPoolAllocation,
    getLiquidityIssuer,
    getCurrentPrice,
    makeSwapInvitation,
    makeAddLiquidityInvitation,
    makeRemoveLiquidityInvitation,
  };

  return harden({ publicFacet });
};

harden(start);
export { start };
