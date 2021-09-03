// @ts-check

import { assertProposalShape } from '../../contractSupport/index.js';

import '../../../exported.js';

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
    zcf.makeInvitation(addLiquidity, 'multipool autoswap add liquidity');

  return makeAddLiquidityInvitation;
};
