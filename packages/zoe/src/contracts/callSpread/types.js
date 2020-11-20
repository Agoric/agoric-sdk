/**
 * @typedef {'long' | 'short'} PositionKind
 */

/**
 * @callback MakeOptionInvitation
 * @param {PositionKind} positionKind
 * @returns {Promise<Payment>}
 */

/**
 * @typedef {Object} PayoffHandler
 * @property {() => void} schedulePayoffs
 * @property  {MakeOptionInvitation} makeOptionInvitation
 */

/**
 * @callback MakePayoffHandler
 * @param {ContractFacet} zcf
 * @param {Record<PositionKind,PromiseRecord<ZCFSeat>>} seatPromiseKits
 * @param {ZCFSeat} collateralSeat
 * @returns {PayoffHandler}
 */

/**
 * @typedef {Object} CalculateSharesReturn
 * Return value from calculateShares, which represents the portions assigned to
 * the long and short side of a transaction. These will be two non-negative
 * integers that sum to 100.
 * @property {number} longShare
 * @property {number} shortShare
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
