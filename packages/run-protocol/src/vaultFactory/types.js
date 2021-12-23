// @ts-check

/**
 * @typedef  {Object} AutoswapLocal
 * @property {(amount: Amount, brand: Brand) => Amount} getInputPrice
 * @property {() => Invitation} makeSwapInvitation
 */

/**
 * @typedef {Object} Collateral
 * @property {Ratio} initialMargin
 * @property {Ratio} liquidationMargin
 * @property {Ratio} stabilityFee
 * @property {Ratio} marketPrice
 * @property {Brand} brand
 */

/**
 * @typedef {Object} Rates
 * @property {Ratio} initialMargin - minimum over-collateralization
 * required to open a loan
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
 * @typedef  {Object} vaultFactoryPublicFacet - the public facet
 * @property {() => Promise<Invitation>} makeLoanInvitation
 * @property {() => Promise<Array<Collateral>>} getCollaterals
 * @property {() => Issuer} getRunIssuer
 * @property {(paramDescription: ParamDescription) => bigint} getNatParamState
 * @property {(paramDescription: ParamDescription) => Ratio} getRatioParamState
 * @property {() => Record<Keyword,ParamShortDescription>} getGovernedParams
 * @property {() => Promise<GovernorPublic>} getContractGovernor
 * @property {(name: string) => Amount} getInvitationAmount
 */

/**
 * @typedef  {Object} VaultFactory - the creator facet
 * @property {AddVaultType} addVaultType
 * @property {() => Promise<Array<Collateral>>} getCollaterals
 * @property {() => Allocation} getRewardAllocation,
 * @property {() => ERef<Payment>} getBootstrapPayment
 * @property {() => Instance} getContractGovernor
 * @property {() => Invitation} makeCollectFeesInvitation
 */

/**
 * @typedef {Object} UIState
 * @property {Ratio} interestRate Annual interest rate charge
 * @property {Ratio} liquidationRatio
 * @property {Amount} locked Amount of Collateral locked
 * @property {Amount} debt Amount of Loan (including accrued interest)
 * @property {Ratio} collateralizationRatio
 * @property {boolean} liquidated boolean showing whether liquidation occurred
 */

/**
 * @callback ReallocateReward
 *
 * Transfer the indicated amount to the vaultFactory's reward
 * pool, taken from the `fromSeat`. Then reallocate over all the seat
 * arguments and the rewardPoolSeat.
 *
 * @param {Amount} amount
 * @param {ZCFSeat} fromSeat
 * @param {ZCFSeat=} otherSeat
 * @returns {void}
 */

/**
 * @typedef {Object} GetVaultParams
 * @property {() => Ratio} getLiquidationMargin
 * @property {() => Ratio} getLoanFee
 * @property {() => Promise<PriceQuote>} getCollateralQuote
 * @property {() => Ratio} getInitialMargin
 * @property {() => Ratio} getInterestRate - The annual interest rate on a loan
 * @property {() => RelativeTime} getChargingPeriod - The period (in seconds) at
 *   which interest is charged to the loan.
 * @property {() => RelativeTime} getRecordingPeriod - The period (in seconds)
 *   at which interest is recorded to the loan.
 */

/**
 * @typedef {Object} InnerVaultManagerBase
 * @property {() => Brand} getCollateralBrand
 * @property {ReallocateReward} reallocateReward
 */

/**
 * @typedef {InnerVaultManagerBase & GetVaultParams} InnerVaultManager
 */

/**
 * @typedef {Object} VaultManagerBase
 * @property {(seat: ZCFSeat) => Promise<LoanKit>}  makeLoanKit
 * @property {() => void} liquidateAll
 */

/**
 * @typedef {VaultManagerBase & GetVaultParams} VaultManager
 */

/**
 * @typedef {Object} OpenLoanKit
 * @property {Notifier<UIState>} notifier
 * @property {Promise<PaymentPKeywordRecord>} collateralPayoutP
 */

/**
 * @typedef {Object} Vault
 * @property {() => Promise<Invitation>} makeAdjustBalancesInvitation
 * @property {() => Promise<Invitation>} makeCloseInvitation
 * @property {() => Amount} getCollateralAmount
 * @property {() => Amount} getDebtAmount
 * @property {() => ERef<UserSeat>} getLiquidationSeat
 * @property {() => Promise<string>} getLiquidationPromise
 */

/**
 * @typedef {Object} LoanKit
 * @property {Vault} vault
 * @property {Notifier<UIState>} uiNotifier
 */

/**
 * @typedef {Object} VaultKit
 * @property {Vault} vault
 * @property {(seat: ZCFSeat) => Promise<OpenLoanKit>} openLoan
 * @property {(timestamp: Timestamp) => Amount} accrueInterestAndAddToPool
 * @property {ZCFSeat} vaultSeat
 * @property {PromiseRecord<string>} liquidationPromiseKit
 * @property {ZCFSeat} liquidationZcfSeat
 * @property {() => void} liquidating
 * @property {(newDebt: Amount) => void} liquidated
 */

/**
 * @typedef {Object} LoanParams
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
 * @callback MakeVaultManager
 * @param {ContractFacet} zcf
 * @param {ZCFMint} runMint
 * @param {Brand} collateralBrand
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {GetParams} getLoanParams
 * @param {ReallocateReward} reallocateReward
 * @param {ERef<TimerService>} timerService
 * @param {LiquidationStrategy} liquidationStrategy
 * @returns {VaultManager}
 */

/**
 * @callback MakeVaultKit
 * @param {ContractFacet} zcf
 * @param {InnerVaultManager} manager
 * @param {ZCFMint} runMint
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {Timestamp} startTimeStamp
 * @returns {VaultKit}
 */

/**
 * @typedef {Object} DebtStatus
 * @property {Timestamp} latestInterestUpdate
 * @property {Amount} interest
 * @property {Amount} newDebt
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

/**
 * @callback MakeInterestCalculator
 * @param {Brand} brand
 * @param {Ratio} rate
 * @param {RelativeTime} chargingPeriod
 * @param {RelativeTime} recordingPeriod
 * @returns {CalculatorKit}
 */

/**
 * @typedef {Object} VaultParamManager
 * @property {GetParams} getParams
 * @property {(name: string) => bigint} getNat
 * @property {(name: string) => Ratio} getRatio
 * @property {(period: bigint) => void} updateChargingPeriod
 * @property {(period: bigint) => void} updateRecordingPeriod
 * @property {(margin: Ratio) => void} updateInitialMargin
 * @property {(margin: Ratio) => void} updateLiquidationMargin
 * @property {(ratio: Ratio) => void} updateInterestRate
 * @property {(ratio: Ratio) => void} updateLoanFee
 */

/**
 * @typedef {Object} ElectorateParamManager
 * @property {GetParams} getParams
 * @property {(name: string) => Amount} getInvitationAmount
 * @property {(name: string) => Invitation} getInternalParamValue
 * @property {(invitation: Invitation) => void} updateElectorate
 */

/**
 * @callback MakeVaultParamManager
 * @param {LoanParams} loanParams
 * @param {Rates} rates
 * @returns {VaultParamManager}
 */

/**
 * @callback MakeElectorateParamManager
 * @param {ERef<ZoeService>} zoe
 * @param {Invitation} electorateInvitation
 * @returns {ElectorateParamManager}
 */

/**
 * @callback VaultFactoryLiquidate
 * @param {ContractFacet} zcf
 * @param {VaultKit} vaultKit
 * @param {(losses: AmountKeywordRecord,
 *             zcfSeat: ZCFSeat
 *            ) => void} burnLosses
 * @param {LiquidationStrategy} strategy
 * @param {Brand} collateralBrand
 */

/**
 * @callback MakeElectorateParams
 * @param {Amount} electorateInvitationAmount
 * @returns {Record<string,ParamShortDescription>}
 */

/**
 * @callback MakeLoanParams
 * @param {LoanParams} loanParams
 * @param {Rates} rates
 * @returns {Record<string,ParamShortDescription>}
 */

/**
 * @typedef {Object} GovernedVaultFactoryTerms
 * @property {XYKAMMPublicFacet} ammPublicFacet
 * @property {ERef<PriceAuthority>} priceAuthority
 * @property {Record<Keyword,ParamShortDescription>} loanParams
 * @property {ERef<TimerService>} timerService
 * @property {Installation} liquidationInstall
 * @property {Record<Keyword,ParamShortDescription>} main
 * @property {bigint} bootstrapPaymentValue
 */

/**
 * @callback MakeGovernedTerms
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {LoanParams} loanParams
 * @param {Installation} liquidationInstall
 * @param {ERef<TimerService>} timerService
 * @param {Amount} invitationAmount
 * @param {Rates} rates
 * @param {XYKAMMPublicFacet} ammPublicFacet
 * @param {bigint=} bootstrapPaymentValue
 * @returns {GovernedVaultFactoryTerms}
 */
