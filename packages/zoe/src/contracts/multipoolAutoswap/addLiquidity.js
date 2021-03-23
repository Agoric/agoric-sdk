// @ts-check

import { assertProposalShape } from '../../contractSupport';

import '../../../exported';

/**
 * @param {ContractFacet} zcf
 * @param {(brand: Brand) => Pool} getPool
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
