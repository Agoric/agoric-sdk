import { DelegationRecord, type DelegationRecordSDKType, UnbondingRecord, type UnbondingRecordSDKType, RedemptionRecord, type RedemptionRecordSDKType } from './staketia.js';
import { Coin, type CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
export declare enum OverwritableRecordType {
    RECORD_TYPE_DELEGATION = 0,
    RECORD_TYPE_UNBONDING = 1,
    RECORD_TYPE_REDEMPTION = 2,
    UNRECOGNIZED = -1
}
export declare const OverwritableRecordTypeSDKType: typeof OverwritableRecordType;
export declare function overwritableRecordTypeFromJSON(object: any): OverwritableRecordType;
export declare function overwritableRecordTypeToJSON(object: OverwritableRecordType): string;
/**
 * Deprecated: Liquid stakes should be handled in stakeibc
 * LiquidStake
 * @name MsgLiquidStake
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgLiquidStake
 * @deprecated
 */
export interface MsgLiquidStake {
    staker: string;
    nativeAmount: string;
}
export interface MsgLiquidStakeProtoMsg {
    typeUrl: '/stride.staketia.MsgLiquidStake';
    value: Uint8Array;
}
/**
 * Deprecated: Liquid stakes should be handled in stakeibc
 * LiquidStake
 * @name MsgLiquidStakeSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgLiquidStake
 * @deprecated
 */
export interface MsgLiquidStakeSDKType {
    staker: string;
    native_amount: string;
}
/**
 * @name MsgLiquidStakeResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgLiquidStakeResponse
 * @deprecated
 */
export interface MsgLiquidStakeResponse {
    stToken: Coin;
}
export interface MsgLiquidStakeResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgLiquidStakeResponse';
    value: Uint8Array;
}
/**
 * @name MsgLiquidStakeResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgLiquidStakeResponse
 * @deprecated
 */
export interface MsgLiquidStakeResponseSDKType {
    st_token: CoinSDKType;
}
/**
 * RedeemStake
 * @name MsgRedeemStake
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgRedeemStake
 */
export interface MsgRedeemStake {
    redeemer: string;
    stTokenAmount: string;
    /**
     * The receiver field is a celestia address
     * It is only used in the case where the redemption spills over to stakeibc
     */
    receiver: string;
}
export interface MsgRedeemStakeProtoMsg {
    typeUrl: '/stride.staketia.MsgRedeemStake';
    value: Uint8Array;
}
/**
 * RedeemStake
 * @name MsgRedeemStakeSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgRedeemStake
 */
export interface MsgRedeemStakeSDKType {
    redeemer: string;
    st_token_amount: string;
    receiver: string;
}
/**
 * @name MsgRedeemStakeResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgRedeemStakeResponse
 */
export interface MsgRedeemStakeResponse {
    nativeToken: Coin;
}
export interface MsgRedeemStakeResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgRedeemStakeResponse';
    value: Uint8Array;
}
/**
 * @name MsgRedeemStakeResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgRedeemStakeResponse
 */
export interface MsgRedeemStakeResponseSDKType {
    native_token: CoinSDKType;
}
/**
 * ConfirmDelegation
 * @name MsgConfirmDelegation
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmDelegation
 */
export interface MsgConfirmDelegation {
    operator: string;
    recordId: bigint;
    txHash: string;
}
export interface MsgConfirmDelegationProtoMsg {
    typeUrl: '/stride.staketia.MsgConfirmDelegation';
    value: Uint8Array;
}
/**
 * ConfirmDelegation
 * @name MsgConfirmDelegationSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmDelegation
 */
export interface MsgConfirmDelegationSDKType {
    operator: string;
    record_id: bigint;
    tx_hash: string;
}
/**
 * @name MsgConfirmDelegationResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmDelegationResponse
 */
export interface MsgConfirmDelegationResponse {
}
export interface MsgConfirmDelegationResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgConfirmDelegationResponse';
    value: Uint8Array;
}
/**
 * @name MsgConfirmDelegationResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmDelegationResponse
 */
export interface MsgConfirmDelegationResponseSDKType {
}
/**
 * ConfirmUndelegation
 * @name MsgConfirmUndelegation
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmUndelegation
 */
export interface MsgConfirmUndelegation {
    operator: string;
    recordId: bigint;
    txHash: string;
}
export interface MsgConfirmUndelegationProtoMsg {
    typeUrl: '/stride.staketia.MsgConfirmUndelegation';
    value: Uint8Array;
}
/**
 * ConfirmUndelegation
 * @name MsgConfirmUndelegationSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmUndelegation
 */
export interface MsgConfirmUndelegationSDKType {
    operator: string;
    record_id: bigint;
    tx_hash: string;
}
/**
 * @name MsgConfirmUndelegationResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmUndelegationResponse
 */
export interface MsgConfirmUndelegationResponse {
}
export interface MsgConfirmUndelegationResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgConfirmUndelegationResponse';
    value: Uint8Array;
}
/**
 * @name MsgConfirmUndelegationResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmUndelegationResponse
 */
export interface MsgConfirmUndelegationResponseSDKType {
}
/**
 * ConfirmUnbondedTokenSweep
 * @name MsgConfirmUnbondedTokenSweep
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmUnbondedTokenSweep
 */
export interface MsgConfirmUnbondedTokenSweep {
    operator: string;
    recordId: bigint;
    txHash: string;
}
export interface MsgConfirmUnbondedTokenSweepProtoMsg {
    typeUrl: '/stride.staketia.MsgConfirmUnbondedTokenSweep';
    value: Uint8Array;
}
/**
 * ConfirmUnbondedTokenSweep
 * @name MsgConfirmUnbondedTokenSweepSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmUnbondedTokenSweep
 */
export interface MsgConfirmUnbondedTokenSweepSDKType {
    operator: string;
    record_id: bigint;
    tx_hash: string;
}
/**
 * @name MsgConfirmUnbondedTokenSweepResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmUnbondedTokenSweepResponse
 */
export interface MsgConfirmUnbondedTokenSweepResponse {
}
export interface MsgConfirmUnbondedTokenSweepResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgConfirmUnbondedTokenSweepResponse';
    value: Uint8Array;
}
/**
 * @name MsgConfirmUnbondedTokenSweepResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmUnbondedTokenSweepResponse
 */
export interface MsgConfirmUnbondedTokenSweepResponseSDKType {
}
/**
 * AdjustDelegatedBalance
 * @name MsgAdjustDelegatedBalance
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgAdjustDelegatedBalance
 */
export interface MsgAdjustDelegatedBalance {
    operator: string;
    delegationOffset: string;
    validatorAddress: string;
}
export interface MsgAdjustDelegatedBalanceProtoMsg {
    typeUrl: '/stride.staketia.MsgAdjustDelegatedBalance';
    value: Uint8Array;
}
/**
 * AdjustDelegatedBalance
 * @name MsgAdjustDelegatedBalanceSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgAdjustDelegatedBalance
 */
export interface MsgAdjustDelegatedBalanceSDKType {
    operator: string;
    delegation_offset: string;
    validator_address: string;
}
/**
 * @name MsgAdjustDelegatedBalanceResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgAdjustDelegatedBalanceResponse
 */
export interface MsgAdjustDelegatedBalanceResponse {
}
export interface MsgAdjustDelegatedBalanceResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgAdjustDelegatedBalanceResponse';
    value: Uint8Array;
}
/**
 * @name MsgAdjustDelegatedBalanceResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgAdjustDelegatedBalanceResponse
 */
export interface MsgAdjustDelegatedBalanceResponseSDKType {
}
/**
 * UpdateInnerRedemptionRate
 * @name MsgUpdateInnerRedemptionRateBounds
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgUpdateInnerRedemptionRateBounds
 */
export interface MsgUpdateInnerRedemptionRateBounds {
    creator: string;
    minInnerRedemptionRate: string;
    maxInnerRedemptionRate: string;
}
export interface MsgUpdateInnerRedemptionRateBoundsProtoMsg {
    typeUrl: '/stride.staketia.MsgUpdateInnerRedemptionRateBounds';
    value: Uint8Array;
}
/**
 * UpdateInnerRedemptionRate
 * @name MsgUpdateInnerRedemptionRateBoundsSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgUpdateInnerRedemptionRateBounds
 */
export interface MsgUpdateInnerRedemptionRateBoundsSDKType {
    creator: string;
    min_inner_redemption_rate: string;
    max_inner_redemption_rate: string;
}
/**
 * @name MsgUpdateInnerRedemptionRateBoundsResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgUpdateInnerRedemptionRateBoundsResponse
 */
export interface MsgUpdateInnerRedemptionRateBoundsResponse {
}
export interface MsgUpdateInnerRedemptionRateBoundsResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgUpdateInnerRedemptionRateBoundsResponse';
    value: Uint8Array;
}
/**
 * @name MsgUpdateInnerRedemptionRateBoundsResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgUpdateInnerRedemptionRateBoundsResponse
 */
export interface MsgUpdateInnerRedemptionRateBoundsResponseSDKType {
}
/**
 * ResumeHostZone
 * @name MsgResumeHostZone
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgResumeHostZone
 */
export interface MsgResumeHostZone {
    creator: string;
}
export interface MsgResumeHostZoneProtoMsg {
    typeUrl: '/stride.staketia.MsgResumeHostZone';
    value: Uint8Array;
}
/**
 * ResumeHostZone
 * @name MsgResumeHostZoneSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgResumeHostZone
 */
export interface MsgResumeHostZoneSDKType {
    creator: string;
}
/**
 * @name MsgResumeHostZoneResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgResumeHostZoneResponse
 */
export interface MsgResumeHostZoneResponse {
}
export interface MsgResumeHostZoneResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgResumeHostZoneResponse';
    value: Uint8Array;
}
/**
 * @name MsgResumeHostZoneResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgResumeHostZoneResponse
 */
export interface MsgResumeHostZoneResponseSDKType {
}
/**
 * RefreshRedemptionRate
 * @name MsgRefreshRedemptionRate
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgRefreshRedemptionRate
 */
export interface MsgRefreshRedemptionRate {
    creator: string;
}
export interface MsgRefreshRedemptionRateProtoMsg {
    typeUrl: '/stride.staketia.MsgRefreshRedemptionRate';
    value: Uint8Array;
}
/**
 * RefreshRedemptionRate
 * @name MsgRefreshRedemptionRateSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgRefreshRedemptionRate
 */
export interface MsgRefreshRedemptionRateSDKType {
    creator: string;
}
/**
 * @name MsgRefreshRedemptionRateResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgRefreshRedemptionRateResponse
 */
export interface MsgRefreshRedemptionRateResponse {
}
export interface MsgRefreshRedemptionRateResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgRefreshRedemptionRateResponse';
    value: Uint8Array;
}
/**
 * @name MsgRefreshRedemptionRateResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgRefreshRedemptionRateResponse
 */
export interface MsgRefreshRedemptionRateResponseSDKType {
}
/**
 * OverwriteDelegationRecord
 * @name MsgOverwriteDelegationRecord
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteDelegationRecord
 */
export interface MsgOverwriteDelegationRecord {
    creator: string;
    delegationRecord?: DelegationRecord;
}
export interface MsgOverwriteDelegationRecordProtoMsg {
    typeUrl: '/stride.staketia.MsgOverwriteDelegationRecord';
    value: Uint8Array;
}
/**
 * OverwriteDelegationRecord
 * @name MsgOverwriteDelegationRecordSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteDelegationRecord
 */
export interface MsgOverwriteDelegationRecordSDKType {
    creator: string;
    delegation_record?: DelegationRecordSDKType;
}
/**
 * @name MsgOverwriteDelegationRecordResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteDelegationRecordResponse
 */
export interface MsgOverwriteDelegationRecordResponse {
}
export interface MsgOverwriteDelegationRecordResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgOverwriteDelegationRecordResponse';
    value: Uint8Array;
}
/**
 * @name MsgOverwriteDelegationRecordResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteDelegationRecordResponse
 */
export interface MsgOverwriteDelegationRecordResponseSDKType {
}
/**
 * OverwriteUnbondingRecord
 * @name MsgOverwriteUnbondingRecord
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteUnbondingRecord
 */
export interface MsgOverwriteUnbondingRecord {
    creator: string;
    unbondingRecord?: UnbondingRecord;
}
export interface MsgOverwriteUnbondingRecordProtoMsg {
    typeUrl: '/stride.staketia.MsgOverwriteUnbondingRecord';
    value: Uint8Array;
}
/**
 * OverwriteUnbondingRecord
 * @name MsgOverwriteUnbondingRecordSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteUnbondingRecord
 */
export interface MsgOverwriteUnbondingRecordSDKType {
    creator: string;
    unbonding_record?: UnbondingRecordSDKType;
}
/**
 * @name MsgOverwriteUnbondingRecordResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteUnbondingRecordResponse
 */
export interface MsgOverwriteUnbondingRecordResponse {
}
export interface MsgOverwriteUnbondingRecordResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgOverwriteUnbondingRecordResponse';
    value: Uint8Array;
}
/**
 * @name MsgOverwriteUnbondingRecordResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteUnbondingRecordResponse
 */
export interface MsgOverwriteUnbondingRecordResponseSDKType {
}
/**
 * OverwriteRedemptionRecord
 * @name MsgOverwriteRedemptionRecord
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteRedemptionRecord
 */
export interface MsgOverwriteRedemptionRecord {
    creator: string;
    redemptionRecord?: RedemptionRecord;
}
export interface MsgOverwriteRedemptionRecordProtoMsg {
    typeUrl: '/stride.staketia.MsgOverwriteRedemptionRecord';
    value: Uint8Array;
}
/**
 * OverwriteRedemptionRecord
 * @name MsgOverwriteRedemptionRecordSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteRedemptionRecord
 */
export interface MsgOverwriteRedemptionRecordSDKType {
    creator: string;
    redemption_record?: RedemptionRecordSDKType;
}
/**
 * @name MsgOverwriteRedemptionRecordResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteRedemptionRecordResponse
 */
export interface MsgOverwriteRedemptionRecordResponse {
}
export interface MsgOverwriteRedemptionRecordResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgOverwriteRedemptionRecordResponse';
    value: Uint8Array;
}
/**
 * @name MsgOverwriteRedemptionRecordResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteRedemptionRecordResponse
 */
export interface MsgOverwriteRedemptionRecordResponseSDKType {
}
/**
 * SetOperatorAddress
 * @name MsgSetOperatorAddress
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgSetOperatorAddress
 */
export interface MsgSetOperatorAddress {
    signer: string;
    operator: string;
}
export interface MsgSetOperatorAddressProtoMsg {
    typeUrl: '/stride.staketia.MsgSetOperatorAddress';
    value: Uint8Array;
}
/**
 * SetOperatorAddress
 * @name MsgSetOperatorAddressSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgSetOperatorAddress
 */
export interface MsgSetOperatorAddressSDKType {
    signer: string;
    operator: string;
}
/**
 * @name MsgSetOperatorAddressResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgSetOperatorAddressResponse
 */
export interface MsgSetOperatorAddressResponse {
}
export interface MsgSetOperatorAddressResponseProtoMsg {
    typeUrl: '/stride.staketia.MsgSetOperatorAddressResponse';
    value: Uint8Array;
}
/**
 * @name MsgSetOperatorAddressResponseSDKType
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgSetOperatorAddressResponse
 */
export interface MsgSetOperatorAddressResponseSDKType {
}
/**
 * Deprecated: Liquid stakes should be handled in stakeibc
 * LiquidStake
 * @name MsgLiquidStake
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgLiquidStake
 * @deprecated
 */
export declare const MsgLiquidStake: {
    typeUrl: "/stride.staketia.MsgLiquidStake";
    aminoType: "staketia/MsgLiquidStake";
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
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgLiquidStakeResponse
 * @deprecated
 */
export declare const MsgLiquidStakeResponse: {
    typeUrl: "/stride.staketia.MsgLiquidStakeResponse";
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
 * RedeemStake
 * @name MsgRedeemStake
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgRedeemStake
 */
export declare const MsgRedeemStake: {
    typeUrl: "/stride.staketia.MsgRedeemStake";
    aminoType: "staketia/MsgRedeemStake";
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
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgRedeemStakeResponse
 */
export declare const MsgRedeemStakeResponse: {
    typeUrl: "/stride.staketia.MsgRedeemStakeResponse";
    is(o: any): o is MsgRedeemStakeResponse;
    isSDK(o: any): o is MsgRedeemStakeResponseSDKType;
    encode(message: MsgRedeemStakeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRedeemStakeResponse;
    fromJSON(object: any): MsgRedeemStakeResponse;
    toJSON(message: MsgRedeemStakeResponse): JsonSafe<MsgRedeemStakeResponse>;
    fromPartial(object: Partial<MsgRedeemStakeResponse>): MsgRedeemStakeResponse;
    fromProtoMsg(message: MsgRedeemStakeResponseProtoMsg): MsgRedeemStakeResponse;
    toProto(message: MsgRedeemStakeResponse): Uint8Array;
    toProtoMsg(message: MsgRedeemStakeResponse): MsgRedeemStakeResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ConfirmDelegation
 * @name MsgConfirmDelegation
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmDelegation
 */
export declare const MsgConfirmDelegation: {
    typeUrl: "/stride.staketia.MsgConfirmDelegation";
    aminoType: "staketia/MsgConfirmDelegation";
    is(o: any): o is MsgConfirmDelegation;
    isSDK(o: any): o is MsgConfirmDelegationSDKType;
    encode(message: MsgConfirmDelegation, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConfirmDelegation;
    fromJSON(object: any): MsgConfirmDelegation;
    toJSON(message: MsgConfirmDelegation): JsonSafe<MsgConfirmDelegation>;
    fromPartial(object: Partial<MsgConfirmDelegation>): MsgConfirmDelegation;
    fromProtoMsg(message: MsgConfirmDelegationProtoMsg): MsgConfirmDelegation;
    toProto(message: MsgConfirmDelegation): Uint8Array;
    toProtoMsg(message: MsgConfirmDelegation): MsgConfirmDelegationProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgConfirmDelegationResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmDelegationResponse
 */
export declare const MsgConfirmDelegationResponse: {
    typeUrl: "/stride.staketia.MsgConfirmDelegationResponse";
    is(o: any): o is MsgConfirmDelegationResponse;
    isSDK(o: any): o is MsgConfirmDelegationResponseSDKType;
    encode(_: MsgConfirmDelegationResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConfirmDelegationResponse;
    fromJSON(_: any): MsgConfirmDelegationResponse;
    toJSON(_: MsgConfirmDelegationResponse): JsonSafe<MsgConfirmDelegationResponse>;
    fromPartial(_: Partial<MsgConfirmDelegationResponse>): MsgConfirmDelegationResponse;
    fromProtoMsg(message: MsgConfirmDelegationResponseProtoMsg): MsgConfirmDelegationResponse;
    toProto(message: MsgConfirmDelegationResponse): Uint8Array;
    toProtoMsg(message: MsgConfirmDelegationResponse): MsgConfirmDelegationResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ConfirmUndelegation
 * @name MsgConfirmUndelegation
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmUndelegation
 */
export declare const MsgConfirmUndelegation: {
    typeUrl: "/stride.staketia.MsgConfirmUndelegation";
    aminoType: "staketia/MsgConfirmUndelegation";
    is(o: any): o is MsgConfirmUndelegation;
    isSDK(o: any): o is MsgConfirmUndelegationSDKType;
    encode(message: MsgConfirmUndelegation, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConfirmUndelegation;
    fromJSON(object: any): MsgConfirmUndelegation;
    toJSON(message: MsgConfirmUndelegation): JsonSafe<MsgConfirmUndelegation>;
    fromPartial(object: Partial<MsgConfirmUndelegation>): MsgConfirmUndelegation;
    fromProtoMsg(message: MsgConfirmUndelegationProtoMsg): MsgConfirmUndelegation;
    toProto(message: MsgConfirmUndelegation): Uint8Array;
    toProtoMsg(message: MsgConfirmUndelegation): MsgConfirmUndelegationProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgConfirmUndelegationResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmUndelegationResponse
 */
export declare const MsgConfirmUndelegationResponse: {
    typeUrl: "/stride.staketia.MsgConfirmUndelegationResponse";
    is(o: any): o is MsgConfirmUndelegationResponse;
    isSDK(o: any): o is MsgConfirmUndelegationResponseSDKType;
    encode(_: MsgConfirmUndelegationResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConfirmUndelegationResponse;
    fromJSON(_: any): MsgConfirmUndelegationResponse;
    toJSON(_: MsgConfirmUndelegationResponse): JsonSafe<MsgConfirmUndelegationResponse>;
    fromPartial(_: Partial<MsgConfirmUndelegationResponse>): MsgConfirmUndelegationResponse;
    fromProtoMsg(message: MsgConfirmUndelegationResponseProtoMsg): MsgConfirmUndelegationResponse;
    toProto(message: MsgConfirmUndelegationResponse): Uint8Array;
    toProtoMsg(message: MsgConfirmUndelegationResponse): MsgConfirmUndelegationResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ConfirmUnbondedTokenSweep
 * @name MsgConfirmUnbondedTokenSweep
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmUnbondedTokenSweep
 */
export declare const MsgConfirmUnbondedTokenSweep: {
    typeUrl: "/stride.staketia.MsgConfirmUnbondedTokenSweep";
    aminoType: "staketia/MsgConfirmUnbondedTokenSweep";
    is(o: any): o is MsgConfirmUnbondedTokenSweep;
    isSDK(o: any): o is MsgConfirmUnbondedTokenSweepSDKType;
    encode(message: MsgConfirmUnbondedTokenSweep, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConfirmUnbondedTokenSweep;
    fromJSON(object: any): MsgConfirmUnbondedTokenSweep;
    toJSON(message: MsgConfirmUnbondedTokenSweep): JsonSafe<MsgConfirmUnbondedTokenSweep>;
    fromPartial(object: Partial<MsgConfirmUnbondedTokenSweep>): MsgConfirmUnbondedTokenSweep;
    fromProtoMsg(message: MsgConfirmUnbondedTokenSweepProtoMsg): MsgConfirmUnbondedTokenSweep;
    toProto(message: MsgConfirmUnbondedTokenSweep): Uint8Array;
    toProtoMsg(message: MsgConfirmUnbondedTokenSweep): MsgConfirmUnbondedTokenSweepProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgConfirmUnbondedTokenSweepResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgConfirmUnbondedTokenSweepResponse
 */
export declare const MsgConfirmUnbondedTokenSweepResponse: {
    typeUrl: "/stride.staketia.MsgConfirmUnbondedTokenSweepResponse";
    is(o: any): o is MsgConfirmUnbondedTokenSweepResponse;
    isSDK(o: any): o is MsgConfirmUnbondedTokenSweepResponseSDKType;
    encode(_: MsgConfirmUnbondedTokenSweepResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgConfirmUnbondedTokenSweepResponse;
    fromJSON(_: any): MsgConfirmUnbondedTokenSweepResponse;
    toJSON(_: MsgConfirmUnbondedTokenSweepResponse): JsonSafe<MsgConfirmUnbondedTokenSweepResponse>;
    fromPartial(_: Partial<MsgConfirmUnbondedTokenSweepResponse>): MsgConfirmUnbondedTokenSweepResponse;
    fromProtoMsg(message: MsgConfirmUnbondedTokenSweepResponseProtoMsg): MsgConfirmUnbondedTokenSweepResponse;
    toProto(message: MsgConfirmUnbondedTokenSweepResponse): Uint8Array;
    toProtoMsg(message: MsgConfirmUnbondedTokenSweepResponse): MsgConfirmUnbondedTokenSweepResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * AdjustDelegatedBalance
 * @name MsgAdjustDelegatedBalance
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgAdjustDelegatedBalance
 */
export declare const MsgAdjustDelegatedBalance: {
    typeUrl: "/stride.staketia.MsgAdjustDelegatedBalance";
    aminoType: "staketia/MsgAdjustDelegatedBalance";
    is(o: any): o is MsgAdjustDelegatedBalance;
    isSDK(o: any): o is MsgAdjustDelegatedBalanceSDKType;
    encode(message: MsgAdjustDelegatedBalance, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgAdjustDelegatedBalance;
    fromJSON(object: any): MsgAdjustDelegatedBalance;
    toJSON(message: MsgAdjustDelegatedBalance): JsonSafe<MsgAdjustDelegatedBalance>;
    fromPartial(object: Partial<MsgAdjustDelegatedBalance>): MsgAdjustDelegatedBalance;
    fromProtoMsg(message: MsgAdjustDelegatedBalanceProtoMsg): MsgAdjustDelegatedBalance;
    toProto(message: MsgAdjustDelegatedBalance): Uint8Array;
    toProtoMsg(message: MsgAdjustDelegatedBalance): MsgAdjustDelegatedBalanceProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgAdjustDelegatedBalanceResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgAdjustDelegatedBalanceResponse
 */
export declare const MsgAdjustDelegatedBalanceResponse: {
    typeUrl: "/stride.staketia.MsgAdjustDelegatedBalanceResponse";
    is(o: any): o is MsgAdjustDelegatedBalanceResponse;
    isSDK(o: any): o is MsgAdjustDelegatedBalanceResponseSDKType;
    encode(_: MsgAdjustDelegatedBalanceResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgAdjustDelegatedBalanceResponse;
    fromJSON(_: any): MsgAdjustDelegatedBalanceResponse;
    toJSON(_: MsgAdjustDelegatedBalanceResponse): JsonSafe<MsgAdjustDelegatedBalanceResponse>;
    fromPartial(_: Partial<MsgAdjustDelegatedBalanceResponse>): MsgAdjustDelegatedBalanceResponse;
    fromProtoMsg(message: MsgAdjustDelegatedBalanceResponseProtoMsg): MsgAdjustDelegatedBalanceResponse;
    toProto(message: MsgAdjustDelegatedBalanceResponse): Uint8Array;
    toProtoMsg(message: MsgAdjustDelegatedBalanceResponse): MsgAdjustDelegatedBalanceResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * UpdateInnerRedemptionRate
 * @name MsgUpdateInnerRedemptionRateBounds
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgUpdateInnerRedemptionRateBounds
 */
export declare const MsgUpdateInnerRedemptionRateBounds: {
    typeUrl: "/stride.staketia.MsgUpdateInnerRedemptionRateBounds";
    aminoType: "staketia/MsgUpdateRedemptionRateBounds";
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
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgUpdateInnerRedemptionRateBoundsResponse
 */
export declare const MsgUpdateInnerRedemptionRateBoundsResponse: {
    typeUrl: "/stride.staketia.MsgUpdateInnerRedemptionRateBoundsResponse";
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
 * ResumeHostZone
 * @name MsgResumeHostZone
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgResumeHostZone
 */
export declare const MsgResumeHostZone: {
    typeUrl: "/stride.staketia.MsgResumeHostZone";
    aminoType: "staketia/MsgResumeHostZone";
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
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgResumeHostZoneResponse
 */
export declare const MsgResumeHostZoneResponse: {
    typeUrl: "/stride.staketia.MsgResumeHostZoneResponse";
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
 * RefreshRedemptionRate
 * @name MsgRefreshRedemptionRate
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgRefreshRedemptionRate
 */
export declare const MsgRefreshRedemptionRate: {
    typeUrl: "/stride.staketia.MsgRefreshRedemptionRate";
    aminoType: "staketia/MsgRefreshRedemptionRate";
    is(o: any): o is MsgRefreshRedemptionRate;
    isSDK(o: any): o is MsgRefreshRedemptionRateSDKType;
    encode(message: MsgRefreshRedemptionRate, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRefreshRedemptionRate;
    fromJSON(object: any): MsgRefreshRedemptionRate;
    toJSON(message: MsgRefreshRedemptionRate): JsonSafe<MsgRefreshRedemptionRate>;
    fromPartial(object: Partial<MsgRefreshRedemptionRate>): MsgRefreshRedemptionRate;
    fromProtoMsg(message: MsgRefreshRedemptionRateProtoMsg): MsgRefreshRedemptionRate;
    toProto(message: MsgRefreshRedemptionRate): Uint8Array;
    toProtoMsg(message: MsgRefreshRedemptionRate): MsgRefreshRedemptionRateProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgRefreshRedemptionRateResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgRefreshRedemptionRateResponse
 */
export declare const MsgRefreshRedemptionRateResponse: {
    typeUrl: "/stride.staketia.MsgRefreshRedemptionRateResponse";
    is(o: any): o is MsgRefreshRedemptionRateResponse;
    isSDK(o: any): o is MsgRefreshRedemptionRateResponseSDKType;
    encode(_: MsgRefreshRedemptionRateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgRefreshRedemptionRateResponse;
    fromJSON(_: any): MsgRefreshRedemptionRateResponse;
    toJSON(_: MsgRefreshRedemptionRateResponse): JsonSafe<MsgRefreshRedemptionRateResponse>;
    fromPartial(_: Partial<MsgRefreshRedemptionRateResponse>): MsgRefreshRedemptionRateResponse;
    fromProtoMsg(message: MsgRefreshRedemptionRateResponseProtoMsg): MsgRefreshRedemptionRateResponse;
    toProto(message: MsgRefreshRedemptionRateResponse): Uint8Array;
    toProtoMsg(message: MsgRefreshRedemptionRateResponse): MsgRefreshRedemptionRateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * OverwriteDelegationRecord
 * @name MsgOverwriteDelegationRecord
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteDelegationRecord
 */
export declare const MsgOverwriteDelegationRecord: {
    typeUrl: "/stride.staketia.MsgOverwriteDelegationRecord";
    aminoType: "staketia/MsgOverwriteDelegationRecord";
    is(o: any): o is MsgOverwriteDelegationRecord;
    isSDK(o: any): o is MsgOverwriteDelegationRecordSDKType;
    encode(message: MsgOverwriteDelegationRecord, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgOverwriteDelegationRecord;
    fromJSON(object: any): MsgOverwriteDelegationRecord;
    toJSON(message: MsgOverwriteDelegationRecord): JsonSafe<MsgOverwriteDelegationRecord>;
    fromPartial(object: Partial<MsgOverwriteDelegationRecord>): MsgOverwriteDelegationRecord;
    fromProtoMsg(message: MsgOverwriteDelegationRecordProtoMsg): MsgOverwriteDelegationRecord;
    toProto(message: MsgOverwriteDelegationRecord): Uint8Array;
    toProtoMsg(message: MsgOverwriteDelegationRecord): MsgOverwriteDelegationRecordProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgOverwriteDelegationRecordResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteDelegationRecordResponse
 */
export declare const MsgOverwriteDelegationRecordResponse: {
    typeUrl: "/stride.staketia.MsgOverwriteDelegationRecordResponse";
    is(o: any): o is MsgOverwriteDelegationRecordResponse;
    isSDK(o: any): o is MsgOverwriteDelegationRecordResponseSDKType;
    encode(_: MsgOverwriteDelegationRecordResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgOverwriteDelegationRecordResponse;
    fromJSON(_: any): MsgOverwriteDelegationRecordResponse;
    toJSON(_: MsgOverwriteDelegationRecordResponse): JsonSafe<MsgOverwriteDelegationRecordResponse>;
    fromPartial(_: Partial<MsgOverwriteDelegationRecordResponse>): MsgOverwriteDelegationRecordResponse;
    fromProtoMsg(message: MsgOverwriteDelegationRecordResponseProtoMsg): MsgOverwriteDelegationRecordResponse;
    toProto(message: MsgOverwriteDelegationRecordResponse): Uint8Array;
    toProtoMsg(message: MsgOverwriteDelegationRecordResponse): MsgOverwriteDelegationRecordResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * OverwriteUnbondingRecord
 * @name MsgOverwriteUnbondingRecord
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteUnbondingRecord
 */
export declare const MsgOverwriteUnbondingRecord: {
    typeUrl: "/stride.staketia.MsgOverwriteUnbondingRecord";
    aminoType: "staketia/MsgOverwriteUnbondingRecord";
    is(o: any): o is MsgOverwriteUnbondingRecord;
    isSDK(o: any): o is MsgOverwriteUnbondingRecordSDKType;
    encode(message: MsgOverwriteUnbondingRecord, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgOverwriteUnbondingRecord;
    fromJSON(object: any): MsgOverwriteUnbondingRecord;
    toJSON(message: MsgOverwriteUnbondingRecord): JsonSafe<MsgOverwriteUnbondingRecord>;
    fromPartial(object: Partial<MsgOverwriteUnbondingRecord>): MsgOverwriteUnbondingRecord;
    fromProtoMsg(message: MsgOverwriteUnbondingRecordProtoMsg): MsgOverwriteUnbondingRecord;
    toProto(message: MsgOverwriteUnbondingRecord): Uint8Array;
    toProtoMsg(message: MsgOverwriteUnbondingRecord): MsgOverwriteUnbondingRecordProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgOverwriteUnbondingRecordResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteUnbondingRecordResponse
 */
export declare const MsgOverwriteUnbondingRecordResponse: {
    typeUrl: "/stride.staketia.MsgOverwriteUnbondingRecordResponse";
    is(o: any): o is MsgOverwriteUnbondingRecordResponse;
    isSDK(o: any): o is MsgOverwriteUnbondingRecordResponseSDKType;
    encode(_: MsgOverwriteUnbondingRecordResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgOverwriteUnbondingRecordResponse;
    fromJSON(_: any): MsgOverwriteUnbondingRecordResponse;
    toJSON(_: MsgOverwriteUnbondingRecordResponse): JsonSafe<MsgOverwriteUnbondingRecordResponse>;
    fromPartial(_: Partial<MsgOverwriteUnbondingRecordResponse>): MsgOverwriteUnbondingRecordResponse;
    fromProtoMsg(message: MsgOverwriteUnbondingRecordResponseProtoMsg): MsgOverwriteUnbondingRecordResponse;
    toProto(message: MsgOverwriteUnbondingRecordResponse): Uint8Array;
    toProtoMsg(message: MsgOverwriteUnbondingRecordResponse): MsgOverwriteUnbondingRecordResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * OverwriteRedemptionRecord
 * @name MsgOverwriteRedemptionRecord
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteRedemptionRecord
 */
export declare const MsgOverwriteRedemptionRecord: {
    typeUrl: "/stride.staketia.MsgOverwriteRedemptionRecord";
    aminoType: "staketia/MsgOverwriteRedemptionRecord";
    is(o: any): o is MsgOverwriteRedemptionRecord;
    isSDK(o: any): o is MsgOverwriteRedemptionRecordSDKType;
    encode(message: MsgOverwriteRedemptionRecord, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgOverwriteRedemptionRecord;
    fromJSON(object: any): MsgOverwriteRedemptionRecord;
    toJSON(message: MsgOverwriteRedemptionRecord): JsonSafe<MsgOverwriteRedemptionRecord>;
    fromPartial(object: Partial<MsgOverwriteRedemptionRecord>): MsgOverwriteRedemptionRecord;
    fromProtoMsg(message: MsgOverwriteRedemptionRecordProtoMsg): MsgOverwriteRedemptionRecord;
    toProto(message: MsgOverwriteRedemptionRecord): Uint8Array;
    toProtoMsg(message: MsgOverwriteRedemptionRecord): MsgOverwriteRedemptionRecordProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgOverwriteRedemptionRecordResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgOverwriteRedemptionRecordResponse
 */
export declare const MsgOverwriteRedemptionRecordResponse: {
    typeUrl: "/stride.staketia.MsgOverwriteRedemptionRecordResponse";
    is(o: any): o is MsgOverwriteRedemptionRecordResponse;
    isSDK(o: any): o is MsgOverwriteRedemptionRecordResponseSDKType;
    encode(_: MsgOverwriteRedemptionRecordResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgOverwriteRedemptionRecordResponse;
    fromJSON(_: any): MsgOverwriteRedemptionRecordResponse;
    toJSON(_: MsgOverwriteRedemptionRecordResponse): JsonSafe<MsgOverwriteRedemptionRecordResponse>;
    fromPartial(_: Partial<MsgOverwriteRedemptionRecordResponse>): MsgOverwriteRedemptionRecordResponse;
    fromProtoMsg(message: MsgOverwriteRedemptionRecordResponseProtoMsg): MsgOverwriteRedemptionRecordResponse;
    toProto(message: MsgOverwriteRedemptionRecordResponse): Uint8Array;
    toProtoMsg(message: MsgOverwriteRedemptionRecordResponse): MsgOverwriteRedemptionRecordResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * SetOperatorAddress
 * @name MsgSetOperatorAddress
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgSetOperatorAddress
 */
export declare const MsgSetOperatorAddress: {
    typeUrl: "/stride.staketia.MsgSetOperatorAddress";
    aminoType: "staketia/MsgSetOperatorAddress";
    is(o: any): o is MsgSetOperatorAddress;
    isSDK(o: any): o is MsgSetOperatorAddressSDKType;
    encode(message: MsgSetOperatorAddress, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSetOperatorAddress;
    fromJSON(object: any): MsgSetOperatorAddress;
    toJSON(message: MsgSetOperatorAddress): JsonSafe<MsgSetOperatorAddress>;
    fromPartial(object: Partial<MsgSetOperatorAddress>): MsgSetOperatorAddress;
    fromProtoMsg(message: MsgSetOperatorAddressProtoMsg): MsgSetOperatorAddress;
    toProto(message: MsgSetOperatorAddress): Uint8Array;
    toProtoMsg(message: MsgSetOperatorAddress): MsgSetOperatorAddressProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name MsgSetOperatorAddressResponse
 * @package stride.staketia
 * @see proto type: stride.staketia.MsgSetOperatorAddressResponse
 */
export declare const MsgSetOperatorAddressResponse: {
    typeUrl: "/stride.staketia.MsgSetOperatorAddressResponse";
    is(o: any): o is MsgSetOperatorAddressResponse;
    isSDK(o: any): o is MsgSetOperatorAddressResponseSDKType;
    encode(_: MsgSetOperatorAddressResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): MsgSetOperatorAddressResponse;
    fromJSON(_: any): MsgSetOperatorAddressResponse;
    toJSON(_: MsgSetOperatorAddressResponse): JsonSafe<MsgSetOperatorAddressResponse>;
    fromPartial(_: Partial<MsgSetOperatorAddressResponse>): MsgSetOperatorAddressResponse;
    fromProtoMsg(message: MsgSetOperatorAddressResponseProtoMsg): MsgSetOperatorAddressResponse;
    toProto(message: MsgSetOperatorAddressResponse): Uint8Array;
    toProtoMsg(message: MsgSetOperatorAddressResponse): MsgSetOperatorAddressResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=tx.d.ts.map