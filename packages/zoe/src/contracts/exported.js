/**
 * @typedef {Object} SellItemsPublicFacet
 * @property {() => Issuer} getItemsIssuer
 * @property {() => Amount} getAvailableItems
 *
 * @typedef {Object} SellItemsCreatorOnly
 * @property {() => Promise<Invitation>} makeBuyerInvitation
 *
 * @typedef {SellItemsPublicFacet & SellItemsCreatorOnly} SellItemsCreatorFacet
 */

/**
 * @typedef {Object} SellItemsParameters
 * @property {Record<string, any>} customValueProperties
 * @property {number} count
 * @property {Issuer} moneyIssuer
 * @property {Installation} sellItemsInstallation
 * @property {Amount} pricePerItem
 *
 * @typedef {Object} SellItemsResult
 * @property {UserSeat} sellItemsCreatorSeat
 * @property {SellItemsCreatorFacet} sellItemsCreatorFacet
 * @property {Instance} sellItemsInstance
 * @property {SellItemsPublicFacet} sellItemsPublicFacet
 *
 * @typedef {Object} MintAndSellNFTCreatorFacet
 * @property {(sellParams: SellItemsParameters) => Promise<SellItemsResult>} sellTokens
 * @property {() => Issuer} getIssuer
 */

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
 * @property {() => number} getLiquiditySupply get the current value of
 * liquidity held by investors.
 * @property {(amountIn: Amount, brandOut: Brand) => Amount} getInputPrice
 * calculate the amount of brandOut that will be returned if the amountIn is
 * offered using makeSwapInInvitation at the current price.
 * @property {(amountOut: Amount, brandIn: Brand) => Amount} getOutputPrice
 * calculate the amount of brandIn that is required in order to get amountOut
 * using makeSwapOutInvitation at the current price
 * @property {() => Record<string, Amount>} getPoolAllocation get an
 * AmountKeywordRecord showing the current balances in the pool.
 */

/**
 * @typedef {Object} Pool
 * @property {(inputValue: Value) => Amount } getSecondaryToCentralInputPrice
 * @property {(inputValue: Value) => Amount } getCentralToSecondaryInputPrice
 * @property {(inputValue: Value) => Amount } getSecondaryToCentralOutputPrice
 * @property {(inputValue: Value) => Amount } getCentralToSecondaryOutputPrice
 * @property {() => number} getLiquiditySupply
 * @property {() => Issuer} getLiquidityIssuer
 * @property {(seat: ZCFSeat) => string} addLiquidity
 * @property {(seat: ZCFSeat) => string} removeLiquidity
 * @property {() => ZCFSeat} getPoolSeat
 * @property {() => AmountMath} getAmountMath - get the amountMath for this
 * pool's secondary brand
 * @property {() => AmountMath} getCentralAmountMath
 * @property {() => Amount} getSecondaryAmount
 * @property {() => Amount} getCentralAmount
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
 * @property {(brand: Brand) => number} getLiquiditySupply get the current value of
 * liquidity in the pool for brand held by investors.
 * @property {(amountIn: Amount, brandOut: Brand) => Amount} getInputPrice
 * calculate the amount of brandOut that will be returned if the amountIn is
 * offered using makeSwapInInvitation at the current price.
 * @property {(amountOut: Amount, brandIn: Brand) => Amount} getOutputPrice
 * calculate the amount of brandIn that is required in order to get amountOut
 * using makeSwapOutInvitation at the current price
 * @property {(brand: Brand) => Record<string, Amount>} getPoolAllocation get an
 * AmountKeywordRecord showing the current balances in the pool for brand.
 */

/**
 * @typedef {Object} AutomaticRefundPublicFacet
 * @property {() => number} getOffersCount
 * @property {() => Promise<Invitation>} makeInvitation
 */
/**
 * @typedef {Object} SimpleExchangePublicFacet
 * @property {() => Promise<Invitation>} makeInvitation
 * @property {() => Notifier<any>} getNotifier
 */

/**
 * @typedef {Object} OracleAdmin
 * @property {() => Promise<void>} delete Remove the oracle from the aggregator
 * @property {(result: any) => Promise<void>} pushResult rather than waiting for
 * the polling query, push a result directly from this oracle
 */

/**
 * @typedef {Object} PriceAggregatorCreatorFacet
 * @property {(quoteMint: Mint) => Promise<void>} initializeQuoteMint
 * @property {(oracleInstance: Instance, query: any=) => Promise<OracleAdmin>} initOracle
 */

/**
 * @typedef {Object} PriceAggregatorPublicFacet
 * @property {() => PriceAuthority} getPriceAuthority
 */

/**
 * @typedef {Object} PriceAggregatorKit
 * @property {PriceAggregatorPublicFacet} publicFacet
 * @property {PriceAggregatorCreatorFacet} creatorFacet
 */

/**
 * @typedef {Object} OraclePublicFacet the public methods accessible from the
 * contract instance
 * @property {(query: any) => ERef<Invitation>} makeQueryInvitation create an
 * invitation for a paid oracle query
 * @property {(query: any) => ERef<any>} query make an unpaid query
 * @property {() => string} getDescription describe this oracle
 */

/**
 * @typedef {Object} OracleCreatorFacet the private methods accessible from the
 * contract instance
 * @property {(issuerP: ERef<Issuer>) => Promise<void>} addFeeIssuer add an
 * issuer to collect fees for the oracle
 * @property {() => AmountKeywordRecord} getCurrentFees get the current
 * fee amounts
 * @property {(total: boolean=) => ERef<Invitation>}
 * makeWithdrawInvitation create an invitation to withdraw fees
 */

/**
 * @typedef {Object} OraclePrivateParameters
 * @property {OracleHandler} oracleHandler
 */

/**
 * @typedef {Object} OracleInitializationFacet
 * @property {(privateParams: OraclePrivateParameters) => OracleCreatorFacet} initialize
 */

/**
 * @typedef {Object} OracleStartFnResult
 * @property {OracleInitializationFacet} creatorFacet
 * @property {OraclePublicFacet} publicFacet
 * @property {Instance} instance
 * @property {Invitation} creatorInvitation
 */

/**
 * @typedef {Object} OracleKit
 * @property {OracleCreatorFacet} creatorFacet
 * @property {OraclePublicFacet} publicFacet
 * @property {Instance} instance
 * @property {Invitation} creatorInvitation
 */

/**
 * @typedef {Object} OracleHandler
 * @property {(query: any, fee: Amount) => Promise<{ reply:
 * any, requiredFee: Amount }>} onQuery callback to reply to a query
 * @property {(query: any, reason: any) => void} onError notice an error
 * @property {(query: any, reply: any, requiredFee: Amount) => void} onReply
 * notice a successful reply
 */
