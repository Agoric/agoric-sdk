import '../../../exported';

/**
 * @typedef {'long' | 'short'} PositionKind
 */

/**
 * @typedef {Object} PayoffHandler
 * @property {() => void} schedulePayoffs
 * @property {(PositionKind) => Promise<Payment>} makeOptionInvitation
 */

/**
 * @typedef {(ContractFacet, Record<PositionKind,PromiseRecord<ZCFSeat>>,ZCFSeat)
 *   => PayoffHandler} MakePayoffHandler
 */
