import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * Status fields for a delegation record
 * Note: There is an important assumption here that tokens in the deposit
 * account should not be tracked by these records. The record is created as soon
 * as the tokens leave stride
 * Additionally, the GetActiveDelegationRecords query filters for records that
 * are either TRANSFER_IN_PROGERSS or DELEGATION_QUEUE. If a new active status
 * is added, the keeper must be modified
 */
export declare enum DelegationRecordStatus {
    /**
     * TRANSFER_IN_PROGRESS - TRANSFER_IN_PROGRESS indicates the native tokens are being sent from the
     * deposit account to the delegation account
     */
    TRANSFER_IN_PROGRESS = 0,
    /**
     * TRANSFER_FAILED - TRANSFER_FAILED indicates that the transfer either timed out or was an ack
     * failure
     */
    TRANSFER_FAILED = 1,
    /**
     * DELEGATION_QUEUE - DELEGATION_QUEUE indicates the tokens have landed on the host zone and are
     * ready to be delegated
     */
    DELEGATION_QUEUE = 2,
    /** DELEGATION_COMPLETE - DELEGATION_COMPLETE indicates the delegation has been completed */
    DELEGATION_COMPLETE = 3,
    UNRECOGNIZED = -1
}
export declare const DelegationRecordStatusSDKType: typeof DelegationRecordStatus;
export declare function delegationRecordStatusFromJSON(object: any): DelegationRecordStatus;
export declare function delegationRecordStatusToJSON(object: DelegationRecordStatus): string;
/** Status fields for an unbonding record */
export declare enum UnbondingRecordStatus {
    /**
     * ACCUMULATING_REDEMPTIONS - ACCUMULATING_REDEMPTIONS indicates redemptions are still being accumulated
     * on this record
     */
    ACCUMULATING_REDEMPTIONS = 0,
    /**
     * UNBONDING_QUEUE - UNBONDING_QUEUE indicates the unbond amount for this epoch has been froze
     * and the tokens are ready to be unbonded on the host zone
     */
    UNBONDING_QUEUE = 1,
    /**
     * UNBONDING_IN_PROGRESS - UNBONDING_IN_PROGRESS indicates the unbonding is currently in progress on
     * the host zone
     */
    UNBONDING_IN_PROGRESS = 2,
    /**
     * UNBONDED - UNBONDED indicates the unbonding is finished on the host zone and the
     * tokens are still in the delegation account
     */
    UNBONDED = 3,
    /**
     * CLAIMABLE - CLAIMABLE indicates the unbonded tokens have been swept to stride and are
     * ready to be distributed to users
     */
    CLAIMABLE = 4,
    /** CLAIMED - CLAIMED indicates the full unbonding cycle has been completed */
    CLAIMED = 5,
    UNRECOGNIZED = -1
}
export declare const UnbondingRecordStatusSDKType: typeof UnbondingRecordStatus;
export declare function unbondingRecordStatusFromJSON(object: any): UnbondingRecordStatus;
export declare function unbondingRecordStatusToJSON(object: UnbondingRecordStatus): string;
/**
 * @name HostZone
 * @package stride.stakedym
 * @see proto type: stride.stakedym.HostZone
 */
export interface HostZone {
    /**
     * Chain ID
     */
    chainId: string;
    /**
     * Native token denom on the host zone (e.g. adym)
     */
    nativeTokenDenom: string;
    /**
     * IBC denom of the native token as it lives on stride (e.g. ibc/...)
     */
    nativeTokenIbcDenom: string;
    /**
     * Transfer channel ID from stride to the host zone
     */
    transferChannelId: string;
    /**
     * Operator controlled delegation address on the host zone
     */
    delegationAddress: string;
    /**
     * Operator controlled reward address on the host zone
     */
    rewardAddress: string;
    /**
     * Deposit address on stride
     */
    depositAddress: string;
    /**
     * Redemption address on stride
     */
    redemptionAddress: string;
    /**
     * Claim address on stride
     */
    claimAddress: string;
    /**
     * operator address set by safe, on stride
     */
    operatorAddressOnStride: string;
    /**
     * admin address set upon host zone creation,  on stride
     */
    safeAddressOnStride: string;
    /**
     * Previous redemption rate
     */
    lastRedemptionRate: string;
    /**
     * Current redemption rate
     */
    redemptionRate: string;
    /**
     * Min outer redemption rate - adjusted by governance
     */
    minRedemptionRate: string;
    /**
     * Max outer redemption rate - adjusted by governance
     */
    maxRedemptionRate: string;
    /**
     * Min inner redemption rate - adjusted by controller
     */
    minInnerRedemptionRate: string;
    /**
     * Max inner redemption rate - adjusted by controller
     */
    maxInnerRedemptionRate: string;
    /**
     * Total delegated balance on the host zone delegation account
     */
    delegatedBalance: string;
    /**
     * The undelegation period for Dymension in days
     */
    unbondingPeriodSeconds: bigint;
    /**
     * Indicates whether the host zone has been halted
     */
    halted: boolean;
}
export interface HostZoneProtoMsg {
    typeUrl: '/stride.stakedym.HostZone';
    value: Uint8Array;
}
/**
 * @name HostZoneSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.HostZone
 */
export interface HostZoneSDKType {
    chain_id: string;
    native_token_denom: string;
    native_token_ibc_denom: string;
    transfer_channel_id: string;
    delegation_address: string;
    reward_address: string;
    deposit_address: string;
    redemption_address: string;
    claim_address: string;
    operator_address_on_stride: string;
    safe_address_on_stride: string;
    last_redemption_rate: string;
    redemption_rate: string;
    min_redemption_rate: string;
    max_redemption_rate: string;
    min_inner_redemption_rate: string;
    max_inner_redemption_rate: string;
    delegated_balance: string;
    unbonding_period_seconds: bigint;
    halted: boolean;
}
/**
 * DelegationRecords track the aggregate liquid stakes and delegations
 * for a given epoch
 * Note: There is an important assumption here that tokens in the deposit
 * account should not be tracked by these records. The record is created as soon
 * as the tokens leave stride
 * @name DelegationRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.DelegationRecord
 */
export interface DelegationRecord {
    /**
     * Deposit record unique ID
     */
    id: bigint;
    /**
     * The amount of native tokens that should be delegated
     */
    nativeAmount: string;
    /**
     * The status indicating the point in the delegation's lifecycle
     */
    status: DelegationRecordStatus;
    /**
     * The tx hash of the delegation on the host zone
     */
    txHash: string;
}
export interface DelegationRecordProtoMsg {
    typeUrl: '/stride.stakedym.DelegationRecord';
    value: Uint8Array;
}
/**
 * DelegationRecords track the aggregate liquid stakes and delegations
 * for a given epoch
 * Note: There is an important assumption here that tokens in the deposit
 * account should not be tracked by these records. The record is created as soon
 * as the tokens leave stride
 * @name DelegationRecordSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.DelegationRecord
 */
export interface DelegationRecordSDKType {
    id: bigint;
    native_amount: string;
    status: DelegationRecordStatus;
    tx_hash: string;
}
/**
 * UnbondingRecords track the aggregate unbondings across an epoch
 * @name UnbondingRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.UnbondingRecord
 */
export interface UnbondingRecord {
    /**
     * Unbonding record ID
     */
    id: bigint;
    /**
     * The status indicating the point in the delegation's lifecycle
     */
    status: UnbondingRecordStatus;
    /**
     * The amount of stTokens that were redeemed
     */
    stTokenAmount: string;
    /**
     * The corresponding amount of native tokens that should be unbonded
     */
    nativeAmount: string;
    /**
     * The Unix timestamp (in seconds) at which the unbonding completes
     */
    unbondingCompletionTimeSeconds: bigint;
    /**
     * The tx hash of the undelegation on the host zone
     */
    undelegationTxHash: string;
    /**
     * The tx hash of the unbonded token sweep on the host zone
     */
    unbondedTokenSweepTxHash: string;
}
export interface UnbondingRecordProtoMsg {
    typeUrl: '/stride.stakedym.UnbondingRecord';
    value: Uint8Array;
}
/**
 * UnbondingRecords track the aggregate unbondings across an epoch
 * @name UnbondingRecordSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.UnbondingRecord
 */
export interface UnbondingRecordSDKType {
    id: bigint;
    status: UnbondingRecordStatus;
    st_token_amount: string;
    native_amount: string;
    unbonding_completion_time_seconds: bigint;
    undelegation_tx_hash: string;
    unbonded_token_sweep_tx_hash: string;
}
/**
 * RedemptionRecords track an individual user's redemption claims
 * @name RedemptionRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.RedemptionRecord
 */
export interface RedemptionRecord {
    /**
     * Unbonding record ID
     */
    unbondingRecordId: bigint;
    /**
     * Redeemer
     */
    redeemer: string;
    /**
     * The amount of stTokens that were redeemed
     */
    stTokenAmount: string;
    /**
     * The corresponding amount of native tokens that should be unbonded
     */
    nativeAmount: string;
}
export interface RedemptionRecordProtoMsg {
    typeUrl: '/stride.stakedym.RedemptionRecord';
    value: Uint8Array;
}
/**
 * RedemptionRecords track an individual user's redemption claims
 * @name RedemptionRecordSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.RedemptionRecord
 */
export interface RedemptionRecordSDKType {
    unbonding_record_id: bigint;
    redeemer: string;
    st_token_amount: string;
    native_amount: string;
}
/**
 * SlashRecords log adjustments to the delegated balance
 * @name SlashRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.SlashRecord
 */
export interface SlashRecord {
    /**
     * The slash record monotonically increasing ID
     */
    id: bigint;
    /**
     * The Unix timestamp (in seconds) when the slash adjustment was processed on
     * stride
     */
    time: bigint;
    /**
     * The delta by which the total delegated amount changed from slash
     */
    nativeAmount: string;
    /**
     * The address (or addresses) of the validator that was slashed
     */
    validatorAddress: string;
}
export interface SlashRecordProtoMsg {
    typeUrl: '/stride.stakedym.SlashRecord';
    value: Uint8Array;
}
/**
 * SlashRecords log adjustments to the delegated balance
 * @name SlashRecordSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.SlashRecord
 */
export interface SlashRecordSDKType {
    id: bigint;
    time: bigint;
    native_amount: string;
    validator_address: string;
}
/**
 * @name HostZone
 * @package stride.stakedym
 * @see proto type: stride.stakedym.HostZone
 */
export declare const HostZone: {
    typeUrl: "/stride.stakedym.HostZone";
    is(o: any): o is HostZone;
    isSDK(o: any): o is HostZoneSDKType;
    encode(message: HostZone, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): HostZone;
    fromJSON(object: any): HostZone;
    toJSON(message: HostZone): JsonSafe<HostZone>;
    fromPartial(object: Partial<HostZone>): HostZone;
    fromProtoMsg(message: HostZoneProtoMsg): HostZone;
    toProto(message: HostZone): Uint8Array;
    toProtoMsg(message: HostZone): HostZoneProtoMsg;
    registerTypeUrl(): void;
};
/**
 * DelegationRecords track the aggregate liquid stakes and delegations
 * for a given epoch
 * Note: There is an important assumption here that tokens in the deposit
 * account should not be tracked by these records. The record is created as soon
 * as the tokens leave stride
 * @name DelegationRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.DelegationRecord
 */
export declare const DelegationRecord: {
    typeUrl: "/stride.stakedym.DelegationRecord";
    is(o: any): o is DelegationRecord;
    isSDK(o: any): o is DelegationRecordSDKType;
    encode(message: DelegationRecord, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DelegationRecord;
    fromJSON(object: any): DelegationRecord;
    toJSON(message: DelegationRecord): JsonSafe<DelegationRecord>;
    fromPartial(object: Partial<DelegationRecord>): DelegationRecord;
    fromProtoMsg(message: DelegationRecordProtoMsg): DelegationRecord;
    toProto(message: DelegationRecord): Uint8Array;
    toProtoMsg(message: DelegationRecord): DelegationRecordProtoMsg;
    registerTypeUrl(): void;
};
/**
 * UnbondingRecords track the aggregate unbondings across an epoch
 * @name UnbondingRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.UnbondingRecord
 */
export declare const UnbondingRecord: {
    typeUrl: "/stride.stakedym.UnbondingRecord";
    is(o: any): o is UnbondingRecord;
    isSDK(o: any): o is UnbondingRecordSDKType;
    encode(message: UnbondingRecord, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): UnbondingRecord;
    fromJSON(object: any): UnbondingRecord;
    toJSON(message: UnbondingRecord): JsonSafe<UnbondingRecord>;
    fromPartial(object: Partial<UnbondingRecord>): UnbondingRecord;
    fromProtoMsg(message: UnbondingRecordProtoMsg): UnbondingRecord;
    toProto(message: UnbondingRecord): Uint8Array;
    toProtoMsg(message: UnbondingRecord): UnbondingRecordProtoMsg;
    registerTypeUrl(): void;
};
/**
 * RedemptionRecords track an individual user's redemption claims
 * @name RedemptionRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.RedemptionRecord
 */
export declare const RedemptionRecord: {
    typeUrl: "/stride.stakedym.RedemptionRecord";
    is(o: any): o is RedemptionRecord;
    isSDK(o: any): o is RedemptionRecordSDKType;
    encode(message: RedemptionRecord, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RedemptionRecord;
    fromJSON(object: any): RedemptionRecord;
    toJSON(message: RedemptionRecord): JsonSafe<RedemptionRecord>;
    fromPartial(object: Partial<RedemptionRecord>): RedemptionRecord;
    fromProtoMsg(message: RedemptionRecordProtoMsg): RedemptionRecord;
    toProto(message: RedemptionRecord): Uint8Array;
    toProtoMsg(message: RedemptionRecord): RedemptionRecordProtoMsg;
    registerTypeUrl(): void;
};
/**
 * SlashRecords log adjustments to the delegated balance
 * @name SlashRecord
 * @package stride.stakedym
 * @see proto type: stride.stakedym.SlashRecord
 */
export declare const SlashRecord: {
    typeUrl: "/stride.stakedym.SlashRecord";
    is(o: any): o is SlashRecord;
    isSDK(o: any): o is SlashRecordSDKType;
    encode(message: SlashRecord, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SlashRecord;
    fromJSON(object: any): SlashRecord;
    toJSON(message: SlashRecord): JsonSafe<SlashRecord>;
    fromPartial(object: Partial<SlashRecord>): SlashRecord;
    fromProtoMsg(message: SlashRecordProtoMsg): SlashRecord;
    toProto(message: SlashRecord): Uint8Array;
    toProtoMsg(message: SlashRecord): SlashRecordProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=stakedym.d.ts.map