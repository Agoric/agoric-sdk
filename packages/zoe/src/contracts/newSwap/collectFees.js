// @ts-check

import { AmountMath } from '@agoric/ertp';

export const makeMakeCollectFeesInvitation = (zcf, feeSeat, centralBrand) => {
  const collectFees = seat => {
    const allocation = feeSeat.getAmountAllocated('RUN', centralBrand);

    zcf.reallocate(
      seat.stage({ RUN: allocation }),
      feeSeat.stage({ RUN: AmountMath.makeEmpty(centralBrand) }),
    );
    seat.exit();
    return `paid out ${allocation.value}`;
  };

  const makeCollectFeesInvitation = () =>
    zcf.makeInvitation(collectFees, 'collect Fees');

  return { makeCollectFeesInvitation };
};
