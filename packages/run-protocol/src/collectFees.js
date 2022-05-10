// @ts-check

import { Stable } from './tokens.js';

/**
 * Provide shared support for providing access to fees from a service contract.
 *
 * @param {ZCF} zcf
 * @param {ZCFSeat} feeSeat
 * @param {Brand} feeBrand
 * @param {string} keyword
 */
export const makeMakeCollectFeesInvitation = (
  zcf,
  feeSeat,
  feeBrand,
  keyword,
) => {
  const collectFees = seat => {
    const amount = feeSeat.getAmountAllocated(keyword, feeBrand);
    feeSeat.decrementBy(harden({ [keyword]: amount }));
    seat.incrementBy(harden({ [Stable.symbol]: amount }));
    zcf.reallocate(seat, feeSeat);

    seat.exit();
    return `paid out ${amount.value}`;
  };

  const makeCollectFeesInvitation = () =>
    zcf.makeInvitation(collectFees, 'collect fees');

  return { makeCollectFeesInvitation };
};
