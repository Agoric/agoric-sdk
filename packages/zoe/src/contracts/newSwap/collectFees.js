// @ts-check

import { amountMath } from '@agoric/ertp';

export const makeMakeCollectFeesInvitation = (zcf, feeSeat, centralBrand) => {
  const collectFees = seat => {
    const allocation = feeSeat.getAmountAllocated('RUN', centralBrand);

    // This check works around
    // https://github.com/Agoric/agoric-sdk/issues/3033
    // when that bug is fixed, the reallocate can be moved outside the check and
    // the check dropped.
    if (!amountMath.isEmpty(allocation)) {
      zcf.reallocate(
        seat.stage({ RUN: allocation }),
        feeSeat.stage({ RUN: amountMath.makeEmpty(centralBrand) }),
      );
    }
    seat.exit();
    return `paid out ${allocation.value}`;
  };

  const makeCollectFeesInvitation = () =>
    zcf.makeInvitation(collectFees, 'collect Fees');

  return { makeCollectFeesInvitation };
};
