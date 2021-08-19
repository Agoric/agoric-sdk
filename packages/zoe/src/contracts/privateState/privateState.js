// @ts-check
import { Far } from '@agoric/marshal';
import { makeScalarMap } from '@agoric/store';
import { makeOpenAccountFn } from './userAccount.js';

/** @type {ContractStartFn } */
const start = zcf => {
  const { zcfSeat: liquidityPool } = zcf.makeEmptySeatKit();

  // A map with a particular, more helpful API
  /** @type {Store<Brand, Amount>} */
  const exampleContractWideMap = makeScalarMap('collateralBrand');

  const recordAdditionalLiquidity = _liquidityAdded => {
    // TODO: iterate over AmountKeywordRecord
    // TODO: add to exampleContractWideMap values, keying off of the brand
  };

  const transferLiquidityHelper = addingLiquiditySeat => {
    const liquidityAdded = addingLiquiditySeat.getCurrentAllocation();
    // Transfer everything to the pool seat
    liquidityPool.incrementBy(addingLiquiditySeat.decrementBy(liquidityAdded));

    recordAdditionalLiquidity(liquidityAdded);

    // TODO: whatever needs to be done to satisfy the user's offer
    // safety before reallocation and exit
    zcf.reallocate(liquidityPool, addingLiquiditySeat);
    addingLiquiditySeat.exit();
  };

  const userAccountManager = Far('userAccountManager', {
    transferLiquidityHelper,
  });

  const openAccount = makeOpenAccountFn(zcf, userAccountManager);

  const publicFacet = Far('publicFacet', {
    openAccount: () => zcf.makeInvitation(openAccount, 'openAccount'),
  });
  return { publicFacet };
};
harden(start);
export { start };
