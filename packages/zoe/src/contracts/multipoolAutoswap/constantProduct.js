// @ts-check

import { assert, details as X } from '@agoric/assert';
import { natSafeMath } from '../../contractSupport';

// A pool seat has Central and Secondary keywords, and a swap seat has
// In and Out keywords
const isPoolSeat = allocation => {
  return allocation.Central !== undefined || allocation.Secondary !== undefined;
};

const calcK = allocation => {
  return natSafeMath.multiply(
    allocation.Secondary.value,
    allocation.Central.value,
  );
};

/**
 *
 * @param {SeatStaging[]} stagings
 */
export const assertConstantProduct = stagings => {
  stagings.forEach(seatStaging => {
    const seat = seatStaging.getSeat();
    const priorAllocation = seat.getCurrentAllocation();
    const stagedAllocation = seatStaging.getStagedAllocation();
    if (isPoolSeat(stagedAllocation)) {
      const oldK = calcK(priorAllocation);
      const newK = calcK(stagedAllocation);
      console.log('oldK', oldK, 'newK', newK);
      assert(
        newK >= oldK,
        X`the product of the pool tokens must not decrease as the result of a trade. ${oldK} decreased to ${newK}`,
      );
    }
  });
};
