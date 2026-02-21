import { Coin, type CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import { LSMTokenDeposit, type LSMTokenDepositSDKType } from '../records/records.js';
import { HostZone, type HostZoneSDKType } from './host_zone.js';
import { Validator, type ValidatorSDKType } from './validator.js';
import { ICAAccountType } from './ica_account.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * @name SplitDelegation
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.SplitDelegation
 */
export interface SplitDelegation {
    validator: string;
    amount: string;
}
export interface SplitDelegationProtoMsg {
    typeUrl: '/stride.stakeibc.SplitDelegation';
    value: Uint8Array;
}
/**
 * @name SplitDelegationSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.SplitDelegation
 */
export interface SplitDelegationSDKType {
    validator: string;
    amount: string;
}
/**
 * @name SplitUndelegation
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.SplitUndelegation
 */
export interface SplitUndelegation {
    validator: string;
    nativeTokenAmount: string;
}
export interface SplitUndelegationProtoMsg {
    typeUrl: '/stride.stakeibc.SplitUndelegation';
    value: Uint8Array;
}
/**
 * @name SplitUndelegationSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.SplitUndelegation
 */
export interface SplitUndelegationSDKType {
    validator: string;
    native_token_amount: string;
}
/**
 * @name DelegateCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.DelegateCallback
 */
export interface DelegateCallback {
    hostZoneId: string;
    depositRecordId: bigint;
    splitDelegations: SplitDelegation[];
}
export interface DelegateCallbackProtoMsg {
    typeUrl: '/stride.stakeibc.DelegateCallback';
    value: Uint8Array;
}
/**
 * @name DelegateCallbackSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.DelegateCallback
 */
export interface DelegateCallbackSDKType {
    host_zone_id: string;
    deposit_record_id: bigint;
    split_delegations: SplitDelegationSDKType[];
}
/**
 * @name ClaimCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ClaimCallback
 */
export interface ClaimCallback {
    userRedemptionRecordId: string;
    chainId: string;
    epochNumber: bigint;
}
export interface ClaimCallbackProtoMsg {
    typeUrl: '/stride.stakeibc.ClaimCallback';
    value: Uint8Array;
}
/**
 * @name ClaimCallbackSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ClaimCallback
 */
export interface ClaimCallbackSDKType {
    user_redemption_record_id: string;
    chain_id: string;
    epoch_number: bigint;
}
/**
 * @name ReinvestCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ReinvestCallback
 */
export interface ReinvestCallback {
    reinvestAmount: Coin;
    hostZoneId: string;
}
export interface ReinvestCallbackProtoMsg {
    typeUrl: '/stride.stakeibc.ReinvestCallback';
    value: Uint8Array;
}
/**
 * @name ReinvestCallbackSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ReinvestCallback
 */
export interface ReinvestCallbackSDKType {
    reinvest_amount: CoinSDKType;
    host_zone_id: string;
}
/**
 * @name UndelegateCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.UndelegateCallback
 */
export interface UndelegateCallback {
    hostZoneId: string;
    splitUndelegations: SplitUndelegation[];
    epochUnbondingRecordIds: bigint[];
}
export interface UndelegateCallbackProtoMsg {
    typeUrl: '/stride.stakeibc.UndelegateCallback';
    value: Uint8Array;
}
/**
 * @name UndelegateCallbackSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.UndelegateCallback
 */
export interface UndelegateCallbackSDKType {
    host_zone_id: string;
    split_undelegations: SplitUndelegationSDKType[];
    epoch_unbonding_record_ids: bigint[];
}
/**
 * @name RedemptionCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.RedemptionCallback
 */
export interface RedemptionCallback {
    hostZoneId: string;
    epochUnbondingRecordIds: bigint[];
}
export interface RedemptionCallbackProtoMsg {
    typeUrl: '/stride.stakeibc.RedemptionCallback';
    value: Uint8Array;
}
/**
 * @name RedemptionCallbackSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.RedemptionCallback
 */
export interface RedemptionCallbackSDKType {
    host_zone_id: string;
    epoch_unbonding_record_ids: bigint[];
}
/**
 * @name Rebalancing
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.Rebalancing
 */
export interface Rebalancing {
    srcValidator: string;
    dstValidator: string;
    amt: string;
}
export interface RebalancingProtoMsg {
    typeUrl: '/stride.stakeibc.Rebalancing';
    value: Uint8Array;
}
/**
 * @name RebalancingSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.Rebalancing
 */
export interface RebalancingSDKType {
    src_validator: string;
    dst_validator: string;
    amt: string;
}
/**
 * @name RebalanceCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.RebalanceCallback
 */
export interface RebalanceCallback {
    hostZoneId: string;
    rebalancings: Rebalancing[];
}
export interface RebalanceCallbackProtoMsg {
    typeUrl: '/stride.stakeibc.RebalanceCallback';
    value: Uint8Array;
}
/**
 * @name RebalanceCallbackSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.RebalanceCallback
 */
export interface RebalanceCallbackSDKType {
    host_zone_id: string;
    rebalancings: RebalancingSDKType[];
}
/**
 * @name DetokenizeSharesCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.DetokenizeSharesCallback
 */
export interface DetokenizeSharesCallback {
    deposit?: LSMTokenDeposit;
}
export interface DetokenizeSharesCallbackProtoMsg {
    typeUrl: '/stride.stakeibc.DetokenizeSharesCallback';
    value: Uint8Array;
}
/**
 * @name DetokenizeSharesCallbackSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.DetokenizeSharesCallback
 */
export interface DetokenizeSharesCallbackSDKType {
    deposit?: LSMTokenDepositSDKType;
}
/**
 * @name LSMLiquidStake
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.LSMLiquidStake
 */
export interface LSMLiquidStake {
    deposit?: LSMTokenDeposit;
    hostZone?: HostZone;
    validator?: Validator;
}
export interface LSMLiquidStakeProtoMsg {
    typeUrl: '/stride.stakeibc.LSMLiquidStake';
    value: Uint8Array;
}
/**
 * @name LSMLiquidStakeSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.LSMLiquidStake
 */
export interface LSMLiquidStakeSDKType {
    deposit?: LSMTokenDepositSDKType;
    host_zone?: HostZoneSDKType;
    validator?: ValidatorSDKType;
}
/**
 * @name ValidatorSharesToTokensQueryCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ValidatorSharesToTokensQueryCallback
 */
export interface ValidatorSharesToTokensQueryCallback {
    lsmLiquidStake?: LSMLiquidStake;
}
export interface ValidatorSharesToTokensQueryCallbackProtoMsg {
    typeUrl: '/stride.stakeibc.ValidatorSharesToTokensQueryCallback';
    value: Uint8Array;
}
/**
 * @name ValidatorSharesToTokensQueryCallbackSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ValidatorSharesToTokensQueryCallback
 */
export interface ValidatorSharesToTokensQueryCallbackSDKType {
    lsm_liquid_stake?: LSMLiquidStakeSDKType;
}
/**
 * @name DelegatorSharesQueryCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.DelegatorSharesQueryCallback
 */
export interface DelegatorSharesQueryCallback {
    /**
     * Validator delegation at the time the query is submitted
     */
    initialValidatorDelegation: string;
}
export interface DelegatorSharesQueryCallbackProtoMsg {
    typeUrl: '/stride.stakeibc.DelegatorSharesQueryCallback';
    value: Uint8Array;
}
/**
 * @name DelegatorSharesQueryCallbackSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.DelegatorSharesQueryCallback
 */
export interface DelegatorSharesQueryCallbackSDKType {
    initial_validator_delegation: string;
}
/**
 * @name CommunityPoolBalanceQueryCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.CommunityPoolBalanceQueryCallback
 */
export interface CommunityPoolBalanceQueryCallback {
    icaType: ICAAccountType;
    denom: string;
}
export interface CommunityPoolBalanceQueryCallbackProtoMsg {
    typeUrl: '/stride.stakeibc.CommunityPoolBalanceQueryCallback';
    value: Uint8Array;
}
/**
 * @name CommunityPoolBalanceQueryCallbackSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.CommunityPoolBalanceQueryCallback
 */
export interface CommunityPoolBalanceQueryCallbackSDKType {
    ica_type: ICAAccountType;
    denom: string;
}
/**
 * @name TradeRouteCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.TradeRouteCallback
 */
export interface TradeRouteCallback {
    rewardDenom: string;
    hostDenom: string;
}
export interface TradeRouteCallbackProtoMsg {
    typeUrl: '/stride.stakeibc.TradeRouteCallback';
    value: Uint8Array;
}
/**
 * @name TradeRouteCallbackSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.TradeRouteCallback
 */
export interface TradeRouteCallbackSDKType {
    reward_denom: string;
    host_denom: string;
}
/**
 * @name SplitDelegation
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.SplitDelegation
 */
export declare const SplitDelegation: {
    typeUrl: "/stride.stakeibc.SplitDelegation";
    is(o: any): o is SplitDelegation;
    isSDK(o: any): o is SplitDelegationSDKType;
    encode(message: SplitDelegation, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SplitDelegation;
    fromJSON(object: any): SplitDelegation;
    toJSON(message: SplitDelegation): JsonSafe<SplitDelegation>;
    fromPartial(object: Partial<SplitDelegation>): SplitDelegation;
    fromProtoMsg(message: SplitDelegationProtoMsg): SplitDelegation;
    toProto(message: SplitDelegation): Uint8Array;
    toProtoMsg(message: SplitDelegation): SplitDelegationProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name SplitUndelegation
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.SplitUndelegation
 */
export declare const SplitUndelegation: {
    typeUrl: "/stride.stakeibc.SplitUndelegation";
    is(o: any): o is SplitUndelegation;
    isSDK(o: any): o is SplitUndelegationSDKType;
    encode(message: SplitUndelegation, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SplitUndelegation;
    fromJSON(object: any): SplitUndelegation;
    toJSON(message: SplitUndelegation): JsonSafe<SplitUndelegation>;
    fromPartial(object: Partial<SplitUndelegation>): SplitUndelegation;
    fromProtoMsg(message: SplitUndelegationProtoMsg): SplitUndelegation;
    toProto(message: SplitUndelegation): Uint8Array;
    toProtoMsg(message: SplitUndelegation): SplitUndelegationProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name DelegateCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.DelegateCallback
 */
export declare const DelegateCallback: {
    typeUrl: "/stride.stakeibc.DelegateCallback";
    is(o: any): o is DelegateCallback;
    isSDK(o: any): o is DelegateCallbackSDKType;
    encode(message: DelegateCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DelegateCallback;
    fromJSON(object: any): DelegateCallback;
    toJSON(message: DelegateCallback): JsonSafe<DelegateCallback>;
    fromPartial(object: Partial<DelegateCallback>): DelegateCallback;
    fromProtoMsg(message: DelegateCallbackProtoMsg): DelegateCallback;
    toProto(message: DelegateCallback): Uint8Array;
    toProtoMsg(message: DelegateCallback): DelegateCallbackProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ClaimCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ClaimCallback
 */
export declare const ClaimCallback: {
    typeUrl: "/stride.stakeibc.ClaimCallback";
    is(o: any): o is ClaimCallback;
    isSDK(o: any): o is ClaimCallbackSDKType;
    encode(message: ClaimCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ClaimCallback;
    fromJSON(object: any): ClaimCallback;
    toJSON(message: ClaimCallback): JsonSafe<ClaimCallback>;
    fromPartial(object: Partial<ClaimCallback>): ClaimCallback;
    fromProtoMsg(message: ClaimCallbackProtoMsg): ClaimCallback;
    toProto(message: ClaimCallback): Uint8Array;
    toProtoMsg(message: ClaimCallback): ClaimCallbackProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ReinvestCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ReinvestCallback
 */
export declare const ReinvestCallback: {
    typeUrl: "/stride.stakeibc.ReinvestCallback";
    is(o: any): o is ReinvestCallback;
    isSDK(o: any): o is ReinvestCallbackSDKType;
    encode(message: ReinvestCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ReinvestCallback;
    fromJSON(object: any): ReinvestCallback;
    toJSON(message: ReinvestCallback): JsonSafe<ReinvestCallback>;
    fromPartial(object: Partial<ReinvestCallback>): ReinvestCallback;
    fromProtoMsg(message: ReinvestCallbackProtoMsg): ReinvestCallback;
    toProto(message: ReinvestCallback): Uint8Array;
    toProtoMsg(message: ReinvestCallback): ReinvestCallbackProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name UndelegateCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.UndelegateCallback
 */
export declare const UndelegateCallback: {
    typeUrl: "/stride.stakeibc.UndelegateCallback";
    is(o: any): o is UndelegateCallback;
    isSDK(o: any): o is UndelegateCallbackSDKType;
    encode(message: UndelegateCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): UndelegateCallback;
    fromJSON(object: any): UndelegateCallback;
    toJSON(message: UndelegateCallback): JsonSafe<UndelegateCallback>;
    fromPartial(object: Partial<UndelegateCallback>): UndelegateCallback;
    fromProtoMsg(message: UndelegateCallbackProtoMsg): UndelegateCallback;
    toProto(message: UndelegateCallback): Uint8Array;
    toProtoMsg(message: UndelegateCallback): UndelegateCallbackProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name RedemptionCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.RedemptionCallback
 */
export declare const RedemptionCallback: {
    typeUrl: "/stride.stakeibc.RedemptionCallback";
    is(o: any): o is RedemptionCallback;
    isSDK(o: any): o is RedemptionCallbackSDKType;
    encode(message: RedemptionCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RedemptionCallback;
    fromJSON(object: any): RedemptionCallback;
    toJSON(message: RedemptionCallback): JsonSafe<RedemptionCallback>;
    fromPartial(object: Partial<RedemptionCallback>): RedemptionCallback;
    fromProtoMsg(message: RedemptionCallbackProtoMsg): RedemptionCallback;
    toProto(message: RedemptionCallback): Uint8Array;
    toProtoMsg(message: RedemptionCallback): RedemptionCallbackProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name Rebalancing
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.Rebalancing
 */
export declare const Rebalancing: {
    typeUrl: "/stride.stakeibc.Rebalancing";
    is(o: any): o is Rebalancing;
    isSDK(o: any): o is RebalancingSDKType;
    encode(message: Rebalancing, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Rebalancing;
    fromJSON(object: any): Rebalancing;
    toJSON(message: Rebalancing): JsonSafe<Rebalancing>;
    fromPartial(object: Partial<Rebalancing>): Rebalancing;
    fromProtoMsg(message: RebalancingProtoMsg): Rebalancing;
    toProto(message: Rebalancing): Uint8Array;
    toProtoMsg(message: Rebalancing): RebalancingProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name RebalanceCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.RebalanceCallback
 */
export declare const RebalanceCallback: {
    typeUrl: "/stride.stakeibc.RebalanceCallback";
    is(o: any): o is RebalanceCallback;
    isSDK(o: any): o is RebalanceCallbackSDKType;
    encode(message: RebalanceCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RebalanceCallback;
    fromJSON(object: any): RebalanceCallback;
    toJSON(message: RebalanceCallback): JsonSafe<RebalanceCallback>;
    fromPartial(object: Partial<RebalanceCallback>): RebalanceCallback;
    fromProtoMsg(message: RebalanceCallbackProtoMsg): RebalanceCallback;
    toProto(message: RebalanceCallback): Uint8Array;
    toProtoMsg(message: RebalanceCallback): RebalanceCallbackProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name DetokenizeSharesCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.DetokenizeSharesCallback
 */
export declare const DetokenizeSharesCallback: {
    typeUrl: "/stride.stakeibc.DetokenizeSharesCallback";
    is(o: any): o is DetokenizeSharesCallback;
    isSDK(o: any): o is DetokenizeSharesCallbackSDKType;
    encode(message: DetokenizeSharesCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DetokenizeSharesCallback;
    fromJSON(object: any): DetokenizeSharesCallback;
    toJSON(message: DetokenizeSharesCallback): JsonSafe<DetokenizeSharesCallback>;
    fromPartial(object: Partial<DetokenizeSharesCallback>): DetokenizeSharesCallback;
    fromProtoMsg(message: DetokenizeSharesCallbackProtoMsg): DetokenizeSharesCallback;
    toProto(message: DetokenizeSharesCallback): Uint8Array;
    toProtoMsg(message: DetokenizeSharesCallback): DetokenizeSharesCallbackProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name LSMLiquidStake
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.LSMLiquidStake
 */
export declare const LSMLiquidStake: {
    typeUrl: "/stride.stakeibc.LSMLiquidStake";
    is(o: any): o is LSMLiquidStake;
    isSDK(o: any): o is LSMLiquidStakeSDKType;
    encode(message: LSMLiquidStake, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): LSMLiquidStake;
    fromJSON(object: any): LSMLiquidStake;
    toJSON(message: LSMLiquidStake): JsonSafe<LSMLiquidStake>;
    fromPartial(object: Partial<LSMLiquidStake>): LSMLiquidStake;
    fromProtoMsg(message: LSMLiquidStakeProtoMsg): LSMLiquidStake;
    toProto(message: LSMLiquidStake): Uint8Array;
    toProtoMsg(message: LSMLiquidStake): LSMLiquidStakeProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name ValidatorSharesToTokensQueryCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.ValidatorSharesToTokensQueryCallback
 */
export declare const ValidatorSharesToTokensQueryCallback: {
    typeUrl: "/stride.stakeibc.ValidatorSharesToTokensQueryCallback";
    is(o: any): o is ValidatorSharesToTokensQueryCallback;
    isSDK(o: any): o is ValidatorSharesToTokensQueryCallbackSDKType;
    encode(message: ValidatorSharesToTokensQueryCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ValidatorSharesToTokensQueryCallback;
    fromJSON(object: any): ValidatorSharesToTokensQueryCallback;
    toJSON(message: ValidatorSharesToTokensQueryCallback): JsonSafe<ValidatorSharesToTokensQueryCallback>;
    fromPartial(object: Partial<ValidatorSharesToTokensQueryCallback>): ValidatorSharesToTokensQueryCallback;
    fromProtoMsg(message: ValidatorSharesToTokensQueryCallbackProtoMsg): ValidatorSharesToTokensQueryCallback;
    toProto(message: ValidatorSharesToTokensQueryCallback): Uint8Array;
    toProtoMsg(message: ValidatorSharesToTokensQueryCallback): ValidatorSharesToTokensQueryCallbackProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name DelegatorSharesQueryCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.DelegatorSharesQueryCallback
 */
export declare const DelegatorSharesQueryCallback: {
    typeUrl: "/stride.stakeibc.DelegatorSharesQueryCallback";
    is(o: any): o is DelegatorSharesQueryCallback;
    isSDK(o: any): o is DelegatorSharesQueryCallbackSDKType;
    encode(message: DelegatorSharesQueryCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DelegatorSharesQueryCallback;
    fromJSON(object: any): DelegatorSharesQueryCallback;
    toJSON(message: DelegatorSharesQueryCallback): JsonSafe<DelegatorSharesQueryCallback>;
    fromPartial(object: Partial<DelegatorSharesQueryCallback>): DelegatorSharesQueryCallback;
    fromProtoMsg(message: DelegatorSharesQueryCallbackProtoMsg): DelegatorSharesQueryCallback;
    toProto(message: DelegatorSharesQueryCallback): Uint8Array;
    toProtoMsg(message: DelegatorSharesQueryCallback): DelegatorSharesQueryCallbackProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name CommunityPoolBalanceQueryCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.CommunityPoolBalanceQueryCallback
 */
export declare const CommunityPoolBalanceQueryCallback: {
    typeUrl: "/stride.stakeibc.CommunityPoolBalanceQueryCallback";
    is(o: any): o is CommunityPoolBalanceQueryCallback;
    isSDK(o: any): o is CommunityPoolBalanceQueryCallbackSDKType;
    encode(message: CommunityPoolBalanceQueryCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): CommunityPoolBalanceQueryCallback;
    fromJSON(object: any): CommunityPoolBalanceQueryCallback;
    toJSON(message: CommunityPoolBalanceQueryCallback): JsonSafe<CommunityPoolBalanceQueryCallback>;
    fromPartial(object: Partial<CommunityPoolBalanceQueryCallback>): CommunityPoolBalanceQueryCallback;
    fromProtoMsg(message: CommunityPoolBalanceQueryCallbackProtoMsg): CommunityPoolBalanceQueryCallback;
    toProto(message: CommunityPoolBalanceQueryCallback): Uint8Array;
    toProtoMsg(message: CommunityPoolBalanceQueryCallback): CommunityPoolBalanceQueryCallbackProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name TradeRouteCallback
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.TradeRouteCallback
 */
export declare const TradeRouteCallback: {
    typeUrl: "/stride.stakeibc.TradeRouteCallback";
    is(o: any): o is TradeRouteCallback;
    isSDK(o: any): o is TradeRouteCallbackSDKType;
    encode(message: TradeRouteCallback, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TradeRouteCallback;
    fromJSON(object: any): TradeRouteCallback;
    toJSON(message: TradeRouteCallback): JsonSafe<TradeRouteCallback>;
    fromPartial(object: Partial<TradeRouteCallback>): TradeRouteCallback;
    fromProtoMsg(message: TradeRouteCallbackProtoMsg): TradeRouteCallback;
    toProto(message: TradeRouteCallback): Uint8Array;
    toProtoMsg(message: TradeRouteCallback): TradeRouteCallbackProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=callbacks.d.ts.map