import { assertProposalKeywords } from '../../contractSupport';

import '../../../exported';

/**
 * @param {ContractFacet} zcf
 * @param {(brand: Brand) => Pool} getPool
 */
export const makeMakeAddLiquidityInvitation = (zcf, getPool) => {
  const addLiquidityExpected = harden({
    give: {
      Central: null,
      Secondary: null,
    },
    want: { Liquidity: null },
  });

  const addLiquidity = seat => {
    // Get the brand of the secondary token so we can identify the liquidity pool.
    const secondaryBrand = seat.getProposal().give.Secondary.brand;
    const pool = getPool(secondaryBrand);
    return pool.addLiquidity(seat);
  };

  const makeAddLiquidityInvitation = () =>
    zcf.makeInvitation(
      assertProposalKeywords(addLiquidity, addLiquidityExpected),
      'multipool autoswap add liquidity',
    );

  return makeAddLiquidityInvitation;
};
