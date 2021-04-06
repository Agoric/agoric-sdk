/**
 * @typedef {Object} AutoswapPublicFacet
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
 * @property {() => Issuer} getLiquidityIssuer
 * @property {() => bigint} getLiquiditySupply get the current value of
 * liquidity held by investors.
 * @property {(amountIn: Amount, brandOut: Brand) => Amount} getInputPrice
 * calculate the amount of brandOut that will be returned if the amountIn is
 * offered using makeSwapInInvitation at the current price.
 * @property {(amountOut: Amount, brandIn: Brand) => Amount} getOutputPrice
 * calculate the amount of brandIn that is required in order to get amountOut
 * using makeSwapOutInvitation at the current price
 * @property {() => Record<string, Amount>} getPoolAllocation get an
 * AmountKeywordRecord showing the current balances in the pool.
 * @property {() => Array<Brand>} getAllPoolBrands get a list of all the brands
 * that have associated pools.
 */

/**
 * @typedef {Object} PriceAmountPair
 *
 * @property {Amount} amountOut
 * @property {Amount} amountIn
 */

/**
 * @typedef {Object} Pool
 * @property {(inputAmount: Amount, outputBrand: Brand) => PriceAmountPair } getPriceGivenAvailableInput
 * @property {(inputBrand: Brand, outputAmount: Amount) => PriceAmountPair } getPriceGivenRequiredOutput
 * @property {() => bigint} getLiquiditySupply
 * @property {() => Issuer} getLiquidityIssuer
 * @property {(seat: ZCFSeat) => string} addLiquidity
 * @property {(seat: ZCFSeat) => string} removeLiquidity
 * @property {() => ZCFSeat} getPoolSeat
 * @property {() => Amount} getSecondaryAmount
 * @property {() => Amount} getCentralAmount
 * @property {() => Notifier} getNotifier
 * @property {() => void} updateState
 * @property {() => PriceAuthority} getToCentralPriceAuthority
 * @property {() => PriceAuthority} getFromCentralPriceAuthority
 */

/**
 * @typedef {Object} MultipoolAutoswapPublicFacet
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
 * @property {(amountIn: Amount, brandOut: Brand) => Amount} getInputPrice
 * calculate the amount of brandOut that will be returned if the amountIn is
 * offered using makeSwapInInvitation at the current price.
 * @property {(amountOut: Amount, brandIn: Brand) => Amount} getOutputPrice
 * calculate the amount of brandIn that is required in order to get amountOut
 * using makeSwapOutInvitation at the current price
 * @property {(amountIn: Amount, brandOut: Brand) => PriceAmountPair} getPriceGivenAvailableInput
 * calculate the amount of brandOut that will be returned if the amountIn is
 * offered using makeSwapInInvitation at the current price. Include the minimum
 * amountIn required to gain that much.
 * @property {(amountOut: Amount, brandIn: Brand) => PriceAmountPair} getPriceGivenRequiredOutput
 * calculate the amount of brandIn that is required in order to get amountOut
 * using makeSwapOutInvitation at the current price. Include the maximum amount
 * of amountOut that can be gained for that amountIn.
 * @property {(brand: Brand) => Record<string, Amount>} getPoolAllocation get an
 * AmountKeywordRecord showing the current balances in the pool for brand.
 * @property {() => Issuer} getQuoteIssuer - get the Issuer that attests to
 * the prices in the priceQuotes issued by the PriceAuthorities
 * @property {(brand: Brand) => {toCentral: PriceAuthority, fromCentral: PriceAuthority}}} getPriceAuthorities
 * get a pair of PriceAuthorities { toCentral, fromCentral } for requesting
 * Prices and notifications about changing prices.
 */
