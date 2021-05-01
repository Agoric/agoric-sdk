// @ts-check

import { amountMath } from '@agoric/ertp';

export const makeMakeCollectFeesInvitation = (zcf, feeSeat, centralBrand) => {
  const collectFees = seat => {
    const allocation = feeSeat.getAmountAllocated('RUN', centralBrand);
    zcf.reallocate(
      seat.stage({ RUN: allocation }),
      feeSeat.stage({ RUN: amountMath.makeEmpty(centralBrand) }),
    );
    seat.exit();
    return `paid out ${allocation.value}`;
  };

  const makeCollectFeesInvitation = () =>
    zcf.makeInvitation(collectFees, 'collect Fees');

  return { makeCollectFeesInvitation };
};
