// @ts-check

/** @typedef {import('./vault').VaultTitleState} VaultTitleState */
/** @typedef {import('./vault').Vault} Vault */
/** @typedef {import('./vaultKit').VaultKit} VaultKit */
/** @typedef {import('./vaultManager').VaultManager} VaultManager */
/** @typedef {import('./vaultManager').VaultManagerObject} VaultManagerObject */
/** @typedef {import('./vaultManager').CollateralManager} CollateralManager */

/**
 * @typedef  {object} AutoswapLocal
 * @property {(amount: Amount, brand: Brand) => Amount} getInputPrice
 * @property {() => Invitation} makeSwapInvitation
 */

/**
 * @typedef {object} Collateral
 * @property {Ratio} liquidationMargin
 * @property {Ratio} stabilityFee
 * @property {Ratio} marketPrice
 * @property {Ratio} interestRate
 * @property {Brand} brand
 */

/**
 * @typedef {object} VaultManagerParamValues
 * @property {Ratio} liquidationMargin - margin below which collateral will be
 * liquidated to satisfy the debt.
 * @property {Ratio} liquidationPenalty - penalty charged upon liquidation as proportion of debt
 * @property {Ratio} interestRate - annual interest rate charged on loans
 * @property {Ratio} loanFee - The fee (in BasisPoints) charged when opening
 * or increasing a loan.
 * @property {Amount<'nat'>} debtLimit
 */

/**
 * @callback AddVaultType
 * @param {Issuer} collateralIssuer
 * @param {Keyword} collateralKeyword
 * @param {VaultManagerParamValues} params
 * @returns {Promise<VaultManagerObject>}
 */

/**
 * @typedef  {object} VaultFactory - the creator facet
 * @property {AddVaultType} addVaultType
 * @property {() => Promise<Array<Collateral>>} getCollaterals
 * @property {() => Allocation} getRewardAllocation
 * @property {() => Allocation} getPenaltyAllocation
 * @property {() => Instance} getContractGovernor
 * @property {() => Promise<Invitation>} makeCollectFeesInvitation
 * @property {() => void} notifyEcon
 */

/**
 * @callback MintAndReallocate
 *
 * Mint new debt `toMint` and transfer the `fee` portion to the vaultFactory's reward
 * pool. Then reallocate over all the seat arguments and the rewardPoolSeat. Update
 * the `totalDebt` if the reallocate succeeds.
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
 * @typedef {object} GetVaultParams
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
 * @typedef {object} LoanTiming
 * @property {RelativeTime} chargingPeriod
 * @property {RelativeTime} recordingPeriod
 */

/**
 * @typedef {object} AMMFees
 * @property {bigint} poolFee
 * @property {bigint} protocolFee
 */

/**
 * @typedef {object} LiquidationStrategy
 * @property {() => KeywordKeywordRecord} keywordMapping
 * @property {(collateral: Amount, run: Amount) => Proposal} makeProposal
 * @property {(runDebt: Amount) => Promise<Invitation>} makeInvitation
 */

/**
 * @typedef {object} Liquidator
 * @property {() => Promise<Invitation>} makeLiquidateInvitation
 */

/**
 * @typedef {object} DebtStatus
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
 * @typedef {object} CalculatorKit
 * @property {Calculate} calculate calculate new debt for charging periods up to
 * the present.
 * @property {Calculate} calculateReportingPeriod calculate new debt for
 * reporting periods up to the present. If some charging periods have elapsed
 * that don't constitute whole reporting periods, the time is not updated past
 * them and interest is not accumulated for them.
 */

/** @typedef {{key: 'governedParams' | {collateralBrand: Brand}}} VaultFactoryParamPath */
