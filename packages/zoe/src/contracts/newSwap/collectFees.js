// @ts-check

import { amountMath } from '@agoric/ertp';
import { trade } from '../../contractSupport';

export const makeMakeCollectFeesInvitation = (zcf, feeSeat, centralBrand) => {
  const collectFees = seat => {
    const allocation = feeSeat.getAmountAllocated('RUN', centralBrand);
    trade(
      zcf,
      {
        seat,
        gains: { RUN: allocation },
      },
      {
        seat: feeSeat,
        gains: { RUN: amountMath.makeEmpty(centralBrand) },
      },
    );
    seat.exit();
    return `paid out ${allocation.value}`;
  };

  const makeCollectFeesInvitation = () =>
    zcf.makeInvitation(collectFees, 'collect Fees');

  return { makeCollectFeesInvitation };
};
