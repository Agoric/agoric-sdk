// @ts-check
import { Far } from '@agoric/marshal';
import { AmountMath } from '@agoric/ertp';

/** @type {ContractStartFn } */
const start = zcf => {
  const { zcfSeat: liquidityPool } = zcf.makeEmptySeatKit();

  const transferLiquidityHelper = (poolSeat, addingLiquiditySeat) => {
    // Transfer to the pool seat
    poolSeat.incrementBy(
      addingLiquiditySeat.decrementBy({
        Collateral: addingLiquiditySeat.getAmountAllocated('Collateral'),
      }),
    );

    // TODO: whatever needs to be done to satisfy the user's offer
    // safety before reallocation and exit
    zcf.reallocate(poolSeat, addingLiquiditySeat);
    addingLiquiditySeat.exit();
  };

  /** @type {OfferHandler} */
  const startAddingLiquidity = entryPointSeat => {
    // TODO: check that the seat's proposal is acceptable

    // PRIVATE STATE
    let givenByThisUserSoFar = entryPointSeat.getAmountAllocated('Collateral');

    transferLiquidityHelper(liquidityPool, entryPointSeat);

    const addMoreLiquidity = moreLiquiditySeat => {
      givenByThisUserSoFar = AmountMath.add(
        givenByThisUserSoFar,
        moreLiquiditySeat.getAmountAllocated('Collateral'),
      );

      transferLiquidityHelper(liquidityPool, moreLiquiditySeat);

      // eslint-disable-next-line no-use-before-define
      return offerResult;
    };

    const borrowAgainstLiquidity = _borrowSeat => {
      // TODO: complete

      // eslint-disable-next-line no-use-before-define
      return offerResult;
    };

    const offerResult = Far('offerResult', {
      addMoreLiquidity: () =>
        zcf.makeInvitation(addMoreLiquidity, 'addMoreLiquidity'),
      borrowAgainstLiquidity: () =>
        zcf.makeInvitation(borrowAgainstLiquidity, 'borrowAgainstLiquidity'),
      getBalance: () => givenByThisUserSoFar,
    });
    return offerResult;
  };

  const publicFacet = Far('publicFacet', {
    startAddingLiquidity: () =>
      zcf.makeInvitation(startAddingLiquidity, 'startAddingLiquidity'),
  });
  return { publicFacet };
};
harden(start);
export { start };
