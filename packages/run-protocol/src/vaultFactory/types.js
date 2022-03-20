// @ts-check

/** @typedef {import('./vault').VaultUIState} VaultUIState */
/** @typedef {import('./vaultKit').VaultKit} VaultKit */
/** @typedef {VaultKit['vault']} Vault */

/**
 * @typedef  {Object} AutoswapLocal
 * @property {(amount: Amount, brand: Brand) => Amount} getInputPrice
 * @property {() => Invitation} makeSwapInvitation
 */

/**
 * @typedef {Object} Collateral
 * @property {Ratio} liquidationMargin
 * @property {Ratio} stabilityFee
 * @property {Ratio} marketPrice
 * @property {Ratio} interestRate
 * @property {Brand} brand
 */

/**
 * @typedef {Object} Rates
 * @property {Ratio} liquidationMargin - margin below which collateral will be
 * liquidated to satisfy the debt.
 * @property {Ratio} interestRate - annual interest rate charged on loans
 * @property {Ratio} loanFee - The fee (in BasisPoints) charged when opening
 * or increasing a loan.
 */

/**
 * @callback AddVaultType
 * @param {Issuer} collateralIssuer
 * @param {Keyword} collateralKeyword
 * @param {Rates} rates
 * @returns {Promise<VaultManager>}
 */

/**
 * @typedef  {Object} VaultFactory - the creator facet
 * @property {AddVaultType} addVaultType
 * @property {() => Promise<Array<Collateral>>} getCollaterals
 * @property {() => Allocation} getRewardAllocation,
 * @property {() => Instance} getContractGovernor
 * @property {() => Promise<Invitation>} makeCollectFeesInvitation
 */

/**
 * @callback MintAndReallocate
 *
 * Mint new debt, and transfer a `fee` part of that to the vaultFactory's reward
 * pool. Then reallocate over all the seat arguments and the rewardPoolSeat. Update
 * the `totalDebt` if the reallocate succeeds.
 *
 * TODO check limits.
 *
 * @param {Amount} toMint
 * @param {Amount} fee
 * @param {ZCFSeat} fromSeat
 * @param {...ZCFSeat} otherSeats
 * @returns {void}
 */

/**
 * @callback BurnDebt
 *
 * Burn debt tokens off a seat and update
 * the `totalDebt` if the reallocate succeeds.
 *
 * @param {Amount} toBurn
 * @param {ZCFSeat} fromSeat
 * @returns {void}
 */

/**
 * @typedef {Object} GetVaultParams
 * @property {() => Ratio} getLiquidationMargin
 * @property {() => Ratio} getLoanFee
 * @property {() => Promise<PriceQuote>} getCollateralQuote
 * @property {() => Ratio} getInterestRate - The annual interest rate on a loan
 * @property {() => RelativeTime} getChargingPeriod - The period (in seconds) at
 *   which interest is charged to the loan.
 * @property {() => RelativeTime} getRecordingPeriod - The period (in seconds)
 *   at which interest is recorded to the loan.
 */

/**
 * @typedef {string} VaultId
 */

/**
 * @typedef {Object} VaultManagerBase
 * @property {(seat: ZCFSeat) => Promise<VaultKit>}  makeVaultKit
 * @property {() => void} liquidateAll
 * @property {() => CollateralManager} getPublicFacet
 */

/**
 * @typedef {VaultManagerBase & GetVaultParams} VaultManager
 */

/**
 * @typedef {Object} LoanTiming
 * @property {RelativeTime} chargingPeriod
 * @property {RelativeTime} recordingPeriod
 */

/**
 * @typedef {Object} AMMFees
 * @property {bigint} poolFee
 * @property {bigint} protocolFee
 */

/**
 * @typedef {Object} LiquidationStrategy
 * @property {() => KeywordKeywordRecord} keywordMapping
 * @property {(collateral: Amount, run: Amount) => Proposal} makeProposal
 * @property {(runDebt: Amount) => Promise<Invitation>} makeInvitation
 */

/**
 * @typedef {Object} LiquidationCreatorFacet
 * @property {(runDebt: Amount) => Promise<Invitation>} makeDebtorInvitation
 */

/**
 * @callback MakeLiquidationStrategy
 * @param {LiquidationCreatorFacet} creatorFacet
 * @returns {LiquidationStrategy}
 */

/**
 * @typedef {Object} DebtStatus
 * @property {Timestamp} latestInterestUpdate
 * @property {NatValue} interest interest accrued since latestInterestUpdate
 * @property {NatValue} newDebt total including principal and interest
 */

/**
 * @callback Calculate
 * @param {DebtStatus} debtStatus
 * @param {Timestamp} currentTime
 * @returns {DebtStatus}
 */

/**
 * @typedef {Object} CalculatorKit
 * @property {Calculate} calculate calculate new debt for charging periods up to
 * the present.
 * @property {Calculate} calculateReportingPeriod calculate new debt for
 * reporting periods up to the present. If some charging periods have elapsed
 * that don't constitute whole reporting periods, the time is not updated past
 * them and interest is not accumulated for them.
 */

/** @typedef {import('./vault').InnerVault} InnerVault */
