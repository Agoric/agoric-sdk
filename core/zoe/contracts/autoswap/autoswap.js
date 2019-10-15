import harden from '@agoric/harden';

import { makeMint } from '../../../mint';
import { makeGetPrice } from './methods/getPrice';
import { makeMakeOfferMethod } from './methods/makeOffer';
import { makeAddLiquidityMethod } from './methods/addLiquidity';
import { makeRemoveLiquidityMethod } from './methods/removeLiquidity';

const makeAutoSwapMaker = () => {
  // Liquidity tokens are a basic fungible token. We need to be able
  // to instantiate a new zoeInstance with 3 starting assays: two for
  // the underlying rights to be swapped, and this liquidityAssay. So
  // we will make the liquidityAssay now and return it to the user
  // along with the `makeAutoSwap` function.
  const liquidityMint = makeMint('liquidity');
  const liquidityAssay = liquidityMint.getAssay();

  const makeAutoSwap = zoeInstance => {
    // Create an empty offer to represent the extents of the
    // liquidity pool.
    const poolOfferId = zoeInstance.escrowEmptyOffer();
    const getPoolExtents = () =>
      zoeInstance.getExtentsFor(harden([poolOfferId]))[0];

    // The API exposed to the user
    const autoSwap = harden({
      addLiquidity: makeAddLiquidityMethod(
        zoeInstance,
        liquidityMint,
        poolOfferId,
      ),
      removeLiquidity: makeRemoveLiquidityMethod(
        zoeInstance,
        liquidityMint,
        poolOfferId,
      ),
      makeOffer: makeMakeOfferMethod(zoeInstance, poolOfferId),
      getPrice: makeGetPrice(zoeInstance, poolOfferId),
      getLiquidityAssay: () => liquidityAssay,
      getAssays: zoeInstance.getAssays,
      getPoolExtents,
    });
    return autoSwap;
  };

  return harden({
    makeAutoSwap,
    liquidityAssay,
  });
};
export { makeAutoSwapMaker };
