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
 * @callback Scale
 * @param {Amount} amount
 * @returns {Amount}
 */

/**
 * @callback MakePercent
 * @param {bigint} value
 * @param {Brand} brand
 * @param {bigint=} base
 * @returns {Percent}
 */

/**
 * @callback MakeCanonicalPercent
 * @param {Brand} brand
 * @returns {Percent}
 */

/**
 * @callback CalculatePercent
 * @param {Amount} numerator
 * @param {Amount} denominator
 * @param {bigint=} base
 * @returns {Percent}
 */

/**
 * @typedef {Object} Percent
 * @property {Scale} scale
 * @property {() => Percent} complement
 * @property {() => Ratio} makeRatio
 */

/**
 * @typedef {Object} CalculateSharesReturn
 * Return value from calculateShares, which represents the portions assigned to
 * the long and short side of a transaction. These will be two non-negative
 * integers that sum to 100.
 * @property {Ratio} longShare
 * @property {Ratio} shortShare
 */

/**
 * @callback CalculateShares
 * calculate the portion (as a percentage) of the collateral that should be
 * allocated to the long side of a call spread contract. price gives the value
 * of the underlying asset at closing that determines the payouts to the parties
 *
 * if price <= strikePrice1, return Ratio representing 0
 * if price >= strikePrice2, return Ratio representing 1.
 * Otherwise return longShare and shortShare representing ratios between 0% and
 * 100% reflecting the position of the price in the range from strikePrice1 to
 * strikePrice2.
 * @param {Brand} collateralBrand
 * @param {Amount} price
 * @param {Amount} strikePrice1
 * @param {Amount} strikePrice2
 * @returns {CalculateSharesReturn}
 */

/**
 * @callback oneMinus
 * @param {Ratio} ratio
 * @returns {Ratio}
 */

/**
 * @callback Make100Percent
 * @param {Brand} brand
 * @returns {Ratio}
 */

/**
 * @callback Make0Percent
 * @param {Brand} brand
 * @returns {Ratio}
 */
