// @ts-check

import { AmountMath } from '@agoric/ertp';
import { Far } from '@agoric/marshal';

const makeOpenAccountFn = (zcf, manager) => {
  // The state within the 'openAccount' function is created anew
  // every time this function is called. This means that every new
  // userAccount opened has its own private state.
  /** @type {OfferHandler} */
  const openAccount = entryPointSeat => {
    // TODO: check that the seat's proposal is acceptable

    // PRIVATE STATE
    // TODO: use a map to capture the amount per brand of collateral
    // that has been contributed.
    let givenByThisUserSoFar = entryPointSeat.getAmountAllocated('Collateral');

    manager.transferLiquidityHelper(entryPointSeat);

    const addMoreLiquidity = moreLiquiditySeat => {
      givenByThisUserSoFar = AmountMath.add(
        givenByThisUserSoFar,
        moreLiquiditySeat.getAmountAllocated('Collateral'),
      );

      manager.transferLiquidityHelper(moreLiquiditySeat);

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

  return openAccount;
};
harden(makeOpenAccountFn);
export { makeOpenAccountFn };
