import { Validator, type ValidatorSDKType } from './validator.js';
import { Coin, type CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
export declare enum AuthzPermissionChange {
    /** GRANT - Grant the address trade permissions */
    GRANT = 0,
    /** REVOKE - Revoke trade permissions from the address */
    REVOKE = 1,
    UNRECOGNIZED = -1
}
export declare const AuthzPermissionChangeSDKType: typeof AuthzPermissionChange;
export declare function authzPermissionChangeFromJSON(object: any): AuthzPermissionChange;
export declare function authzPermissionChangeToJSON(object: AuthzPermissionChange): string;
/**
 * @name MsgUpdateInnerRedemptionRateBounds
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateInnerRedemptionRateBounds
 */
export interface MsgUpdateInnerRedemptionRateBounds {
    creator: string;
    chainId: string;
    minInnerRedemptionRate: string;
    maxInnerRedemptionRate: string;
}
export interface MsgUpdateInnerRedemptionRateBoundsProtoMsg {
    typeUrl: '/stride.stakeibc.MsgUpdateInnerRedemptionRateBounds';
    value: Uint8Array;
}
/**
 * @name MsgUpdateInnerRedemptionRateBoundsSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateInnerRedemptionRateBounds
 */
export interface MsgUpdateInnerRedemptionRateBoundsSDKType {
    creator: string;
    chain_id: string;
    min_inner_redemption_rate: string;
    max_inner_redemption_rate: string;
}
/**
 * @name MsgUpdateInnerRedemptionRateBoundsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateInnerRedemptionRateBoundsResponse
 */
export interface MsgUpdateInnerRedemptionRateBoundsResponse {
}
export interface MsgUpdateInnerRedemptionRateBoundsResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgUpdateInnerRedemptionRateBoundsResponse';
    value: Uint8Array;
}
/**
 * @name MsgUpdateInnerRedemptionRateBoundsResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateInnerRedemptionRateBoundsResponse
 */
export interface MsgUpdateInnerRedemptionRateBoundsResponseSDKType {
}
/**
 * @name MsgLiquidStake
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgLiquidStake
 */
export interface MsgLiquidStake {
    creator: string;
    amount: string;
    hostDenom: string;
}
export interface MsgLiquidStakeProtoMsg {
    typeUrl: '/stride.stakeibc.MsgLiquidStake';
    value: Uint8Array;
}
/**
 * @name MsgLiquidStakeSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgLiquidStake
 */
export interface MsgLiquidStakeSDKType {
    creator: string;
    amount: string;
    host_denom: string;
}
/**
 * @name MsgLiquidStakeResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgLiquidStakeResponse
 */
export interface MsgLiquidStakeResponse {
    stToken: Coin;
}
export interface MsgLiquidStakeResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgLiquidStakeResponse';
    value: Uint8Array;
}
/**
 * @name MsgLiquidStakeResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgLiquidStakeResponse
 */
export interface MsgLiquidStakeResponseSDKType {
    st_token: CoinSDKType;
}
/**
 * @name MsgLSMLiquidStake
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgLSMLiquidStake
 */
export interface MsgLSMLiquidStake {
    creator: string;
    amount: string;
    lsmTokenIbcDenom: string;
}
export interface MsgLSMLiquidStakeProtoMsg {
    typeUrl: '/stride.stakeibc.MsgLSMLiquidStake';
    value: Uint8Array;
}
/**
 * @name MsgLSMLiquidStakeSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgLSMLiquidStake
 */
export interface MsgLSMLiquidStakeSDKType {
    creator: string;
    amount: string;
    lsm_token_ibc_denom: string;
}
/**
 * @name MsgLSMLiquidStakeResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgLSMLiquidStakeResponse
 */
export interface MsgLSMLiquidStakeResponse {
    transactionComplete: boolean;
}
export interface MsgLSMLiquidStakeResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgLSMLiquidStakeResponse';
    value: Uint8Array;
}
/**
 * @name MsgLSMLiquidStakeResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgLSMLiquidStakeResponse
 */
export interface MsgLSMLiquidStakeResponseSDKType {
    transaction_complete: boolean;
}
/**
 * @name MsgClearBalance
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgClearBalance
 */
export interface MsgClearBalance {
    creator: string;
    chainId: string;
    amount: string;
    channel: string;
}
export interface MsgClearBalanceProtoMsg {
    typeUrl: '/stride.stakeibc.MsgClearBalance';
    value: Uint8Array;
}
/**
 * @name MsgClearBalanceSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgClearBalance
 */
export interface MsgClearBalanceSDKType {
    creator: string;
    chain_id: string;
    amount: string;
    channel: string;
}
/**
 * @name MsgClearBalanceResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgClearBalanceResponse
 */
export interface MsgClearBalanceResponse {
}
export interface MsgClearBalanceResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgClearBalanceResponse';
    value: Uint8Array;
}
/**
 * @name MsgClearBalanceResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgClearBalanceResponse
 */
export interface MsgClearBalanceResponseSDKType {
}
/**
 * @name MsgRedeemStake
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRedeemStake
 */
export interface MsgRedeemStake {
    creator: string;
    amount: string;
    hostZone: string;
    receiver: string;
}
export interface MsgRedeemStakeProtoMsg {
    typeUrl: '/stride.stakeibc.MsgRedeemStake';
    value: Uint8Array;
}
/**
 * @name MsgRedeemStakeSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRedeemStake
 */
export interface MsgRedeemStakeSDKType {
    creator: string;
    amount: string;
    host_zone: string;
    receiver: string;
}
/**
 * @name MsgRedeemStakeResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRedeemStakeResponse
 */
export interface MsgRedeemStakeResponse {
}
export interface MsgRedeemStakeResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgRedeemStakeResponse';
    value: Uint8Array;
}
/**
 * @name MsgRedeemStakeResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRedeemStakeResponse
 */
export interface MsgRedeemStakeResponseSDKType {
}
/**
 * next: 15
 * @name MsgRegisterHostZone
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRegisterHostZone
 */
export interface MsgRegisterHostZone {
    connectionId: string;
    bech32prefix: string;
    hostDenom: string;
    ibcDenom: string;
    creator: string;
    transferChannelId: string;
    unbondingPeriod: bigint;
    minRedemptionRate: string;
    maxRedemptionRate: string;
    lsmLiquidStakeEnabled: boolean;
    communityPoolTreasuryAddress: string;
    maxMessagesPerIcaTx: bigint;
}
export interface MsgRegisterHostZoneProtoMsg {
    typeUrl: '/stride.stakeibc.MsgRegisterHostZone';
    value: Uint8Array;
}
/**
 * next: 15
 * @name MsgRegisterHostZoneSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRegisterHostZone
 */
export interface MsgRegisterHostZoneSDKType {
    connection_id: string;
    bech32prefix: string;
    host_denom: string;
    ibc_denom: string;
    creator: string;
    transfer_channel_id: string;
    unbonding_period: bigint;
    min_redemption_rate: string;
    max_redemption_rate: string;
    lsm_liquid_stake_enabled: boolean;
    community_pool_treasury_address: string;
    max_messages_per_ica_tx: bigint;
}
/**
 * @name MsgRegisterHostZoneResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRegisterHostZoneResponse
 */
export interface MsgRegisterHostZoneResponse {
}
export interface MsgRegisterHostZoneResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgRegisterHostZoneResponse';
    value: Uint8Array;
}
/**
 * @name MsgRegisterHostZoneResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRegisterHostZoneResponse
 */
export interface MsgRegisterHostZoneResponseSDKType {
}
/**
 * @name MsgClaimUndelegatedTokens
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgClaimUndelegatedTokens
 */
export interface MsgClaimUndelegatedTokens {
    creator: string;
    /**
     * UserUnbondingRecords are keyed on {chain_id}.{epoch}.{receiver}
     */
    hostZoneId: string;
    epoch: bigint;
    receiver: string;
}
export interface MsgClaimUndelegatedTokensProtoMsg {
    typeUrl: '/stride.stakeibc.MsgClaimUndelegatedTokens';
    value: Uint8Array;
}
/**
 * @name MsgClaimUndelegatedTokensSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgClaimUndelegatedTokens
 */
export interface MsgClaimUndelegatedTokensSDKType {
    creator: string;
    host_zone_id: string;
    epoch: bigint;
    receiver: string;
}
/**
 * @name MsgClaimUndelegatedTokensResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgClaimUndelegatedTokensResponse
 */
export interface MsgClaimUndelegatedTokensResponse {
}
export interface MsgClaimUndelegatedTokensResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgClaimUndelegatedTokensResponse';
    value: Uint8Array;
}
/**
 * @name MsgClaimUndelegatedTokensResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgClaimUndelegatedTokensResponse
 */
export interface MsgClaimUndelegatedTokensResponseSDKType {
}
/**
 * @name MsgRebalanceValidators
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRebalanceValidators
 */
export interface MsgRebalanceValidators {
    creator: string;
    hostZone: string;
    numRebalance: bigint;
}
export interface MsgRebalanceValidatorsProtoMsg {
    typeUrl: '/stride.stakeibc.MsgRebalanceValidators';
    value: Uint8Array;
}
/**
 * @name MsgRebalanceValidatorsSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRebalanceValidators
 */
export interface MsgRebalanceValidatorsSDKType {
    creator: string;
    host_zone: string;
    num_rebalance: bigint;
}
/**
 * @name MsgRebalanceValidatorsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRebalanceValidatorsResponse
 */
export interface MsgRebalanceValidatorsResponse {
}
export interface MsgRebalanceValidatorsResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgRebalanceValidatorsResponse';
    value: Uint8Array;
}
/**
 * @name MsgRebalanceValidatorsResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRebalanceValidatorsResponse
 */
export interface MsgRebalanceValidatorsResponseSDKType {
}
/**
 * @name MsgAddValidators
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgAddValidators
 */
export interface MsgAddValidators {
    creator: string;
    hostZone: string;
    validators: Validator[];
}
export interface MsgAddValidatorsProtoMsg {
    typeUrl: '/stride.stakeibc.MsgAddValidators';
    value: Uint8Array;
}
/**
 * @name MsgAddValidatorsSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgAddValidators
 */
export interface MsgAddValidatorsSDKType {
    creator: string;
    host_zone: string;
    validators: ValidatorSDKType[];
}
/**
 * @name MsgAddValidatorsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgAddValidatorsResponse
 */
export interface MsgAddValidatorsResponse {
}
export interface MsgAddValidatorsResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgAddValidatorsResponse';
    value: Uint8Array;
}
/**
 * @name MsgAddValidatorsResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgAddValidatorsResponse
 */
export interface MsgAddValidatorsResponseSDKType {
}
/**
 * @name ValidatorWeight
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ValidatorWeight
 */
export interface ValidatorWeight {
    address: string;
    weight: bigint;
}
export interface ValidatorWeightProtoMsg {
    typeUrl: '/stride.stakeibc.ValidatorWeight';
    value: Uint8Array;
}
/**
 * @name ValidatorWeightSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ValidatorWeight
 */
export interface ValidatorWeightSDKType {
    address: string;
    weight: bigint;
}
/**
 * @name MsgChangeValidatorWeights
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgChangeValidatorWeights
 */
export interface MsgChangeValidatorWeights {
    creator: string;
    hostZone: string;
    validatorWeights: ValidatorWeight[];
}
export interface MsgChangeValidatorWeightsProtoMsg {
    typeUrl: '/stride.stakeibc.MsgChangeValidatorWeights';
    value: Uint8Array;
}
/**
 * @name MsgChangeValidatorWeightsSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgChangeValidatorWeights
 */
export interface MsgChangeValidatorWeightsSDKType {
    creator: string;
    host_zone: string;
    validator_weights: ValidatorWeightSDKType[];
}
/**
 * @name MsgChangeValidatorWeightsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgChangeValidatorWeightsResponse
 */
export interface MsgChangeValidatorWeightsResponse {
}
export interface MsgChangeValidatorWeightsResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgChangeValidatorWeightsResponse';
    value: Uint8Array;
}
/**
 * @name MsgChangeValidatorWeightsResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgChangeValidatorWeightsResponse
 */
export interface MsgChangeValidatorWeightsResponseSDKType {
}
/**
 * @name MsgDeleteValidator
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgDeleteValidator
 */
export interface MsgDeleteValidator {
    creator: string;
    hostZone: string;
    valAddr: string;
}
export interface MsgDeleteValidatorProtoMsg {
    typeUrl: '/stride.stakeibc.MsgDeleteValidator';
    value: Uint8Array;
}
/**
 * @name MsgDeleteValidatorSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgDeleteValidator
 */
export interface MsgDeleteValidatorSDKType {
    creator: string;
    host_zone: string;
    val_addr: string;
}
/**
 * @name MsgDeleteValidatorResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgDeleteValidatorResponse
 */
export interface MsgDeleteValidatorResponse {
}
export interface MsgDeleteValidatorResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgDeleteValidatorResponse';
    value: Uint8Array;
}
/**
 * @name MsgDeleteValidatorResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgDeleteValidatorResponse
 */
export interface MsgDeleteValidatorResponseSDKType {
}
/**
 * @name MsgRestoreInterchainAccount
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRestoreInterchainAccount
 */
export interface MsgRestoreInterchainAccount {
    creator: string;
    chainId: string;
    connectionId: string;
    accountOwner: string;
}
export interface MsgRestoreInterchainAccountProtoMsg {
    typeUrl: '/stride.stakeibc.MsgRestoreInterchainAccount';
    value: Uint8Array;
}
/**
 * @name MsgRestoreInterchainAccountSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRestoreInterchainAccount
 */
export interface MsgRestoreInterchainAccountSDKType {
    creator: string;
    chain_id: string;
    connection_id: string;
    account_owner: string;
}
/**
 * @name MsgRestoreInterchainAccountResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRestoreInterchainAccountResponse
 */
export interface MsgRestoreInterchainAccountResponse {
}
export interface MsgRestoreInterchainAccountResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgRestoreInterchainAccountResponse';
    value: Uint8Array;
}
/**
 * @name MsgRestoreInterchainAccountResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRestoreInterchainAccountResponse
 */
export interface MsgRestoreInterchainAccountResponseSDKType {
}
/**
 * @name MsgCloseDelegationChannel
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCloseDelegationChannel
 */
export interface MsgCloseDelegationChannel {
    creator: string;
    chainId: string;
}
export interface MsgCloseDelegationChannelProtoMsg {
    typeUrl: '/stride.stakeibc.MsgCloseDelegationChannel';
    value: Uint8Array;
}
/**
 * @name MsgCloseDelegationChannelSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCloseDelegationChannel
 */
export interface MsgCloseDelegationChannelSDKType {
    creator: string;
    chain_id: string;
}
/**
 * @name MsgCloseDelegationChannelResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCloseDelegationChannelResponse
 */
export interface MsgCloseDelegationChannelResponse {
}
export interface MsgCloseDelegationChannelResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgCloseDelegationChannelResponse';
    value: Uint8Array;
}
/**
 * @name MsgCloseDelegationChannelResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCloseDelegationChannelResponse
 */
export interface MsgCloseDelegationChannelResponseSDKType {
}
/**
 * @name MsgUpdateValidatorSharesExchRate
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateValidatorSharesExchRate
 */
export interface MsgUpdateValidatorSharesExchRate {
    creator: string;
    chainId: string;
    valoper: string;
}
export interface MsgUpdateValidatorSharesExchRateProtoMsg {
    typeUrl: '/stride.stakeibc.MsgUpdateValidatorSharesExchRate';
    value: Uint8Array;
}
/**
 * @name MsgUpdateValidatorSharesExchRateSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateValidatorSharesExchRate
 */
export interface MsgUpdateValidatorSharesExchRateSDKType {
    creator: string;
    chain_id: string;
    valoper: string;
}
/**
 * @name MsgUpdateValidatorSharesExchRateResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateValidatorSharesExchRateResponse
 */
export interface MsgUpdateValidatorSharesExchRateResponse {
}
export interface MsgUpdateValidatorSharesExchRateResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgUpdateValidatorSharesExchRateResponse';
    value: Uint8Array;
}
/**
 * @name MsgUpdateValidatorSharesExchRateResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateValidatorSharesExchRateResponse
 */
export interface MsgUpdateValidatorSharesExchRateResponseSDKType {
}
/**
 * @name MsgCalibrateDelegation
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCalibrateDelegation
 */
export interface MsgCalibrateDelegation {
    creator: string;
    chainId: string;
    valoper: string;
}
export interface MsgCalibrateDelegationProtoMsg {
    typeUrl: '/stride.stakeibc.MsgCalibrateDelegation';
    value: Uint8Array;
}
/**
 * @name MsgCalibrateDelegationSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCalibrateDelegation
 */
export interface MsgCalibrateDelegationSDKType {
    creator: string;
    chain_id: string;
    valoper: string;
}
/**
 * @name MsgCalibrateDelegationResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCalibrateDelegationResponse
 */
export interface MsgCalibrateDelegationResponse {
}
export interface MsgCalibrateDelegationResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgCalibrateDelegationResponse';
    value: Uint8Array;
}
/**
 * @name MsgCalibrateDelegationResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCalibrateDelegationResponse
 */
export interface MsgCalibrateDelegationResponseSDKType {
}
/**
 * @name MsgResumeHostZone
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgResumeHostZone
 */
export interface MsgResumeHostZone {
    creator: string;
    chainId: string;
}
export interface MsgResumeHostZoneProtoMsg {
    typeUrl: '/stride.stakeibc.MsgResumeHostZone';
    value: Uint8Array;
}
/**
 * @name MsgResumeHostZoneSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgResumeHostZone
 */
export interface MsgResumeHostZoneSDKType {
    creator: string;
    chain_id: string;
}
/**
 * @name MsgResumeHostZoneResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgResumeHostZoneResponse
 */
export interface MsgResumeHostZoneResponse {
}
export interface MsgResumeHostZoneResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgResumeHostZoneResponse';
    value: Uint8Array;
}
/**
 * @name MsgResumeHostZoneResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgResumeHostZoneResponse
 */
export interface MsgResumeHostZoneResponseSDKType {
}
/**
 * Creates a new trade route
 * @name MsgCreateTradeRoute
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCreateTradeRoute
 */
export interface MsgCreateTradeRoute {
    /**
     * authority is the address that controls the module (defaults to x/gov unless
     * overwritten).
     */
    authority: string;
    /**
     * The chain ID of the host zone
     */
    hostChainId: string;
    /**
     * Connection IDs between stride and the other zones
     */
    strideToRewardConnectionId: string;
    strideToTradeConnectionId: string;
    /**
     * Transfer channels between the host, reward, and trade zones
     */
    hostToRewardTransferChannelId: string;
    rewardToTradeTransferChannelId: string;
    tradeToHostTransferChannelId: string;
    /**
     * ibc denom for the reward token on the host zone (e.g. ibc/usdc on dYdX)
     */
    rewardDenomOnHost: string;
    /**
     * native denom of reward token on the reward zone (e.g. usdc on Noble)
     */
    rewardDenomOnReward: string;
    /**
     * ibc denom of the reward token on the trade zone (e.g. ibc/usdc on Osmosis)
     */
    rewardDenomOnTrade: string;
    /**
     * ibc denom of the host's token on the trade zone (e.g. ibc/dydx on Osmosis)
     */
    hostDenomOnTrade: string;
    /**
     * the host zone's native denom (e.g. dydx on dYdX)
     */
    hostDenomOnHost: string;
    /**
     * Deprecated, the trades are now executed off-chain via authz
     *
     * The osmosis pool ID
     * @deprecated
     */
    poolId: bigint;
    /**
     * Deprecated, the trades are now executed off-chain via authz
     *
     * Threshold defining the percentage of tokens that could be lost in the trade
     * This captures both the loss from slippage and from a stale price on stride
     * "0.05" means the output from the trade can be no less than a 5% deviation
     * from the current value
     * @deprecated
     */
    maxAllowedSwapLossRate: string;
    /**
     * Deprecated, the trades are now executed off-chain via authz
     *
     * minimum amount of reward tokens to initate a swap
     * if not provided, defaults to 0
     */
    minSwapAmount: string;
    /**
     * Deprecated, the trades are now executed off-chain via authz
     *
     * maximum amount of reward tokens in a single swap
     * if not provided, defaults to 10e24
     */
    maxSwapAmount: string;
    /**
     * Minimum amount of reward token that must be accumulated before
     * the tokens are transferred to the trade ICA
     */
    minTransferAmount: string;
}
export interface MsgCreateTradeRouteProtoMsg {
    typeUrl: '/stride.stakeibc.MsgCreateTradeRoute';
    value: Uint8Array;
}
/**
 * Creates a new trade route
 * @name MsgCreateTradeRouteSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCreateTradeRoute
 */
export interface MsgCreateTradeRouteSDKType {
    authority: string;
    host_chain_id: string;
    stride_to_reward_connection_id: string;
    stride_to_trade_connection_id: string;
    host_to_reward_transfer_channel_id: string;
    reward_to_trade_transfer_channel_id: string;
    trade_to_host_transfer_channel_id: string;
    reward_denom_on_host: string;
    reward_denom_on_reward: string;
    reward_denom_on_trade: string;
    host_denom_on_trade: string;
    host_denom_on_host: string;
    /**
     * @deprecated
     */
    pool_id: bigint;
    /**
     * @deprecated
     */
    max_allowed_swap_loss_rate: string;
    min_swap_amount: string;
    max_swap_amount: string;
    min_transfer_amount: string;
}
/**
 * @name MsgCreateTradeRouteResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCreateTradeRouteResponse
 */
export interface MsgCreateTradeRouteResponse {
}
export interface MsgCreateTradeRouteResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgCreateTradeRouteResponse';
    value: Uint8Array;
}
/**
 * @name MsgCreateTradeRouteResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCreateTradeRouteResponse
 */
export interface MsgCreateTradeRouteResponseSDKType {
}
/**
 * Deletes a trade route
 * @name MsgDeleteTradeRoute
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgDeleteTradeRoute
 */
export interface MsgDeleteTradeRoute {
    /**
     * authority is the address that controls the module (defaults to x/gov unless
     * overwritten).
     */
    authority: string;
    /**
     * The reward denom of the route in it's native form (e.g. usdc)
     */
    rewardDenom: string;
    /**
     * The host zone's denom in it's native form (e.g. dydx)
     */
    hostDenom: string;
}
export interface MsgDeleteTradeRouteProtoMsg {
    typeUrl: '/stride.stakeibc.MsgDeleteTradeRoute';
    value: Uint8Array;
}
/**
 * Deletes a trade route
 * @name MsgDeleteTradeRouteSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgDeleteTradeRoute
 */
export interface MsgDeleteTradeRouteSDKType {
    authority: string;
    reward_denom: string;
    host_denom: string;
}
/**
 * @name MsgDeleteTradeRouteResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgDeleteTradeRouteResponse
 */
export interface MsgDeleteTradeRouteResponse {
}
export interface MsgDeleteTradeRouteResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgDeleteTradeRouteResponse';
    value: Uint8Array;
}
/**
 * @name MsgDeleteTradeRouteResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgDeleteTradeRouteResponse
 */
export interface MsgDeleteTradeRouteResponseSDKType {
}
/**
 * Updates the config of a trade route
 * @name MsgUpdateTradeRoute
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateTradeRoute
 */
export interface MsgUpdateTradeRoute {
    /**
     * authority is the address that controls the module (defaults to x/gov unless
     * overwritten).
     */
    authority: string;
    /**
     * The reward denom of the route in it's native form (e.g. usdc)
     */
    rewardDenom: string;
    /**
     * The host zone's denom in it's native form (e.g. dydx)
     */
    hostDenom: string;
    /**
     * Deprecated, the trades are now executed off-chain via authz
     *
     * The osmosis pool ID
     * @deprecated
     */
    poolId: bigint;
    /**
     * Deprecated, the trades are now executed off-chain via authz
     *
     * Threshold defining the percentage of tokens that could be lost in the trade
     * This captures both the loss from slippage and from a stale price on stride
     * "0.05" means the output from the trade can be no less than a 5% deviation
     * from the current value
     * @deprecated
     */
    maxAllowedSwapLossRate: string;
    /**
     * Deprecated, the trades are now executed off-chain via authz
     *
     * minimum amount of reward tokens to initate a swap
     * if not provided, defaults to 0
     * @deprecated
     */
    minSwapAmount: string;
    /**
     * Deprecated, the trades are now executed off-chain via authz
     *
     * maximum amount of reward tokens in a single swap
     * if not provided, defaults to 10e24
     * @deprecated
     */
    maxSwapAmount: string;
    /**
     * Minimum amount of reward token that must be accumulated before
     * the tokens are transferred to the trade ICA
     */
    minTransferAmount: string;
}
export interface MsgUpdateTradeRouteProtoMsg {
    typeUrl: '/stride.stakeibc.MsgUpdateTradeRoute';
    value: Uint8Array;
}
/**
 * Updates the config of a trade route
 * @name MsgUpdateTradeRouteSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateTradeRoute
 */
export interface MsgUpdateTradeRouteSDKType {
    authority: string;
    reward_denom: string;
    host_denom: string;
    /**
     * @deprecated
     */
    pool_id: bigint;
    /**
     * @deprecated
     */
    max_allowed_swap_loss_rate: string;
    /**
     * @deprecated
     */
    min_swap_amount: string;
    /**
     * @deprecated
     */
    max_swap_amount: string;
    min_transfer_amount: string;
}
/**
 * @name MsgUpdateTradeRouteResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateTradeRouteResponse
 */
export interface MsgUpdateTradeRouteResponse {
}
export interface MsgUpdateTradeRouteResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgUpdateTradeRouteResponse';
    value: Uint8Array;
}
/**
 * @name MsgUpdateTradeRouteResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateTradeRouteResponse
 */
export interface MsgUpdateTradeRouteResponseSDKType {
}
/**
 * Registers or updates a community pool rebate by specifying the amount liquid
 * staked
 * @name MsgSetCommunityPoolRebate
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgSetCommunityPoolRebate
 */
export interface MsgSetCommunityPoolRebate {
    /**
     * Message signer (admin only)
     */
    creator: string;
    /**
     * Chain id of the chain whose community pool has a liquid staking rebate
     * arrangement with stride
     */
    chainId: string;
    /**
     * Rebate percentage represented as a decimal (e.g. 0.2 for 20%)
     */
    rebateRate: string;
    /**
     * Number of stTokens recieved by the community pool after liquid staking
     */
    liquidStakedStTokenAmount: string;
}
export interface MsgSetCommunityPoolRebateProtoMsg {
    typeUrl: '/stride.stakeibc.MsgSetCommunityPoolRebate';
    value: Uint8Array;
}
/**
 * Registers or updates a community pool rebate by specifying the amount liquid
 * staked
 * @name MsgSetCommunityPoolRebateSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgSetCommunityPoolRebate
 */
export interface MsgSetCommunityPoolRebateSDKType {
    creator: string;
    chain_id: string;
    rebate_rate: string;
    liquid_staked_st_token_amount: string;
}
/**
 * @name MsgSetCommunityPoolRebateResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgSetCommunityPoolRebateResponse
 */
export interface MsgSetCommunityPoolRebateResponse {
}
export interface MsgSetCommunityPoolRebateResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgSetCommunityPoolRebateResponse';
    value: Uint8Array;
}
/**
 * @name MsgSetCommunityPoolRebateResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgSetCommunityPoolRebateResponse
 */
export interface MsgSetCommunityPoolRebateResponseSDKType {
}
/**
 * Grants or revokes trade permissions to a given address via authz
 * @name MsgToggleTradeController
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgToggleTradeController
 */
export interface MsgToggleTradeController {
    /**
     * Message signer (admin only)
     */
    creator: string;
    /**
     * Chain ID of the trade account
     */
    chainId: string;
    /**
     * Permission change (either grant or revoke)
     */
    permissionChange: AuthzPermissionChange;
    /**
     * Address of trade operator
     */
    address: string;
    /**
     * Option to grant/revoke the legacy osmosis swap message
     */
    legacy: boolean;
}
export interface MsgToggleTradeControllerProtoMsg {
    typeUrl: '/stride.stakeibc.MsgToggleTradeController';
    value: Uint8Array;
}
/**
 * Grants or revokes trade permissions to a given address via authz
 * @name MsgToggleTradeControllerSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgToggleTradeController
 */
export interface MsgToggleTradeControllerSDKType {
    creator: string;
    chain_id: string;
    permission_change: AuthzPermissionChange;
    address: string;
    legacy: boolean;
}
/**
 * @name MsgToggleTradeControllerResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgToggleTradeControllerResponse
 */
export interface MsgToggleTradeControllerResponse {
}
export interface MsgToggleTradeControllerResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgToggleTradeControllerResponse';
    value: Uint8Array;
}
/**
 * @name MsgToggleTradeControllerResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgToggleTradeControllerResponse
 */
export interface MsgToggleTradeControllerResponseSDKType {
}
/**
 * Updates host zone params
 * @name MsgUpdateHostZoneParams
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateHostZoneParams
 */
export interface MsgUpdateHostZoneParams {
    /**
     * authority is the address that controls the module (defaults to x/gov unless
     * overwritten).
     */
    authority: string;
    /**
     * Chain ID of the host zone
     */
    chainId: string;
    /**
     * Max messages that can be sent in a single ICA message
     */
    maxMessagesPerIcaTx: bigint;
}
export interface MsgUpdateHostZoneParamsProtoMsg {
    typeUrl: '/stride.stakeibc.MsgUpdateHostZoneParams';
    value: Uint8Array;
}
/**
 * Updates host zone params
 * @name MsgUpdateHostZoneParamsSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateHostZoneParams
 */
export interface MsgUpdateHostZoneParamsSDKType {
    authority: string;
    chain_id: string;
    max_messages_per_ica_tx: bigint;
}
/**
 * @name MsgUpdateHostZoneParamsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateHostZoneParamsResponse
 */
export interface MsgUpdateHostZoneParamsResponse {
}
export interface MsgUpdateHostZoneParamsResponseProtoMsg {
    typeUrl: '/stride.stakeibc.MsgUpdateHostZoneParamsResponse';
    value: Uint8Array;
}
/**
 * @name MsgUpdateHostZoneParamsResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateHostZoneParamsResponse
 */
export interface MsgUpdateHostZoneParamsResponseSDKType {
}
/**
 * @name MsgUpdateInnerRedemptionRateBounds
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateInnerRedemptionRateBounds
 */
export declare const MsgUpdateInnerRedemptionRateBounds: {
    typeUrl: "/stride.stakeibc.MsgUpdateInnerRedemptionRateBounds";
    is(o: any): o is MsgUpdateInnerRedemptionRateBounds;
    isSDK(o: any): o is MsgUpdateInnerRedemptionRateBoundsSDKType;
    encode(message: MsgUpdateInnerRedemptionRateBounds, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateInnerRedemptionRateBounds;
    fromJSON(object: any): MsgUpdateInnerRedemptionRateBounds;
    toJSON(message: MsgUpdateInnerRedemptionRateBounds): JsonSafe<MsgUpdateInnerRedemptionRateBounds>;
    fromPartial(object: Partial<MsgUpdateInnerRedemptionRateBounds>): MsgUpdateInnerRedemptionRateBounds;
    fromProtoMsg(message: MsgUpdateInnerRedemptionRateBoundsProtoMsg): MsgUpdateInnerRedemptionRateBounds;
    toProto(message: MsgUpdateInnerRedemptionRateBounds): Uint8Array;
    toProtoMsg(message: MsgUpdateInnerRedemptionRateBounds): MsgUpdateInnerRedemptionRateBoundsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgUpdateInnerRedemptionRateBoundsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateInnerRedemptionRateBoundsResponse
 */
export declare const MsgUpdateInnerRedemptionRateBoundsResponse: {
    typeUrl: "/stride.stakeibc.MsgUpdateInnerRedemptionRateBoundsResponse";
    is(o: any): o is MsgUpdateInnerRedemptionRateBoundsResponse;
    isSDK(o: any): o is MsgUpdateInnerRedemptionRateBoundsResponseSDKType;
    encode(_: MsgUpdateInnerRedemptionRateBoundsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateInnerRedemptionRateBoundsResponse;
    fromJSON(_: any): MsgUpdateInnerRedemptionRateBoundsResponse;
    toJSON(_: MsgUpdateInnerRedemptionRateBoundsResponse): JsonSafe<MsgUpdateInnerRedemptionRateBoundsResponse>;
    fromPartial(_: Partial<MsgUpdateInnerRedemptionRateBoundsResponse>): MsgUpdateInnerRedemptionRateBoundsResponse;
    fromProtoMsg(message: MsgUpdateInnerRedemptionRateBoundsResponseProtoMsg): MsgUpdateInnerRedemptionRateBoundsResponse;
    toProto(message: MsgUpdateInnerRedemptionRateBoundsResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateInnerRedemptionRateBoundsResponse): MsgUpdateInnerRedemptionRateBoundsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgLiquidStake
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgLiquidStake
 */
export declare const MsgLiquidStake: {
    typeUrl: "/stride.stakeibc.MsgLiquidStake";
    is(o: any): o is MsgLiquidStake;
    isSDK(o: any): o is MsgLiquidStakeSDKType;
    encode(message: MsgLiquidStake, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgLiquidStake;
    fromJSON(object: any): MsgLiquidStake;
    toJSON(message: MsgLiquidStake): JsonSafe<MsgLiquidStake>;
    fromPartial(object: Partial<MsgLiquidStake>): MsgLiquidStake;
    fromProtoMsg(message: MsgLiquidStakeProtoMsg): MsgLiquidStake;
    toProto(message: MsgLiquidStake): Uint8Array;
    toProtoMsg(message: MsgLiquidStake): MsgLiquidStakeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgLiquidStakeResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgLiquidStakeResponse
 */
export declare const MsgLiquidStakeResponse: {
    typeUrl: "/stride.stakeibc.MsgLiquidStakeResponse";
    is(o: any): o is MsgLiquidStakeResponse;
    isSDK(o: any): o is MsgLiquidStakeResponseSDKType;
    encode(message: MsgLiquidStakeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgLiquidStakeResponse;
    fromJSON(object: any): MsgLiquidStakeResponse;
    toJSON(message: MsgLiquidStakeResponse): JsonSafe<MsgLiquidStakeResponse>;
    fromPartial(object: Partial<MsgLiquidStakeResponse>): MsgLiquidStakeResponse;
    fromProtoMsg(message: MsgLiquidStakeResponseProtoMsg): MsgLiquidStakeResponse;
    toProto(message: MsgLiquidStakeResponse): Uint8Array;
    toProtoMsg(message: MsgLiquidStakeResponse): MsgLiquidStakeResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgLSMLiquidStake
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgLSMLiquidStake
 */
export declare const MsgLSMLiquidStake: {
    typeUrl: "/stride.stakeibc.MsgLSMLiquidStake";
    is(o: any): o is MsgLSMLiquidStake;
    isSDK(o: any): o is MsgLSMLiquidStakeSDKType;
    encode(message: MsgLSMLiquidStake, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgLSMLiquidStake;
    fromJSON(object: any): MsgLSMLiquidStake;
    toJSON(message: MsgLSMLiquidStake): JsonSafe<MsgLSMLiquidStake>;
    fromPartial(object: Partial<MsgLSMLiquidStake>): MsgLSMLiquidStake;
    fromProtoMsg(message: MsgLSMLiquidStakeProtoMsg): MsgLSMLiquidStake;
    toProto(message: MsgLSMLiquidStake): Uint8Array;
    toProtoMsg(message: MsgLSMLiquidStake): MsgLSMLiquidStakeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgLSMLiquidStakeResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgLSMLiquidStakeResponse
 */
export declare const MsgLSMLiquidStakeResponse: {
    typeUrl: "/stride.stakeibc.MsgLSMLiquidStakeResponse";
    is(o: any): o is MsgLSMLiquidStakeResponse;
    isSDK(o: any): o is MsgLSMLiquidStakeResponseSDKType;
    encode(message: MsgLSMLiquidStakeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgLSMLiquidStakeResponse;
    fromJSON(object: any): MsgLSMLiquidStakeResponse;
    toJSON(message: MsgLSMLiquidStakeResponse): JsonSafe<MsgLSMLiquidStakeResponse>;
    fromPartial(object: Partial<MsgLSMLiquidStakeResponse>): MsgLSMLiquidStakeResponse;
    fromProtoMsg(message: MsgLSMLiquidStakeResponseProtoMsg): MsgLSMLiquidStakeResponse;
    toProto(message: MsgLSMLiquidStakeResponse): Uint8Array;
    toProtoMsg(message: MsgLSMLiquidStakeResponse): MsgLSMLiquidStakeResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgClearBalance
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgClearBalance
 */
export declare const MsgClearBalance: {
    typeUrl: "/stride.stakeibc.MsgClearBalance";
    is(o: any): o is MsgClearBalance;
    isSDK(o: any): o is MsgClearBalanceSDKType;
    encode(message: MsgClearBalance, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgClearBalance;
    fromJSON(object: any): MsgClearBalance;
    toJSON(message: MsgClearBalance): JsonSafe<MsgClearBalance>;
    fromPartial(object: Partial<MsgClearBalance>): MsgClearBalance;
    fromProtoMsg(message: MsgClearBalanceProtoMsg): MsgClearBalance;
    toProto(message: MsgClearBalance): Uint8Array;
    toProtoMsg(message: MsgClearBalance): MsgClearBalanceProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgClearBalanceResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgClearBalanceResponse
 */
export declare const MsgClearBalanceResponse: {
    typeUrl: "/stride.stakeibc.MsgClearBalanceResponse";
    is(o: any): o is MsgClearBalanceResponse;
    isSDK(o: any): o is MsgClearBalanceResponseSDKType;
    encode(_: MsgClearBalanceResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgClearBalanceResponse;
    fromJSON(_: any): MsgClearBalanceResponse;
    toJSON(_: MsgClearBalanceResponse): JsonSafe<MsgClearBalanceResponse>;
    fromPartial(_: Partial<MsgClearBalanceResponse>): MsgClearBalanceResponse;
    fromProtoMsg(message: MsgClearBalanceResponseProtoMsg): MsgClearBalanceResponse;
    toProto(message: MsgClearBalanceResponse): Uint8Array;
    toProtoMsg(message: MsgClearBalanceResponse): MsgClearBalanceResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgRedeemStake
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRedeemStake
 */
export declare const MsgRedeemStake: {
    typeUrl: "/stride.stakeibc.MsgRedeemStake";
    is(o: any): o is MsgRedeemStake;
    isSDK(o: any): o is MsgRedeemStakeSDKType;
    encode(message: MsgRedeemStake, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRedeemStake;
    fromJSON(object: any): MsgRedeemStake;
    toJSON(message: MsgRedeemStake): JsonSafe<MsgRedeemStake>;
    fromPartial(object: Partial<MsgRedeemStake>): MsgRedeemStake;
    fromProtoMsg(message: MsgRedeemStakeProtoMsg): MsgRedeemStake;
    toProto(message: MsgRedeemStake): Uint8Array;
    toProtoMsg(message: MsgRedeemStake): MsgRedeemStakeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgRedeemStakeResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRedeemStakeResponse
 */
export declare const MsgRedeemStakeResponse: {
    typeUrl: "/stride.stakeibc.MsgRedeemStakeResponse";
    is(o: any): o is MsgRedeemStakeResponse;
    isSDK(o: any): o is MsgRedeemStakeResponseSDKType;
    encode(_: MsgRedeemStakeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRedeemStakeResponse;
    fromJSON(_: any): MsgRedeemStakeResponse;
    toJSON(_: MsgRedeemStakeResponse): JsonSafe<MsgRedeemStakeResponse>;
    fromPartial(_: Partial<MsgRedeemStakeResponse>): MsgRedeemStakeResponse;
    fromProtoMsg(message: MsgRedeemStakeResponseProtoMsg): MsgRedeemStakeResponse;
    toProto(message: MsgRedeemStakeResponse): Uint8Array;
    toProtoMsg(message: MsgRedeemStakeResponse): MsgRedeemStakeResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * next: 15
 * @name MsgRegisterHostZone
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRegisterHostZone
 */
export declare const MsgRegisterHostZone: {
    typeUrl: "/stride.stakeibc.MsgRegisterHostZone";
    is(o: any): o is MsgRegisterHostZone;
    isSDK(o: any): o is MsgRegisterHostZoneSDKType;
    encode(message: MsgRegisterHostZone, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRegisterHostZone;
    fromJSON(object: any): MsgRegisterHostZone;
    toJSON(message: MsgRegisterHostZone): JsonSafe<MsgRegisterHostZone>;
    fromPartial(object: Partial<MsgRegisterHostZone>): MsgRegisterHostZone;
    fromProtoMsg(message: MsgRegisterHostZoneProtoMsg): MsgRegisterHostZone;
    toProto(message: MsgRegisterHostZone): Uint8Array;
    toProtoMsg(message: MsgRegisterHostZone): MsgRegisterHostZoneProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgRegisterHostZoneResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRegisterHostZoneResponse
 */
export declare const MsgRegisterHostZoneResponse: {
    typeUrl: "/stride.stakeibc.MsgRegisterHostZoneResponse";
    is(o: any): o is MsgRegisterHostZoneResponse;
    isSDK(o: any): o is MsgRegisterHostZoneResponseSDKType;
    encode(_: MsgRegisterHostZoneResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRegisterHostZoneResponse;
    fromJSON(_: any): MsgRegisterHostZoneResponse;
    toJSON(_: MsgRegisterHostZoneResponse): JsonSafe<MsgRegisterHostZoneResponse>;
    fromPartial(_: Partial<MsgRegisterHostZoneResponse>): MsgRegisterHostZoneResponse;
    fromProtoMsg(message: MsgRegisterHostZoneResponseProtoMsg): MsgRegisterHostZoneResponse;
    toProto(message: MsgRegisterHostZoneResponse): Uint8Array;
    toProtoMsg(message: MsgRegisterHostZoneResponse): MsgRegisterHostZoneResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgClaimUndelegatedTokens
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgClaimUndelegatedTokens
 */
export declare const MsgClaimUndelegatedTokens: {
    typeUrl: "/stride.stakeibc.MsgClaimUndelegatedTokens";
    is(o: any): o is MsgClaimUndelegatedTokens;
    isSDK(o: any): o is MsgClaimUndelegatedTokensSDKType;
    encode(message: MsgClaimUndelegatedTokens, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgClaimUndelegatedTokens;
    fromJSON(object: any): MsgClaimUndelegatedTokens;
    toJSON(message: MsgClaimUndelegatedTokens): JsonSafe<MsgClaimUndelegatedTokens>;
    fromPartial(object: Partial<MsgClaimUndelegatedTokens>): MsgClaimUndelegatedTokens;
    fromProtoMsg(message: MsgClaimUndelegatedTokensProtoMsg): MsgClaimUndelegatedTokens;
    toProto(message: MsgClaimUndelegatedTokens): Uint8Array;
    toProtoMsg(message: MsgClaimUndelegatedTokens): MsgClaimUndelegatedTokensProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgClaimUndelegatedTokensResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgClaimUndelegatedTokensResponse
 */
export declare const MsgClaimUndelegatedTokensResponse: {
    typeUrl: "/stride.stakeibc.MsgClaimUndelegatedTokensResponse";
    is(o: any): o is MsgClaimUndelegatedTokensResponse;
    isSDK(o: any): o is MsgClaimUndelegatedTokensResponseSDKType;
    encode(_: MsgClaimUndelegatedTokensResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgClaimUndelegatedTokensResponse;
    fromJSON(_: any): MsgClaimUndelegatedTokensResponse;
    toJSON(_: MsgClaimUndelegatedTokensResponse): JsonSafe<MsgClaimUndelegatedTokensResponse>;
    fromPartial(_: Partial<MsgClaimUndelegatedTokensResponse>): MsgClaimUndelegatedTokensResponse;
    fromProtoMsg(message: MsgClaimUndelegatedTokensResponseProtoMsg): MsgClaimUndelegatedTokensResponse;
    toProto(message: MsgClaimUndelegatedTokensResponse): Uint8Array;
    toProtoMsg(message: MsgClaimUndelegatedTokensResponse): MsgClaimUndelegatedTokensResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgRebalanceValidators
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRebalanceValidators
 */
export declare const MsgRebalanceValidators: {
    typeUrl: "/stride.stakeibc.MsgRebalanceValidators";
    is(o: any): o is MsgRebalanceValidators;
    isSDK(o: any): o is MsgRebalanceValidatorsSDKType;
    encode(message: MsgRebalanceValidators, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRebalanceValidators;
    fromJSON(object: any): MsgRebalanceValidators;
    toJSON(message: MsgRebalanceValidators): JsonSafe<MsgRebalanceValidators>;
    fromPartial(object: Partial<MsgRebalanceValidators>): MsgRebalanceValidators;
    fromProtoMsg(message: MsgRebalanceValidatorsProtoMsg): MsgRebalanceValidators;
    toProto(message: MsgRebalanceValidators): Uint8Array;
    toProtoMsg(message: MsgRebalanceValidators): MsgRebalanceValidatorsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgRebalanceValidatorsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRebalanceValidatorsResponse
 */
export declare const MsgRebalanceValidatorsResponse: {
    typeUrl: "/stride.stakeibc.MsgRebalanceValidatorsResponse";
    is(o: any): o is MsgRebalanceValidatorsResponse;
    isSDK(o: any): o is MsgRebalanceValidatorsResponseSDKType;
    encode(_: MsgRebalanceValidatorsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRebalanceValidatorsResponse;
    fromJSON(_: any): MsgRebalanceValidatorsResponse;
    toJSON(_: MsgRebalanceValidatorsResponse): JsonSafe<MsgRebalanceValidatorsResponse>;
    fromPartial(_: Partial<MsgRebalanceValidatorsResponse>): MsgRebalanceValidatorsResponse;
    fromProtoMsg(message: MsgRebalanceValidatorsResponseProtoMsg): MsgRebalanceValidatorsResponse;
    toProto(message: MsgRebalanceValidatorsResponse): Uint8Array;
    toProtoMsg(message: MsgRebalanceValidatorsResponse): MsgRebalanceValidatorsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgAddValidators
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgAddValidators
 */
export declare const MsgAddValidators: {
    typeUrl: "/stride.stakeibc.MsgAddValidators";
    is(o: any): o is MsgAddValidators;
    isSDK(o: any): o is MsgAddValidatorsSDKType;
    encode(message: MsgAddValidators, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgAddValidators;
    fromJSON(object: any): MsgAddValidators;
    toJSON(message: MsgAddValidators): JsonSafe<MsgAddValidators>;
    fromPartial(object: Partial<MsgAddValidators>): MsgAddValidators;
    fromProtoMsg(message: MsgAddValidatorsProtoMsg): MsgAddValidators;
    toProto(message: MsgAddValidators): Uint8Array;
    toProtoMsg(message: MsgAddValidators): MsgAddValidatorsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgAddValidatorsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgAddValidatorsResponse
 */
export declare const MsgAddValidatorsResponse: {
    typeUrl: "/stride.stakeibc.MsgAddValidatorsResponse";
    is(o: any): o is MsgAddValidatorsResponse;
    isSDK(o: any): o is MsgAddValidatorsResponseSDKType;
    encode(_: MsgAddValidatorsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgAddValidatorsResponse;
    fromJSON(_: any): MsgAddValidatorsResponse;
    toJSON(_: MsgAddValidatorsResponse): JsonSafe<MsgAddValidatorsResponse>;
    fromPartial(_: Partial<MsgAddValidatorsResponse>): MsgAddValidatorsResponse;
    fromProtoMsg(message: MsgAddValidatorsResponseProtoMsg): MsgAddValidatorsResponse;
    toProto(message: MsgAddValidatorsResponse): Uint8Array;
    toProtoMsg(message: MsgAddValidatorsResponse): MsgAddValidatorsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ValidatorWeight
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ValidatorWeight
 */
export declare const ValidatorWeight: {
    typeUrl: "/stride.stakeibc.ValidatorWeight";
    is(o: any): o is ValidatorWeight;
    isSDK(o: any): o is ValidatorWeightSDKType;
    encode(message: ValidatorWeight, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ValidatorWeight;
    fromJSON(object: any): ValidatorWeight;
    toJSON(message: ValidatorWeight): JsonSafe<ValidatorWeight>;
    fromPartial(object: Partial<ValidatorWeight>): ValidatorWeight;
    fromProtoMsg(message: ValidatorWeightProtoMsg): ValidatorWeight;
    toProto(message: ValidatorWeight): Uint8Array;
    toProtoMsg(message: ValidatorWeight): ValidatorWeightProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgChangeValidatorWeights
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgChangeValidatorWeights
 */
export declare const MsgChangeValidatorWeights: {
    typeUrl: "/stride.stakeibc.MsgChangeValidatorWeights";
    is(o: any): o is MsgChangeValidatorWeights;
    isSDK(o: any): o is MsgChangeValidatorWeightsSDKType;
    encode(message: MsgChangeValidatorWeights, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChangeValidatorWeights;
    fromJSON(object: any): MsgChangeValidatorWeights;
    toJSON(message: MsgChangeValidatorWeights): JsonSafe<MsgChangeValidatorWeights>;
    fromPartial(object: Partial<MsgChangeValidatorWeights>): MsgChangeValidatorWeights;
    fromProtoMsg(message: MsgChangeValidatorWeightsProtoMsg): MsgChangeValidatorWeights;
    toProto(message: MsgChangeValidatorWeights): Uint8Array;
    toProtoMsg(message: MsgChangeValidatorWeights): MsgChangeValidatorWeightsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgChangeValidatorWeightsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgChangeValidatorWeightsResponse
 */
export declare const MsgChangeValidatorWeightsResponse: {
    typeUrl: "/stride.stakeibc.MsgChangeValidatorWeightsResponse";
    is(o: any): o is MsgChangeValidatorWeightsResponse;
    isSDK(o: any): o is MsgChangeValidatorWeightsResponseSDKType;
    encode(_: MsgChangeValidatorWeightsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgChangeValidatorWeightsResponse;
    fromJSON(_: any): MsgChangeValidatorWeightsResponse;
    toJSON(_: MsgChangeValidatorWeightsResponse): JsonSafe<MsgChangeValidatorWeightsResponse>;
    fromPartial(_: Partial<MsgChangeValidatorWeightsResponse>): MsgChangeValidatorWeightsResponse;
    fromProtoMsg(message: MsgChangeValidatorWeightsResponseProtoMsg): MsgChangeValidatorWeightsResponse;
    toProto(message: MsgChangeValidatorWeightsResponse): Uint8Array;
    toProtoMsg(message: MsgChangeValidatorWeightsResponse): MsgChangeValidatorWeightsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgDeleteValidator
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgDeleteValidator
 */
export declare const MsgDeleteValidator: {
    typeUrl: "/stride.stakeibc.MsgDeleteValidator";
    is(o: any): o is MsgDeleteValidator;
    isSDK(o: any): o is MsgDeleteValidatorSDKType;
    encode(message: MsgDeleteValidator, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDeleteValidator;
    fromJSON(object: any): MsgDeleteValidator;
    toJSON(message: MsgDeleteValidator): JsonSafe<MsgDeleteValidator>;
    fromPartial(object: Partial<MsgDeleteValidator>): MsgDeleteValidator;
    fromProtoMsg(message: MsgDeleteValidatorProtoMsg): MsgDeleteValidator;
    toProto(message: MsgDeleteValidator): Uint8Array;
    toProtoMsg(message: MsgDeleteValidator): MsgDeleteValidatorProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgDeleteValidatorResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgDeleteValidatorResponse
 */
export declare const MsgDeleteValidatorResponse: {
    typeUrl: "/stride.stakeibc.MsgDeleteValidatorResponse";
    is(o: any): o is MsgDeleteValidatorResponse;
    isSDK(o: any): o is MsgDeleteValidatorResponseSDKType;
    encode(_: MsgDeleteValidatorResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDeleteValidatorResponse;
    fromJSON(_: any): MsgDeleteValidatorResponse;
    toJSON(_: MsgDeleteValidatorResponse): JsonSafe<MsgDeleteValidatorResponse>;
    fromPartial(_: Partial<MsgDeleteValidatorResponse>): MsgDeleteValidatorResponse;
    fromProtoMsg(message: MsgDeleteValidatorResponseProtoMsg): MsgDeleteValidatorResponse;
    toProto(message: MsgDeleteValidatorResponse): Uint8Array;
    toProtoMsg(message: MsgDeleteValidatorResponse): MsgDeleteValidatorResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgRestoreInterchainAccount
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRestoreInterchainAccount
 */
export declare const MsgRestoreInterchainAccount: {
    typeUrl: "/stride.stakeibc.MsgRestoreInterchainAccount";
    is(o: any): o is MsgRestoreInterchainAccount;
    isSDK(o: any): o is MsgRestoreInterchainAccountSDKType;
    encode(message: MsgRestoreInterchainAccount, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRestoreInterchainAccount;
    fromJSON(object: any): MsgRestoreInterchainAccount;
    toJSON(message: MsgRestoreInterchainAccount): JsonSafe<MsgRestoreInterchainAccount>;
    fromPartial(object: Partial<MsgRestoreInterchainAccount>): MsgRestoreInterchainAccount;
    fromProtoMsg(message: MsgRestoreInterchainAccountProtoMsg): MsgRestoreInterchainAccount;
    toProto(message: MsgRestoreInterchainAccount): Uint8Array;
    toProtoMsg(message: MsgRestoreInterchainAccount): MsgRestoreInterchainAccountProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgRestoreInterchainAccountResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgRestoreInterchainAccountResponse
 */
export declare const MsgRestoreInterchainAccountResponse: {
    typeUrl: "/stride.stakeibc.MsgRestoreInterchainAccountResponse";
    is(o: any): o is MsgRestoreInterchainAccountResponse;
    isSDK(o: any): o is MsgRestoreInterchainAccountResponseSDKType;
    encode(_: MsgRestoreInterchainAccountResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRestoreInterchainAccountResponse;
    fromJSON(_: any): MsgRestoreInterchainAccountResponse;
    toJSON(_: MsgRestoreInterchainAccountResponse): JsonSafe<MsgRestoreInterchainAccountResponse>;
    fromPartial(_: Partial<MsgRestoreInterchainAccountResponse>): MsgRestoreInterchainAccountResponse;
    fromProtoMsg(message: MsgRestoreInterchainAccountResponseProtoMsg): MsgRestoreInterchainAccountResponse;
    toProto(message: MsgRestoreInterchainAccountResponse): Uint8Array;
    toProtoMsg(message: MsgRestoreInterchainAccountResponse): MsgRestoreInterchainAccountResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgCloseDelegationChannel
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCloseDelegationChannel
 */
export declare const MsgCloseDelegationChannel: {
    typeUrl: "/stride.stakeibc.MsgCloseDelegationChannel";
    is(o: any): o is MsgCloseDelegationChannel;
    isSDK(o: any): o is MsgCloseDelegationChannelSDKType;
    encode(message: MsgCloseDelegationChannel, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCloseDelegationChannel;
    fromJSON(object: any): MsgCloseDelegationChannel;
    toJSON(message: MsgCloseDelegationChannel): JsonSafe<MsgCloseDelegationChannel>;
    fromPartial(object: Partial<MsgCloseDelegationChannel>): MsgCloseDelegationChannel;
    fromProtoMsg(message: MsgCloseDelegationChannelProtoMsg): MsgCloseDelegationChannel;
    toProto(message: MsgCloseDelegationChannel): Uint8Array;
    toProtoMsg(message: MsgCloseDelegationChannel): MsgCloseDelegationChannelProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgCloseDelegationChannelResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCloseDelegationChannelResponse
 */
export declare const MsgCloseDelegationChannelResponse: {
    typeUrl: "/stride.stakeibc.MsgCloseDelegationChannelResponse";
    is(o: any): o is MsgCloseDelegationChannelResponse;
    isSDK(o: any): o is MsgCloseDelegationChannelResponseSDKType;
    encode(_: MsgCloseDelegationChannelResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCloseDelegationChannelResponse;
    fromJSON(_: any): MsgCloseDelegationChannelResponse;
    toJSON(_: MsgCloseDelegationChannelResponse): JsonSafe<MsgCloseDelegationChannelResponse>;
    fromPartial(_: Partial<MsgCloseDelegationChannelResponse>): MsgCloseDelegationChannelResponse;
    fromProtoMsg(message: MsgCloseDelegationChannelResponseProtoMsg): MsgCloseDelegationChannelResponse;
    toProto(message: MsgCloseDelegationChannelResponse): Uint8Array;
    toProtoMsg(message: MsgCloseDelegationChannelResponse): MsgCloseDelegationChannelResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgUpdateValidatorSharesExchRate
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateValidatorSharesExchRate
 */
export declare const MsgUpdateValidatorSharesExchRate: {
    typeUrl: "/stride.stakeibc.MsgUpdateValidatorSharesExchRate";
    is(o: any): o is MsgUpdateValidatorSharesExchRate;
    isSDK(o: any): o is MsgUpdateValidatorSharesExchRateSDKType;
    encode(message: MsgUpdateValidatorSharesExchRate, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateValidatorSharesExchRate;
    fromJSON(object: any): MsgUpdateValidatorSharesExchRate;
    toJSON(message: MsgUpdateValidatorSharesExchRate): JsonSafe<MsgUpdateValidatorSharesExchRate>;
    fromPartial(object: Partial<MsgUpdateValidatorSharesExchRate>): MsgUpdateValidatorSharesExchRate;
    fromProtoMsg(message: MsgUpdateValidatorSharesExchRateProtoMsg): MsgUpdateValidatorSharesExchRate;
    toProto(message: MsgUpdateValidatorSharesExchRate): Uint8Array;
    toProtoMsg(message: MsgUpdateValidatorSharesExchRate): MsgUpdateValidatorSharesExchRateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgUpdateValidatorSharesExchRateResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateValidatorSharesExchRateResponse
 */
export declare const MsgUpdateValidatorSharesExchRateResponse: {
    typeUrl: "/stride.stakeibc.MsgUpdateValidatorSharesExchRateResponse";
    is(o: any): o is MsgUpdateValidatorSharesExchRateResponse;
    isSDK(o: any): o is MsgUpdateValidatorSharesExchRateResponseSDKType;
    encode(_: MsgUpdateValidatorSharesExchRateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateValidatorSharesExchRateResponse;
    fromJSON(_: any): MsgUpdateValidatorSharesExchRateResponse;
    toJSON(_: MsgUpdateValidatorSharesExchRateResponse): JsonSafe<MsgUpdateValidatorSharesExchRateResponse>;
    fromPartial(_: Partial<MsgUpdateValidatorSharesExchRateResponse>): MsgUpdateValidatorSharesExchRateResponse;
    fromProtoMsg(message: MsgUpdateValidatorSharesExchRateResponseProtoMsg): MsgUpdateValidatorSharesExchRateResponse;
    toProto(message: MsgUpdateValidatorSharesExchRateResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateValidatorSharesExchRateResponse): MsgUpdateValidatorSharesExchRateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgCalibrateDelegation
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCalibrateDelegation
 */
export declare const MsgCalibrateDelegation: {
    typeUrl: "/stride.stakeibc.MsgCalibrateDelegation";
    is(o: any): o is MsgCalibrateDelegation;
    isSDK(o: any): o is MsgCalibrateDelegationSDKType;
    encode(message: MsgCalibrateDelegation, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCalibrateDelegation;
    fromJSON(object: any): MsgCalibrateDelegation;
    toJSON(message: MsgCalibrateDelegation): JsonSafe<MsgCalibrateDelegation>;
    fromPartial(object: Partial<MsgCalibrateDelegation>): MsgCalibrateDelegation;
    fromProtoMsg(message: MsgCalibrateDelegationProtoMsg): MsgCalibrateDelegation;
    toProto(message: MsgCalibrateDelegation): Uint8Array;
    toProtoMsg(message: MsgCalibrateDelegation): MsgCalibrateDelegationProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgCalibrateDelegationResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCalibrateDelegationResponse
 */
export declare const MsgCalibrateDelegationResponse: {
    typeUrl: "/stride.stakeibc.MsgCalibrateDelegationResponse";
    is(o: any): o is MsgCalibrateDelegationResponse;
    isSDK(o: any): o is MsgCalibrateDelegationResponseSDKType;
    encode(_: MsgCalibrateDelegationResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCalibrateDelegationResponse;
    fromJSON(_: any): MsgCalibrateDelegationResponse;
    toJSON(_: MsgCalibrateDelegationResponse): JsonSafe<MsgCalibrateDelegationResponse>;
    fromPartial(_: Partial<MsgCalibrateDelegationResponse>): MsgCalibrateDelegationResponse;
    fromProtoMsg(message: MsgCalibrateDelegationResponseProtoMsg): MsgCalibrateDelegationResponse;
    toProto(message: MsgCalibrateDelegationResponse): Uint8Array;
    toProtoMsg(message: MsgCalibrateDelegationResponse): MsgCalibrateDelegationResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgResumeHostZone
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgResumeHostZone
 */
export declare const MsgResumeHostZone: {
    typeUrl: "/stride.stakeibc.MsgResumeHostZone";
    is(o: any): o is MsgResumeHostZone;
    isSDK(o: any): o is MsgResumeHostZoneSDKType;
    encode(message: MsgResumeHostZone, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgResumeHostZone;
    fromJSON(object: any): MsgResumeHostZone;
    toJSON(message: MsgResumeHostZone): JsonSafe<MsgResumeHostZone>;
    fromPartial(object: Partial<MsgResumeHostZone>): MsgResumeHostZone;
    fromProtoMsg(message: MsgResumeHostZoneProtoMsg): MsgResumeHostZone;
    toProto(message: MsgResumeHostZone): Uint8Array;
    toProtoMsg(message: MsgResumeHostZone): MsgResumeHostZoneProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgResumeHostZoneResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgResumeHostZoneResponse
 */
export declare const MsgResumeHostZoneResponse: {
    typeUrl: "/stride.stakeibc.MsgResumeHostZoneResponse";
    is(o: any): o is MsgResumeHostZoneResponse;
    isSDK(o: any): o is MsgResumeHostZoneResponseSDKType;
    encode(_: MsgResumeHostZoneResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgResumeHostZoneResponse;
    fromJSON(_: any): MsgResumeHostZoneResponse;
    toJSON(_: MsgResumeHostZoneResponse): JsonSafe<MsgResumeHostZoneResponse>;
    fromPartial(_: Partial<MsgResumeHostZoneResponse>): MsgResumeHostZoneResponse;
    fromProtoMsg(message: MsgResumeHostZoneResponseProtoMsg): MsgResumeHostZoneResponse;
    toProto(message: MsgResumeHostZoneResponse): Uint8Array;
    toProtoMsg(message: MsgResumeHostZoneResponse): MsgResumeHostZoneResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Creates a new trade route
 * @name MsgCreateTradeRoute
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCreateTradeRoute
 */
export declare const MsgCreateTradeRoute: {
    typeUrl: "/stride.stakeibc.MsgCreateTradeRoute";
    aminoType: "stride/x/stakeibc/MsgCreateTradeRoute";
    is(o: any): o is MsgCreateTradeRoute;
    isSDK(o: any): o is MsgCreateTradeRouteSDKType;
    encode(message: MsgCreateTradeRoute, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateTradeRoute;
    fromJSON(object: any): MsgCreateTradeRoute;
    toJSON(message: MsgCreateTradeRoute): JsonSafe<MsgCreateTradeRoute>;
    fromPartial(object: Partial<MsgCreateTradeRoute>): MsgCreateTradeRoute;
    fromProtoMsg(message: MsgCreateTradeRouteProtoMsg): MsgCreateTradeRoute;
    toProto(message: MsgCreateTradeRoute): Uint8Array;
    toProtoMsg(message: MsgCreateTradeRoute): MsgCreateTradeRouteProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgCreateTradeRouteResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgCreateTradeRouteResponse
 */
export declare const MsgCreateTradeRouteResponse: {
    typeUrl: "/stride.stakeibc.MsgCreateTradeRouteResponse";
    is(o: any): o is MsgCreateTradeRouteResponse;
    isSDK(o: any): o is MsgCreateTradeRouteResponseSDKType;
    encode(_: MsgCreateTradeRouteResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgCreateTradeRouteResponse;
    fromJSON(_: any): MsgCreateTradeRouteResponse;
    toJSON(_: MsgCreateTradeRouteResponse): JsonSafe<MsgCreateTradeRouteResponse>;
    fromPartial(_: Partial<MsgCreateTradeRouteResponse>): MsgCreateTradeRouteResponse;
    fromProtoMsg(message: MsgCreateTradeRouteResponseProtoMsg): MsgCreateTradeRouteResponse;
    toProto(message: MsgCreateTradeRouteResponse): Uint8Array;
    toProtoMsg(message: MsgCreateTradeRouteResponse): MsgCreateTradeRouteResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Deletes a trade route
 * @name MsgDeleteTradeRoute
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgDeleteTradeRoute
 */
export declare const MsgDeleteTradeRoute: {
    typeUrl: "/stride.stakeibc.MsgDeleteTradeRoute";
    aminoType: "stride/x/stakeibc/MsgDeleteTradeRoute";
    is(o: any): o is MsgDeleteTradeRoute;
    isSDK(o: any): o is MsgDeleteTradeRouteSDKType;
    encode(message: MsgDeleteTradeRoute, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDeleteTradeRoute;
    fromJSON(object: any): MsgDeleteTradeRoute;
    toJSON(message: MsgDeleteTradeRoute): JsonSafe<MsgDeleteTradeRoute>;
    fromPartial(object: Partial<MsgDeleteTradeRoute>): MsgDeleteTradeRoute;
    fromProtoMsg(message: MsgDeleteTradeRouteProtoMsg): MsgDeleteTradeRoute;
    toProto(message: MsgDeleteTradeRoute): Uint8Array;
    toProtoMsg(message: MsgDeleteTradeRoute): MsgDeleteTradeRouteProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgDeleteTradeRouteResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgDeleteTradeRouteResponse
 */
export declare const MsgDeleteTradeRouteResponse: {
    typeUrl: "/stride.stakeibc.MsgDeleteTradeRouteResponse";
    is(o: any): o is MsgDeleteTradeRouteResponse;
    isSDK(o: any): o is MsgDeleteTradeRouteResponseSDKType;
    encode(_: MsgDeleteTradeRouteResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgDeleteTradeRouteResponse;
    fromJSON(_: any): MsgDeleteTradeRouteResponse;
    toJSON(_: MsgDeleteTradeRouteResponse): JsonSafe<MsgDeleteTradeRouteResponse>;
    fromPartial(_: Partial<MsgDeleteTradeRouteResponse>): MsgDeleteTradeRouteResponse;
    fromProtoMsg(message: MsgDeleteTradeRouteResponseProtoMsg): MsgDeleteTradeRouteResponse;
    toProto(message: MsgDeleteTradeRouteResponse): Uint8Array;
    toProtoMsg(message: MsgDeleteTradeRouteResponse): MsgDeleteTradeRouteResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Updates the config of a trade route
 * @name MsgUpdateTradeRoute
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateTradeRoute
 */
export declare const MsgUpdateTradeRoute: {
    typeUrl: "/stride.stakeibc.MsgUpdateTradeRoute";
    aminoType: "stride/x/stakeibc/MsgUpdateTradeRoute";
    is(o: any): o is MsgUpdateTradeRoute;
    isSDK(o: any): o is MsgUpdateTradeRouteSDKType;
    encode(message: MsgUpdateTradeRoute, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateTradeRoute;
    fromJSON(object: any): MsgUpdateTradeRoute;
    toJSON(message: MsgUpdateTradeRoute): JsonSafe<MsgUpdateTradeRoute>;
    fromPartial(object: Partial<MsgUpdateTradeRoute>): MsgUpdateTradeRoute;
    fromProtoMsg(message: MsgUpdateTradeRouteProtoMsg): MsgUpdateTradeRoute;
    toProto(message: MsgUpdateTradeRoute): Uint8Array;
    toProtoMsg(message: MsgUpdateTradeRoute): MsgUpdateTradeRouteProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgUpdateTradeRouteResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateTradeRouteResponse
 */
export declare const MsgUpdateTradeRouteResponse: {
    typeUrl: "/stride.stakeibc.MsgUpdateTradeRouteResponse";
    is(o: any): o is MsgUpdateTradeRouteResponse;
    isSDK(o: any): o is MsgUpdateTradeRouteResponseSDKType;
    encode(_: MsgUpdateTradeRouteResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateTradeRouteResponse;
    fromJSON(_: any): MsgUpdateTradeRouteResponse;
    toJSON(_: MsgUpdateTradeRouteResponse): JsonSafe<MsgUpdateTradeRouteResponse>;
    fromPartial(_: Partial<MsgUpdateTradeRouteResponse>): MsgUpdateTradeRouteResponse;
    fromProtoMsg(message: MsgUpdateTradeRouteResponseProtoMsg): MsgUpdateTradeRouteResponse;
    toProto(message: MsgUpdateTradeRouteResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateTradeRouteResponse): MsgUpdateTradeRouteResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Registers or updates a community pool rebate by specifying the amount liquid
 * staked
 * @name MsgSetCommunityPoolRebate
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgSetCommunityPoolRebate
 */
export declare const MsgSetCommunityPoolRebate: {
    typeUrl: "/stride.stakeibc.MsgSetCommunityPoolRebate";
    aminoType: "stride/x/stakeibc/MsgSetCommunityPoolRebate";
    is(o: any): o is MsgSetCommunityPoolRebate;
    isSDK(o: any): o is MsgSetCommunityPoolRebateSDKType;
    encode(message: MsgSetCommunityPoolRebate, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSetCommunityPoolRebate;
    fromJSON(object: any): MsgSetCommunityPoolRebate;
    toJSON(message: MsgSetCommunityPoolRebate): JsonSafe<MsgSetCommunityPoolRebate>;
    fromPartial(object: Partial<MsgSetCommunityPoolRebate>): MsgSetCommunityPoolRebate;
    fromProtoMsg(message: MsgSetCommunityPoolRebateProtoMsg): MsgSetCommunityPoolRebate;
    toProto(message: MsgSetCommunityPoolRebate): Uint8Array;
    toProtoMsg(message: MsgSetCommunityPoolRebate): MsgSetCommunityPoolRebateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgSetCommunityPoolRebateResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgSetCommunityPoolRebateResponse
 */
export declare const MsgSetCommunityPoolRebateResponse: {
    typeUrl: "/stride.stakeibc.MsgSetCommunityPoolRebateResponse";
    is(o: any): o is MsgSetCommunityPoolRebateResponse;
    isSDK(o: any): o is MsgSetCommunityPoolRebateResponseSDKType;
    encode(_: MsgSetCommunityPoolRebateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSetCommunityPoolRebateResponse;
    fromJSON(_: any): MsgSetCommunityPoolRebateResponse;
    toJSON(_: MsgSetCommunityPoolRebateResponse): JsonSafe<MsgSetCommunityPoolRebateResponse>;
    fromPartial(_: Partial<MsgSetCommunityPoolRebateResponse>): MsgSetCommunityPoolRebateResponse;
    fromProtoMsg(message: MsgSetCommunityPoolRebateResponseProtoMsg): MsgSetCommunityPoolRebateResponse;
    toProto(message: MsgSetCommunityPoolRebateResponse): Uint8Array;
    toProtoMsg(message: MsgSetCommunityPoolRebateResponse): MsgSetCommunityPoolRebateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Grants or revokes trade permissions to a given address via authz
 * @name MsgToggleTradeController
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgToggleTradeController
 */
export declare const MsgToggleTradeController: {
    typeUrl: "/stride.stakeibc.MsgToggleTradeController";
    aminoType: "stride/x/stakeibc/MsgToggleTradeController";
    is(o: any): o is MsgToggleTradeController;
    isSDK(o: any): o is MsgToggleTradeControllerSDKType;
    encode(message: MsgToggleTradeController, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgToggleTradeController;
    fromJSON(object: any): MsgToggleTradeController;
    toJSON(message: MsgToggleTradeController): JsonSafe<MsgToggleTradeController>;
    fromPartial(object: Partial<MsgToggleTradeController>): MsgToggleTradeController;
    fromProtoMsg(message: MsgToggleTradeControllerProtoMsg): MsgToggleTradeController;
    toProto(message: MsgToggleTradeController): Uint8Array;
    toProtoMsg(message: MsgToggleTradeController): MsgToggleTradeControllerProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgToggleTradeControllerResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgToggleTradeControllerResponse
 */
export declare const MsgToggleTradeControllerResponse: {
    typeUrl: "/stride.stakeibc.MsgToggleTradeControllerResponse";
    is(o: any): o is MsgToggleTradeControllerResponse;
    isSDK(o: any): o is MsgToggleTradeControllerResponseSDKType;
    encode(_: MsgToggleTradeControllerResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgToggleTradeControllerResponse;
    fromJSON(_: any): MsgToggleTradeControllerResponse;
    toJSON(_: MsgToggleTradeControllerResponse): JsonSafe<MsgToggleTradeControllerResponse>;
    fromPartial(_: Partial<MsgToggleTradeControllerResponse>): MsgToggleTradeControllerResponse;
    fromProtoMsg(message: MsgToggleTradeControllerResponseProtoMsg): MsgToggleTradeControllerResponse;
    toProto(message: MsgToggleTradeControllerResponse): Uint8Array;
    toProtoMsg(message: MsgToggleTradeControllerResponse): MsgToggleTradeControllerResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Updates host zone params
 * @name MsgUpdateHostZoneParams
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateHostZoneParams
 */
export declare const MsgUpdateHostZoneParams: {
    typeUrl: "/stride.stakeibc.MsgUpdateHostZoneParams";
    aminoType: "stride/x/stakeibc/MsgUpdateHostZoneParams";
    is(o: any): o is MsgUpdateHostZoneParams;
    isSDK(o: any): o is MsgUpdateHostZoneParamsSDKType;
    encode(message: MsgUpdateHostZoneParams, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateHostZoneParams;
    fromJSON(object: any): MsgUpdateHostZoneParams;
    toJSON(message: MsgUpdateHostZoneParams): JsonSafe<MsgUpdateHostZoneParams>;
    fromPartial(object: Partial<MsgUpdateHostZoneParams>): MsgUpdateHostZoneParams;
    fromProtoMsg(message: MsgUpdateHostZoneParamsProtoMsg): MsgUpdateHostZoneParams;
    toProto(message: MsgUpdateHostZoneParams): Uint8Array;
    toProtoMsg(message: MsgUpdateHostZoneParams): MsgUpdateHostZoneParamsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgUpdateHostZoneParamsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.MsgUpdateHostZoneParamsResponse
 */
export declare const MsgUpdateHostZoneParamsResponse: {
    typeUrl: "/stride.stakeibc.MsgUpdateHostZoneParamsResponse";
    is(o: any): o is MsgUpdateHostZoneParamsResponse;
    isSDK(o: any): o is MsgUpdateHostZoneParamsResponseSDKType;
    encode(_: MsgUpdateHostZoneParamsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgUpdateHostZoneParamsResponse;
    fromJSON(_: any): MsgUpdateHostZoneParamsResponse;
    toJSON(_: MsgUpdateHostZoneParamsResponse): JsonSafe<MsgUpdateHostZoneParamsResponse>;
    fromPartial(_: Partial<MsgUpdateHostZoneParamsResponse>): MsgUpdateHostZoneParamsResponse;
    fromProtoMsg(message: MsgUpdateHostZoneParamsResponseProtoMsg): MsgUpdateHostZoneParamsResponse;
    toProto(message: MsgUpdateHostZoneParamsResponse): Uint8Array;
    toProtoMsg(message: MsgUpdateHostZoneParamsResponse): MsgUpdateHostZoneParamsResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map