// @ts-check

import { AmountMath } from '@agoric/ertp';

export const makeMakeCollectFeesInvitation = (zcf, feeSeat, centralBrand) => {
  const collectFees = seat => {
    // Ensure that the feeSeat has a stagedAllocation with a RUN keyword
    feeSeat.incrementBy({ RUN: AmountMath.makeEmpty(centralBrand) });
    const amount = feeSeat.getAmountAllocated('RUN', centralBrand);

    seat.incrementBy(feeSeat.decrementBy({ RUN: amount }));
    zcf.reallocate(seat, feeSeat);

    seat.exit();
    return `paid out ${amount.value}`;
  };

  const makeCollectFeesInvitation = () =>
    zcf.makeInvitation(collectFees, 'collect Fees');

  return { makeCollectFeesInvitation };
};
