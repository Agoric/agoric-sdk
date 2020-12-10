/**
 * @typedef {'long' | 'short'} PositionKind
 */

/**
 * @callback MakeOptionInvitation
 * @param {PositionKind} positionKind
 * @returns {Promise<Payment>}
 */

/**
 * @callback SchedulePayoffs
 * @param {ContractFacet} zcf
 * @param {Partial<Record<PositionKind,PromiseRecord<ZCFSeat>>>} payoffSeats
 * @param {ZCFSeat} collateralSeat
 * @returns {void}
 */

/**
 * @typedef {Object} PayoffHandler
 * @property {SchedulePayoffs} schedulePayoffs
 * @property  {MakeOptionInvitation} makeOptionInvitation
 */

/**
 * @callback Scale
 * @param {AmountMath} amountMath
 * @param {Amount} amount
 * @param {number} precision
 * @returns {Amount}
 */

/**
 * @typedef {Object} Percent
 * @property {Scale} scale
 * @property {() => Percent} inverse
 */

/**
 * @callback Scale
 * @param {AmountMath} amountMath
 * @param {Amount} amount
 * @returns {Amount}
 */

/**
 * @callback MakePercent
 * @param {number} value
 * @param {number} base
 * @returns {Percent}
 */

/**
 * @callback CalculatePercent
 * @param {Amount} numerator
 * @param {Amount} denominator
 * @param {number=} base
 * @returns {Percent}
 */

/**
 * @typedef {Object} Percent
 * @property {Scale} scale
 * @property {() => Percent} complement
 */

/**
 * @typedef {Object} CalculateSharesReturn
 * Return value from calculateShares, which represents the portions assigned to
 * the long and short side of a transaction. These will be two non-negative
 * integers that sum to 100.
 * @property {Percent} longShare
 * @property {Percent} shortShare
 */

/**
 * @callback CalculateShares
 * calculate the portion (as a percentage) of the collateral that should be
 * allocated to the long side of a call spread contract. price gives the value
 * of the underlying asset at closing that determines the payouts to the parties
 *
 * if price <= strikePrice1, return 0
 * if price >= strikePrice2, return 100.
 * Otherwise return a number between 1 and 99 reflecting the position of price
 * in the range from strikePrice1 to strikePrice2.
 * @param {AmountMath} strikeMath
 * @param {Amount} price
 * @param {Amount} strikePrice1
 * @param {Amount} strikePrice2
 * @returns {CalculateSharesReturn  }
 */
