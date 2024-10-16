/**
 * @param {ZCFSeat} seat
 */
const getSeatAllocationDetils = seat => ({
  currentAllocation: seat.getCurrentAllocation(),
  stagedAllocation: seat.getStagedAllocation(),
  hasExited: seat.hasExited(),
});

export { getSeatAllocationDetils };
