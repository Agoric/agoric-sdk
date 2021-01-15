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
 *
 * @property {() => Amount} getRecentCollateralAmount
 *
 * Get a recent report of the amount of collateral in the loan
 */
