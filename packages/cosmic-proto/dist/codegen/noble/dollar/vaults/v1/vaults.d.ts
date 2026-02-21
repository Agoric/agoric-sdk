import { Timestamp, type TimestampSDKType } from '../../../../google/protobuf/timestamp.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/** buf:lint:ignore ENUM_VALUE_PREFIX */
export declare enum VaultType {
    /** UNSPECIFIED - buf:lint:ignore ENUM_ZERO_VALUE_SUFFIX */
    UNSPECIFIED = 0,
    STAKED = 1,
    FLEXIBLE = 2,
    UNRECOGNIZED = -1
}
export declare const VaultTypeSDKType: typeof VaultType;
export declare function vaultTypeFromJSON(object: any): VaultType;
export declare function vaultTypeToJSON(object: VaultType): string;
/** buf:lint:ignore ENUM_VALUE_PREFIX */
export declare enum PausedType {
    /** NONE - buf:lint:ignore ENUM_ZERO_VALUE_SUFFIX */
    NONE = 0,
    LOCK = 1,
    UNLOCK = 2,
    ALL = 3,
    UNRECOGNIZED = -1
}
export declare const PausedTypeSDKType: typeof PausedType;
export declare function pausedTypeFromJSON(object: any): PausedType;
export declare function pausedTypeToJSON(object: PausedType): string;
/**
 * @name Reward
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.Reward
 */
export interface Reward {
    index: bigint;
    total: string;
    rewards: string;
}
export interface RewardProtoMsg {
    typeUrl: '/noble.dollar.vaults.v1.Reward';
    value: Uint8Array;
}
/**
 * @name RewardSDKType
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.Reward
 */
export interface RewardSDKType {
    index: bigint;
    total: string;
    rewards: string;
}
/**
 * @name Position
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.Position
 */
export interface Position {
    principal: string;
    index: bigint;
    amount: string;
    time: Timestamp;
}
export interface PositionProtoMsg {
    typeUrl: '/noble.dollar.vaults.v1.Position';
    value: Uint8Array;
}
/**
 * @name PositionSDKType
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.Position
 */
export interface PositionSDKType {
    principal: string;
    index: bigint;
    amount: string;
    time: TimestampSDKType;
}
/**
 * @name PositionRewards
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.PositionRewards
 */
export interface PositionRewards {
    amount: string;
    pendingRewards: string;
}
export interface PositionRewardsProtoMsg {
    typeUrl: '/noble.dollar.vaults.v1.PositionRewards';
    value: Uint8Array;
}
/**
 * @name PositionRewardsSDKType
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.PositionRewards
 */
export interface PositionRewardsSDKType {
    amount: string;
    pending_rewards: string;
}
/**
 * @name PositionEntry
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.PositionEntry
 */
export interface PositionEntry {
    address: Uint8Array;
    vault: VaultType;
    principal: string;
    index: bigint;
    amount: string;
    time: Timestamp;
}
export interface PositionEntryProtoMsg {
    typeUrl: '/noble.dollar.vaults.v1.PositionEntry';
    value: Uint8Array;
}
/**
 * @name PositionEntrySDKType
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.PositionEntry
 */
export interface PositionEntrySDKType {
    address: Uint8Array;
    vault: VaultType;
    principal: string;
    index: bigint;
    amount: string;
    time: TimestampSDKType;
}
/**
 * @name Stats
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.Stats
 */
export interface Stats {
    flexibleTotalPrincipal: string;
    flexibleTotalUsers: bigint;
    flexibleTotalDistributedRewardsPrincipal: string;
    stakedTotalPrincipal: string;
    stakedTotalUsers: bigint;
}
export interface StatsProtoMsg {
    typeUrl: '/noble.dollar.vaults.v1.Stats';
    value: Uint8Array;
}
/**
 * @name StatsSDKType
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.Stats
 */
export interface StatsSDKType {
    flexible_total_principal: string;
    flexible_total_users: bigint;
    flexible_total_distributed_rewards_principal: string;
    staked_total_principal: string;
    staked_total_users: bigint;
}
/**
 * @name Reward
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.Reward
 */
export declare const Reward: {
    typeUrl: "/noble.dollar.vaults.v1.Reward";
    is(o: any): o is Reward;
    isSDK(o: any): o is RewardSDKType;
    encode(message: Reward, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Reward;
    fromJSON(object: any): Reward;
    toJSON(message: Reward): JsonSafe<Reward>;
    fromPartial(object: Partial<Reward>): Reward;
    fromProtoMsg(message: RewardProtoMsg): Reward;
    toProto(message: Reward): Uint8Array;
    toProtoMsg(message: Reward): RewardProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name Position
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.Position
 */
export declare const Position: {
    typeUrl: "/noble.dollar.vaults.v1.Position";
    is(o: any): o is Position;
    isSDK(o: any): o is PositionSDKType;
    encode(message: Position, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Position;
    fromJSON(object: any): Position;
    toJSON(message: Position): JsonSafe<Position>;
    fromPartial(object: Partial<Position>): Position;
    fromProtoMsg(message: PositionProtoMsg): Position;
    toProto(message: Position): Uint8Array;
    toProtoMsg(message: Position): PositionProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name PositionRewards
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.PositionRewards
 */
export declare const PositionRewards: {
    typeUrl: "/noble.dollar.vaults.v1.PositionRewards";
    is(o: any): o is PositionRewards;
    isSDK(o: any): o is PositionRewardsSDKType;
    encode(message: PositionRewards, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PositionRewards;
    fromJSON(object: any): PositionRewards;
    toJSON(message: PositionRewards): JsonSafe<PositionRewards>;
    fromPartial(object: Partial<PositionRewards>): PositionRewards;
    fromProtoMsg(message: PositionRewardsProtoMsg): PositionRewards;
    toProto(message: PositionRewards): Uint8Array;
    toProtoMsg(message: PositionRewards): PositionRewardsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name PositionEntry
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.PositionEntry
 */
export declare const PositionEntry: {
    typeUrl: "/noble.dollar.vaults.v1.PositionEntry";
    is(o: any): o is PositionEntry;
    isSDK(o: any): o is PositionEntrySDKType;
    encode(message: PositionEntry, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): PositionEntry;
    fromJSON(object: any): PositionEntry;
    toJSON(message: PositionEntry): JsonSafe<PositionEntry>;
    fromPartial(object: Partial<PositionEntry>): PositionEntry;
    fromProtoMsg(message: PositionEntryProtoMsg): PositionEntry;
    toProto(message: PositionEntry): Uint8Array;
    toProtoMsg(message: PositionEntry): PositionEntryProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name Stats
 * @package noble.dollar.vaults.v1
 * @see proto type: noble.dollar.vaults.v1.Stats
 */
export declare const Stats: {
    typeUrl: "/noble.dollar.vaults.v1.Stats";
    is(o: any): o is Stats;
    isSDK(o: any): o is StatsSDKType;
    encode(message: Stats, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Stats;
    fromJSON(object: any): Stats;
    toJSON(message: Stats): JsonSafe<Stats>;
    fromPartial(object: Partial<Stats>): Stats;
    fromProtoMsg(message: StatsProtoMsg): Stats;
    toProto(message: Stats): Uint8Array;
    toProtoMsg(message: Stats): StatsProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=vaults.d.ts.map