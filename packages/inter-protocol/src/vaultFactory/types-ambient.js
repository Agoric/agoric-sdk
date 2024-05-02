// @jessie-check

/**
 * @typedef {import('./vaultFactory.js').VaultFactoryContract['publicFacet']} VaultFactoryPublicFacet
 * @import {VaultNotification} from './vault.js'
 * @import {Vault} from './vault.js'
 * @import {VaultKit} from './vaultKit.js'
 * @import {VaultManager} from './vaultManager.js'
 * @import {CollateralManager} from './vaultManager.js'
 * @import {AssetReserveLimitedCreatorFacet} from '../reserve/assetReserve.js'
 * @import {AssetReservePublicFacet} from '../reserve/assetReserve.js'
 * @import {AuctioneerPublicFacet} from '../auction/auctioneer.js'
 * @import {Timestamp} from '@agoric/time'
 * @import {RelativeTime} from '@agoric/time'
 */

/**
 * @typedef {object} AutoswapLocal
 * @property {(amount: Amount, brand: Brand) => Amount} getInputPrice
 * @property {() => Invitation} makeSwapInvitation
 */

/**
 * @typedef {object} VaultManagerParamValues
 * @property {Ratio} liquidationMargin - margin below which collateral will be
 *   liquidated to satisfy the debt.
 * @property {Ratio} liquidationPenalty - penalty charged upon liquidation as
 *   proportion of debt
 * @property {Ratio} interestRate - annual interest rate charged on debt
 *   positions
 * @property {Ratio} mintFee - The fee (in BasisPoints) charged when creating or
 *   increasing a debt position.
 * @property {Amount<'nat'>} debtLimit
 * @property {Ratio} [liquidationPadding] - vault must maintain this in order to
 *   remove collateral or add debt
 */

/**
 * @callback AddVaultType
 * @param {Issuer} collateralIssuer
 * @param {Keyword} collateralKeyword
 * @param {VaultManagerParamValues} params
 * @returns {Promise<VaultManager>}
 */

/**
 * @typedef {object} VaultFactoryCreatorFacet
 * @property {AddVaultType} addVaultType
 * @property {() => Allocation} getRewardAllocation
 * @property {() => Promise<Invitation<string, never>>} makeCollectFeesInvitation
 * @property {() => import('@agoric/time').TimerWaker} makeLiquidationWaker
 * @property {() => import('@agoric/time').TimerWaker} makePriceLockWaker
 */

/**
 * @callback MintAndTransfer Mint new debt `toMint` and transfer the `fee`
 *   portion to the vaultFactory's reward pool. Then reallocate over all the
 *   seat arguments and the rewardPoolSeat. Update the `totalDebt` if the
 *   reallocate succeeds.
 * @param {ZCFSeat} mintReceiver
 * @param {Amount<'nat'>} toMint
 * @param {Amount<'nat'>} fee
 * @param {TransferPart[]} transfers
 * @returns {void}
 */

/**
 * @callback BurnDebt Burn debt tokens off a seat and update the `totalDebt` if
 *   the reallocate succeeds.
 * @param {Amount} toBurn
 * @param {ZCFSeat} fromSeat
 * @returns {void}
 */

/**
 * @typedef {object} GetVaultParams
 * @property {() => Ratio} getLiquidationMargin
 * @property {() => Ratio} getMintFee
 * @property {() => Promise<import('@agoric/zoe/tools/types.js').PriceQuote>} getCollateralQuote
 * @property {() => Ratio} getInterestRate - The annual interest rate on a debt
 *   position
 * @property {() => RelativeTime} getChargingPeriod - The period (in seconds) at
 *   which interest is charged to the debt position.
 * @property {() => RelativeTime} getRecordingPeriod - The period (in seconds)
 *   at which interest is recorded to the debt position.
 */

/** @typedef {string} VaultId */

/**
 * @typedef {object} InterestTiming
 * @property {RelativeTime} chargingPeriod in seconds
 * @property {RelativeTime} recordingPeriod in seconds
 */

/**
 * @typedef {object} LiquidationStrategy
 * @property {() => KeywordKeywordRecord} keywordMapping
 * @property {(collateral: Amount, run: Amount) => Proposal} makeProposal
 * @property {(debt: Amount) => Promise<Invitation>} makeInvitation
 */

/**
 * @typedef {object} Liquidator
 * @property {() => Promise<
 *   Invitation<void, { debt: Amount<'nat'>; penaltyRate: Ratio }>
 * >} makeLiquidateInvitation
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
 *   the present.
 * @property {Calculate} calculateReportingPeriod calculate new debt for
 *   reporting periods up to the present. If some charging periods have elapsed
 *   that don't constitute whole reporting periods, the time is not updated past
 *   them and interest is not accumulated for them.
 */

/** @typedef {{ key: 'governedParams' | { collateralBrand: Brand } }} VaultFactoryParamPath */
