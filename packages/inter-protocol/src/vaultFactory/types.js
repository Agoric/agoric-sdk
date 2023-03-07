/**
 * @typedef {import('./vault').VaultNotification} VaultNotification
 * @typedef {import('./vault').Vault} Vault
 * @typedef {import('./vaultKit').VaultKit} VaultKit
 * @typedef {import('./vaultManager').VaultManager} VaultManager
 * @typedef {import('./vaultManager').CollateralManager} CollateralManager
 * @typedef {import('../reserve/assetReserve.js').AssetReserveLimitedCreatorFacet} AssetReserveCreatorFacet
 * @typedef {import('../reserve/assetReserve.js').AssetReservePublicFacet} AssetReservePublicFacet
 * @typedef {import('./vaultFactory.js').VaultFactoryContract['publicFacet']} VaultFactoryPublicFacet
 *
 * @typedef {import('@agoric/time/src/types').RelativeTime} RelativeTime
 */

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
 * @property {Ratio} [liquidationPadding] - vault must maintain this in order to remove collateral or add debt
 */

/**
 * @callback AddVaultType
 * @param {Issuer} collateralIssuer
 * @param {Keyword} collateralKeyword
 * @param {VaultManagerParamValues} params
 * @returns {Promise<VaultManager>}
 */

/**
 * @typedef  {object} VaultFactoryCreatorFacet
 * @property {AddVaultType} addVaultType
 * @property {() => Allocation} getRewardAllocation
 * @property {() => Instance} getContractGovernor
 * @property {() => Promise<Invitation>} makeCollectFeesInvitation
 * @property {() => void} updateMetrics
 */

/**
 * @callback MintAndTransfer
 * Mint new debt `toMint` and transfer the `fee` portion to the vaultFactory's reward
 * pool. Then reallocate over all the seat arguments and the rewardPoolSeat. Update
 * the `totalDebt` if the reallocate succeeds.
 * @param {ZCFSeat} mintReceiver
 * @param {Amount<'nat'>} toMint
 * @param {Amount<'nat'>} fee
 * @param {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} transfers
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
 * @property {RelativeTime} chargingPeriod in seconds
 * @property {RelativeTime} recordingPeriod in seconds
 */

/**
 * @typedef {object} LiquidationStrategy
 * @property {() => KeywordKeywordRecord} keywordMapping
 * @property {(collateral: Amount, run: Amount) => Proposal} makeProposal
 * @property {(runDebt: Amount) => Promise<Invitation>} makeInvitation
 */

/**
 * @typedef {object} Liquidator
 * @property {() => Promise<Invitation<void, { debt: Amount<'nat'>; penaltyRate: Ratio; }>>} makeLiquidateInvitation
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
