// @ts-check

export const makeMakeCollectFeesInvitation = (zcf, feeSeat, centralBrand) => {
  const collectFees = seat => {
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
