/**
 * @typedef {'long' | 'short'} PositionKind
 */

/**
 * @typedef {Object} PayoffHandler
 * @property {() => void} schedulePayoffs
 * @property {(positionKind: PositionKind) => Promise<Payment>} makeOptionInvitation
 */

/**
 * @typedef {(zcf: ContractFacet, seatPromiseKits: Record<PositionKind,PromiseRecord<ZCFSeat>>, collateralSeat: ZCFSeat)
 *   => PayoffHandler} MakePayoffHandler
 */
