/**
 * @typedef {object} VPoolPriceQuote
 * @property {Amount<'nat'>} amountIn
 * @property {Amount<'nat'>} amountOut
 */

/**
 * @typedef {object} SinglePoolSwapResult
 *
 * @property {Amount<'nat'>} xIncrement
 * @property {Amount<'nat'>} swapperGives
 * @property {Amount<'nat'>} yDecrement
 * @property {Amount<'nat'>} swapperGets
 * @property {Amount<'nat'>} protocolFee
 * @property {Amount<'nat'>} poolFee
 * @property {Amount<'nat'>} newY
 * @property {Amount<'nat'>} newX
 */

/**
 * @typedef {import('./multipoolMarketMaker.js').MetricsNotification} MetricsNotification
 * @typedef {import('./pool.js').PoolMetricsNotification} PoolMetricsNotification
 */

/**
 * @typedef {object} DoublePoolSwapResult
 * @property {Amount<'nat'>} swapperGives
 * @property {Amount<'nat'>} swapperGets
 * @property {Amount<'nat'>} inPoolIncrement
 * @property {Amount<'nat'>} inPoolDecrement
 * @property {Amount<'nat'>} outPoolIncrement
 * @property {Amount<'nat'>} outPoolDecrement
 * @property {Amount<'nat'>} protocolFee
 */

/**
 * @typedef {Arity extends 'single' ? SinglePoolSwapResult
 * : Arity extends 'double' ? DoublePoolSwapResult
 * : SinglePoolSwapResult | DoublePoolSwapResult} SwapResult
 * @template {'single' | 'double' | unknown} Arity
 */

/**
 * @typedef {object} VirtualPool - virtual pool for price quotes and trading
 * @property {(seat: ZCFSeat, prices: SwapResult<Arity>) => string} allocateGainsAndLosses
 * @property {(amountIn: Amount, amountOut: Amount) => SwapResult<Arity>} getPriceForInput
 * @property {(amountIn: Amount, amountOut: Amount) => SwapResult<Arity>} getPriceForOutput
 * @template {'single' | 'double' | unknown} [Arity=unknown]
 */

/**
 * @callback AddLiquidityActual
 * @param {XYKPool} pool
 * @param {ZCFSeat} zcfSeat
 * @param {Amount<'nat'>} secondaryAmount
 * @param {Amount<'nat'>} poolCentralAmount
 * @param {ZCFSeat} [feeSeat]
 * @returns {string}
 */

/**
 * @callback AddLiquidityInternal
 * @param {ZCFSeat} zcfSeat
 * @param {Amount<'nat'>} secondaryAmount
 * @param {Amount<'nat'>} poolCentralAmount
 * @param {ZCFSeat} [feeSeat]
 */

/**
 * @typedef {object} XYKPool
 * @property {() => bigint} getLiquiditySupply
 * @property {() => Issuer<'nat'>} getLiquidityIssuer
 * @property {(seat: ZCFSeat) => string} addLiquidity
 * @property {(seat: ZCFSeat) => string} removeLiquidity
 * @property {() => ZCFSeat} getPoolSeat
 * @property {() => Amount<'nat'>} getSecondaryAmount
 * @property {() => Amount<'nat'>} getCentralAmount
 * @property {() => Subscriber<Record<string, Amount>>} getSubscriber
 * @property {() => void} updateState
 * @property {() => PriceAuthority} getToCentralPriceAuthority
 * @property {() => PriceAuthority} getFromCentralPriceAuthority
 * @property {() => VirtualPool} getVPool
 * @property {() => StoredSubscription<PoolMetricsNotification>} getMetrics
 */

/**
 * @typedef {object} PoolFacets
 * @property {XYKPool} pool
 * @property {{addLiquidityActual: AddLiquidityActual, addLiquidityInternal: AddLiquidityInternal}} helper
 * @property {VirtualPool<'single'>} singlePool
 */

/**
 * @typedef {object} XYKAMMCreatorFacet
 * @property {() => Promise<Invitation>} makeCollectFeesInvitation
 * @property {(facet: AssetReservePublicFacet) => void} resolveReserveFacet
 */

/**
 * @typedef {object} XYKAMMPublicFacet
 * @property {() => Promise<Invitation>} addPoolInvitation
 * add a new liquidity pool
 * @property {(secondaryIssuer: ERef<Issuer>, keyword: Keyword) => Promise<Issuer<'nat'>>} addIssuer
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
 * @property {() => Promise<Invitation>} makeAddLiquidityAtRateInvitation make
 * an invitation that allows one to add liquidity to the pool at an arbitrary
 * ratio of collateral to Central.
 * @property {() => Promise<Invitation>} makeRemoveLiquidityInvitation make an
 * invitation that allows one to remove liquidity from the pool.
 * @property {(brand: Brand<'nat'>) => Issuer<'nat'>} getLiquidityIssuer
 * @property {(brand: Brand<'nat'>) => bigint} getLiquiditySupply get the current value of
 * liquidity in the pool for brand held by investors.
 * @property {(brand: Brand<'nat'>) => Issuer<'nat'>} getSecondaryIssuer
 * @property {(amountIn: Amount, amountOut: Amount) => VPoolPriceQuote} getInputPrice
 * calculate the amount of brandOut that will be returned if the amountIn is
 * offered using makeSwapInInvitation at the current price.
 * @property {(amountOut: Amount, amountIn: Amount) => VPoolPriceQuote} getOutputPrice
 * calculate the amount of brandIn that is required in order to get amountOut
 * using makeSwapOutInvitation at the current price
 * @property {(brand: Brand) => Record<string, Amount<'nat'>>} getPoolAllocation get an
 * AmountKeywordRecord showing the current balances in the pool for brand.
 * @property {() => Issuer<'set'>} getQuoteIssuer - get the Issuer that attests to
 * the prices in the priceQuotes issued by the PriceAuthorities
 * @property {(brand: Brand) => {toCentral: PriceAuthority, fromCentral: PriceAuthority}} getPriceAuthorities
 * get a pair of PriceAuthorities { toCentral, fromCentral } for requesting
 * Prices and notifications about changing prices.
 * @property {() => Brand<'nat'>[]} getAllPoolBrands
 * @property {() => Allocation} getProtocolPoolBalance
 * @property {() => StoredSubscription<MetricsNotification>} getMetrics
 * @property {(brand: Brand) => StoredSubscription<PoolMetricsNotification>} getPoolMetrics
 * @property {() => bigint} getProtocolFee
 * @property {() => bigint} getPoolFee
 * @property {() => Amount<'nat'>} getMinInitialPoolLiquidity
 */

/**
 * @callback MakeAmmParamManager
 * @param {ERef<ZoeService>} zoe
 * @param {bigint} poolFeeBP
 * @param {bigint} protocolFeeBP
 * @param {Invitation} poserInvitation - invitation for the question poser
 * @returns {Promise<ParamManagerFull>}
 */
