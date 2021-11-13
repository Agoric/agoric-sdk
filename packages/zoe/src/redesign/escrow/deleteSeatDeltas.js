// @ts-check

import { assertArray, assertRecord } from './assertPassStyleOf';

const deleteSeatDeltas = (deleteSeat, seatDeltas) => {
  assertArray(seatDeltas, 'seatDeltas');
  return seatDeltas.map(seatDelta => {
    assertRecord(seatDelta, 'seatDelta');
    const { seat, add, subtract } = seatDelta;
    const account = deleteSeat(seat);
    return harden({
      account,
      add,
      subtract,
    });
  });
};
harden(deleteSeatDeltas);
export { deleteSeatDeltas };
