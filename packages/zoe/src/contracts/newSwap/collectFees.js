// @ts-check

export const makeMakeCollectFeesInvitation = (zcf, feeSeat, centralBrand) => {
  const collectFees = seat => {
    const allocation = feeSeat.getAmountAllocated('RUN', centralBrand);

    seat.incrementBy(feeSeat.decrementBy({ RUN: allocation }));
    zcf.reallocate(seat, feeSeat);
    seat.exit();
    return `paid out ${allocation.value}`;
  };

  const makeCollectFeesInvitation = () =>
    zcf.makeInvitation(collectFees, 'collect Fees');

  return { makeCollectFeesInvitation };
};
