// @ts-check

/**
 * @typedef {Object} VPoolPriceQuote
 * @property {Amount} amountIn
 * @property {Amount} amountOut
 */

/**
 * @typedef {Object} VPool - virtual pool for price quotes and trading
 * @property {(amountIn: Amount, amountOut: Amount) => VPoolPriceQuote} getInputPrice
 * @property {(amountIn: Amount, amountOut: Amount) => VPoolPriceQuote} getOutputPrice
 * @property {(seat: ZCFSeat, amountIn: Amount, amountOut: Amount) => string} swapIn
 * @property {(seat: ZCFSeat, amountIn: Amount, amountOut: Amount) => string} swapOut
 */

/**
 * @typedef {Object} XYKPool
 * @property {() => bigint} getLiquiditySupply
 * @property {() => Issuer} getLiquidityIssuer
 * @property {(seat: ZCFSeat) => string} addLiquidity
 * @property {(seat: ZCFSeat) => string} removeLiquidity
 * @property {() => ZCFSeat} getPoolSeat
 * @property {() => Amount} getSecondaryAmount
 * @property {() => Amount} getCentralAmount
 * @property {() => Notifier<Record<string, Amount>>} getNotifier
 * @property {() => void} updateState
 * @property {() => PriceAuthority} getToCentralPriceAuthority
 * @property {() => PriceAuthority} getFromCentralPriceAuthority
 * @property {() => VPool} getVPool
 */

/**
 * @typedef {Object} XYKAMMPublicFacet
 * @property {(issuer: Issuer, keyword: Keyword) => Promise<Issuer>} addPool
 * add a new liquidity pool
 * @property {() => Promise<Invitation>} makeSwapInvitation synonym for
 * makeSwapInInvitation
 * @property {() => Promise<Invitation>} makeSwapInInvitation make an invitation
 * that allows one to do a swap in which the In amount is specified and the Out
 * amount is calculated
 * @property {() => Promise<Invitation>} makeSwapOutInvitation make an invitation
 * that allows one to do a swap in which the Out amount is specified and the In
 * amount is calculated
 * @property {() => Promise<Invitation>} makeAddLiquidityInvitation make an
 * invitation that allows one to add liquidity to the pool.
 * @property {() => Promise<Invitation>} makeRemoveLiquidityInvitation make an
 * invitation that allows one to remove liquidity from the pool.
 * @property {(brand: Brand) => Issuer} getLiquidityIssuer
 * @property {(brand: Brand) => bigint} getLiquiditySupply get the current value of
 * liquidity in the pool for brand held by investors.
 * @property {(amountIn: Amount, brandOut: Brand) => VPoolPriceQuote} getInputPrice
 * calculate the amount of brandOut that will be returned if the amountIn is
 * offered using makeSwapInInvitation at the current price.
 * @property {(amountOut: Amount, brandIn: Brand) => VPoolPriceQuote} getOutputPrice
 * calculate the amount of brandIn that is required in order to get amountOut
 * using makeSwapOutInvitation at the current price
 * @property {(brand: Brand) => Record<string, Amount>} getPoolAllocation get an
 * AmountKeywordRecord showing the current balances in the pool for brand.
 * @property {() => Issuer} getQuoteIssuer - get the Issuer that attests to
 * the prices in the priceQuotes issued by the PriceAuthorities
 * @property {(brand: Brand) => {toCentral: PriceAuthority, fromCentral: PriceAuthority}} getPriceAuthorities
 * get a pair of PriceAuthorities { toCentral, fromCentral } for requesting
 * Prices and notifications about changing prices.
 * @property {() => Brand[]} getAllPoolBrands
 * @property {() => Allocation} getProtocolPoolBalance
 */

/**
 * @callback MakeAmmParamManager
 * @param {ERef<ZoeService>} zoe
 * @param {bigint} poolFeeBP
 * @param {bigint} protocolFeeBP
 * @param {Invitation} poserInvitation - invitation for the question poser
 * @returns {Promise<ParamManagerFull>}
 */
