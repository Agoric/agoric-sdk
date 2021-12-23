// @ts-check

import { Nat } from '@agoric/nat';
import {
  assertProposalShape,
  natSafeMath,
} from '../../contractSupport/index.js';

import '../../../exported.js';

const { subtract, multiply, floorDivide } = natSafeMath;
const { details: X } = assert;

/**
 * Calculate the Liquidity Tokens to return in exchange for the indicated
 * increments to a liquidity pool. This implementation doesn't place any
 * restrictions on the ratio of central to secondary. The standard design
 * requires that the contributions be in the same ratio as the existing pool.
 *
 * The Formal Spec paper for UniSwap V1 says
 * KPrime / K = (LPrime / L)^2,   and   DeltaL = LPrime - L
 * so LPrime = sqrt(KPrime * L^2 / K) and DeltaL = sqrt(l^2 * KPrime/K) - 1).
 *
 * K is the product of the balances of the two assets in the pool before the
 * investment, and KPrime is the product after. L is the liquidity token supply
 * before, and LPrime is the token supply after, so the new investor gets
 * DeltaL = LPrime - L.  The paper uses operations that round down when
 * calculating liquidity, so we'll use floorDivide.
 *
 * This approach produces the same result as first trading with the pool to move
 * its ratio to what would result from adding the new liquidity to the pool, and
 * then adding liquidity using the original formulas. The trading step keeps
 * K the same, and leaves the investor with assets in the correct proportion for
 * the second step.
 *
 * @param {bigint} liqTokenSupply - outstanding liquidity tokens
 * @param {bigint} centralPool
 * @param {bigint} secondaryPool
 * @param {bigint} centralIn
 * @param {bigint} secondaryIn
 * @returns {bigint}
 */
export const calcLiqValueAnyRatio = (
  liqTokenSupply,
  centralPool,
  secondaryPool,
  centralIn,
  secondaryIn,
) => {
  const l = Nat(liqTokenSupply);
  if (liqTokenSupply === 0n) {
    return centralIn;
  }

  assert(centralPool > 0, X`Pool must already be initialized.`);
  assert(secondaryPool > 0, X`Pool must already be initialized.`);

  const kPrime = (centralIn + centralPool) * (secondaryIn + secondaryPool);
  const k = centralPool * secondaryPool;
  const lSquared = multiply(l, l);
  const lPrime = Math.trunc(
    Math.sqrt(Number(floorDivide(multiply(lSquared, kPrime), k))),
  );
  return subtract(lPrime, l);
};

/**
 * @param {ContractFacet} zcf
 * @param {(brand: Brand) => XYKPool} getPool
 */
export const makeMakeAddLiquidityInvitation = (zcf, getPool) => {
  const addLiquidity = seat => {
    assertProposalShape(seat, {
      give: {
        Central: null,
        Secondary: null,
      },
      want: { Liquidity: null },
    });
    // Get the brand of the secondary token so we can identify the liquidity pool.
    const secondaryBrand = seat.getProposal().give.Secondary.brand;
    const pool = getPool(secondaryBrand);
    return pool.addLiquidity(seat);
  };

  const makeAddLiquidityInvitation = () =>
    zcf.makeInvitation(addLiquidity, 'multipool amm add liquidity');

  return makeAddLiquidityInvitation;
};
