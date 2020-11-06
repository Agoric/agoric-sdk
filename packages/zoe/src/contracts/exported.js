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
 * invitation for an oracle query
 * @property {(query: any) => ERef<any>} query make an unpaid query
 */

/**
 * @typedef {Object} OracleCreatorFacet the private methods accessible from the
 * contract instance
 * @property {() => AmountKeywordRecord} getCurrentFees get the current
 * fee amounts
 * @property {(total: boolean=) => ERef<Invitation>}
 * makeWithdrawInvitation create an invitation to withdraw fees
 * @property {() => Promise<Invitation>} makeShutdownInvitation
 *   Make an invitation to withdraw all fees and shutdown
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

/**
 * @typedef {AsyncIterable<undefined>} PeriodAsyncIterable
 *
 *  The asyncIterable used for notifications that a period has passed,
 *  on which compound interest will be calculated using the
 *  interestRate.
 */

/**
 * @typedef {number} MMR
 *  The Maintenance Margin Requirement, in percent. The default is
 *  150, meaning that collateral should be worth at least 150% of the
 *  loan. If the value of the collateral drops below mmr, liquidation
 *  occurs.
 */

/**
 * @typedef {Instance} AutoswapInstance
 *   The running contract instance for an Autoswap or Multipool
 *   Autoswap installation.  The publicFacet from the Autoswap
 *   instance is used for producing an invitation to sell the
 *   collateral on liquidation.
 */

/** @typedef {number} InterestRate
 *
 *   The rate in basis points that will be multiplied with the debt on
 *   every period to compound interest.
 */

/**
 * @typedef LoanTerms
 *
 * @property {MMR} [mmr=150]
 *
 * @property {AutoswapInstance} autoswapInstance
 *
 * @property {PriceAuthority} priceAuthority
 *
 *   Used for getting the current value of collateral and setting
 *   liquidation triggers.
 *
 * @property {PeriodAsyncIterable} periodAsyncIterable
 *
 * @property {InterestRate} interestRate
 */

/**
 * @typedef LenderSeatProperty
 * @property {ZCFSeat} lenderSeat
 *
 *   The ZCFSeat representing the lender's position in the contract.
 */

/**
 * @typedef {LoanTerms & LenderSeatProperty} LoanConfigWithLender
 *
 * The loan now has a lenderSeat, which is added to the config.
 */

/**
 * @typedef BorrowerConfigProperties
 *
 * @property {ZCFSeat} collateralSeat
 *
 *   The ZCFSeat holding the collateral in escrow after the borrower
 *   escrows it
 *
 * @property {() => Amount} getDebt
 *
 *   A function to get the current debt
 *
 * @property {PromiseKit} liquidationPromiseKit
 *
 *   PromiseKit that includes a promise that resolves to a PriceQuote
 *   when liquidation is triggered
 */

/**
 * @typedef BorrowerConfigPropertiesMinusDebt
 *
 * @property {ZCFSeat} collateralSeat
 *
 *   The ZCFSeat holding the collateral in escrow after the borrower
 *   escrows it
 *
 * @property {PromiseKit} liquidationPromiseKit
 *
 *   PromiseKit that includes a promise that resolves to a PriceQuote
 *   when liquidation is triggered
 */

/**
 * @typedef {LoanConfigWithLender & BorrowerConfigProperties } LoanConfigWithBorrower
 *
 * The loan has a lender, a borrower, and collateral escrowed.
 */

/**
 * @typedef {LoanConfigWithLender & BorrowerConfigPropertiesMinusDebt
 * } LoanConfigWithBorrowerMinusDebt
 */

/**
 * @callback ScheduleLiquidation
 * @param {ContractFacet} zcf
 * @param {LoanConfigWithBorrower} config
 */

/**
 * @callback MakeLendInvitation
 * @param {ContractFacet} zcf
 * @param {LoanTerms} config
 * @returns {Promise<Invitation>} lendInvitation
 */

/**
 * @callback MakeBorrowInvitation
 * @param {ContractFacet} zcf
 * @param {LoanConfigWithLender} config
 * @returns {Promise<Invitation>} borrowInvitation
 */

/**
 * @callback MakeCloseLoanInvitation
 * @param {ContractFacet} zcf
 * @param {LoanConfigWithBorrower} config
 * @returns {Promise<Invitation>} closeLoanInvitation
 */

/**
 * Allows holder to add collateral to the contract. Exits the seat
 * after adding.
 *
 * @callback MakeAddCollateralInvitation
 * @param {ContractFacet} zcf
 * @param {LoanConfigWithBorrower} config
 * @returns {Promise<Invitation>} addCollateralInvitation
 */

/**
 * @callback Liquidate
 * @param {ContractFacet} zcf
 * @param {LoanConfigWithBorrower} config
 * @returns {void}
 */

/**
 * @callback MakeDebtCalculator
 * @param {DebtCalculatorConfig} debtCalculatorConfig
 */

/**
 * @callback CalcInterestFn
 * @param {number} oldDebtValue
 * @param {number} interestRate
 * @returns {number} interest
 */

/**
 * @typedef {Object} DebtCalculatorConfig
 * @property {CalcInterestFn} calcInterestFn
 *
 *   A function to calculate the interest, given the debt value and an
 *   interest rate in basis points.
 *
 * @property {Amount} originalDebt
 *
 *   The debt at the start of the loan, in Loan brand
 *
 * @property {AmountMath} loanMath
 *
 *   AmountMath for the loan brand
 *
 * @property {PeriodAsyncIterable} periodAsyncIterable
 *
 *   The AsyncIterable to notify when a period has occurred
 *
 * @property {number} interestRate
 *
 * @property {ContractFacet} zcf
 *
 * @property {LoanConfigWithBorrowerMinusDebt} configMinusGetDebt
 */

/**
 * @typedef {Object} BorrowFacet
 *
 * @property {() => Promise<Invitation>} makeCloseLoanInvitation
 *
 * Make an invitation to close the loan by repaying the debt
 *   (including interest).
 *
 * @property {() => Promise<Invitation>} makeAddCollateralInvitation
 *
 * Make an invitation to add collateral to protect against liquidation
 *
 * @property {() => Promise<PriceQuote>} getLiquidationPromise
 *
 * Get a promise for a priceQuote that will resolve if liquidation
 * occurs. The priceQuote is for the value of the collateral that
 * triggered the liquidation. This may be lower than expected if the
 * price is moving quickly.
 *
 * @property {() => Notifier<Amount>} getDebtNotifier
 *
 * Get notified when the current debt (an Amount in the Loan Brand) changes. This will
 * increase as interest is added.
 */
