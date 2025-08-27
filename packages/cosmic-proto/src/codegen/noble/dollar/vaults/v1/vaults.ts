//@ts-nocheck
import {
  Timestamp,
  type TimestampSDKType,
} from '../../../../google/protobuf/timestamp.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import {
  isSet,
  fromJsonTimestamp,
  fromTimestamp,
} from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/** buf:lint:ignore ENUM_VALUE_PREFIX */
export enum VaultType {
  /** UNSPECIFIED - buf:lint:ignore ENUM_ZERO_VALUE_SUFFIX */
  UNSPECIFIED = 0,
  STAKED = 1,
  FLEXIBLE = 2,
  UNRECOGNIZED = -1,
}
export const VaultTypeSDKType = VaultType;
export function vaultTypeFromJSON(object: any): VaultType {
  switch (object) {
    case 0:
    case 'UNSPECIFIED':
      return VaultType.UNSPECIFIED;
    case 1:
    case 'STAKED':
      return VaultType.STAKED;
    case 2:
    case 'FLEXIBLE':
      return VaultType.FLEXIBLE;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return VaultType.UNRECOGNIZED;
  }
}
export function vaultTypeToJSON(object: VaultType): string {
  switch (object) {
    case VaultType.UNSPECIFIED:
      return 'UNSPECIFIED';
    case VaultType.STAKED:
      return 'STAKED';
    case VaultType.FLEXIBLE:
      return 'FLEXIBLE';
    case VaultType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/** buf:lint:ignore ENUM_VALUE_PREFIX */
export enum PausedType {
  /** NONE - buf:lint:ignore ENUM_ZERO_VALUE_SUFFIX */
  NONE = 0,
  LOCK = 1,
  UNLOCK = 2,
  ALL = 3,
  UNRECOGNIZED = -1,
}
export const PausedTypeSDKType = PausedType;
export function pausedTypeFromJSON(object: any): PausedType {
  switch (object) {
    case 0:
    case 'NONE':
      return PausedType.NONE;
    case 1:
    case 'LOCK':
      return PausedType.LOCK;
    case 2:
    case 'UNLOCK':
      return PausedType.UNLOCK;
    case 3:
    case 'ALL':
      return PausedType.ALL;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return PausedType.UNRECOGNIZED;
  }
}
export function pausedTypeToJSON(object: PausedType): string {
  switch (object) {
    case PausedType.NONE:
      return 'NONE';
    case PausedType.LOCK:
      return 'LOCK';
    case PausedType.UNLOCK:
      return 'UNLOCK';
    case PausedType.ALL:
      return 'ALL';
    case PausedType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
export interface Reward {
  index: bigint;
  total: string;
  rewards: string;
}
export interface RewardProtoMsg {
  typeUrl: '/noble.dollar.vaults.v1.Reward';
  value: Uint8Array;
}
export interface RewardSDKType {
  index: bigint;
  total: string;
  rewards: string;
}
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
export interface PositionSDKType {
  principal: string;
  index: bigint;
  amount: string;
  time: TimestampSDKType;
}
export interface PositionRewards {
  amount: string;
  pendingRewards: string;
}
export interface PositionRewardsProtoMsg {
  typeUrl: '/noble.dollar.vaults.v1.PositionRewards';
  value: Uint8Array;
}
export interface PositionRewardsSDKType {
  amount: string;
  pending_rewards: string;
}
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
export interface PositionEntrySDKType {
  address: Uint8Array;
  vault: VaultType;
  principal: string;
  index: bigint;
  amount: string;
  time: TimestampSDKType;
}
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
export interface StatsSDKType {
  flexible_total_principal: string;
  flexible_total_users: bigint;
  flexible_total_distributed_rewards_principal: string;
  staked_total_principal: string;
  staked_total_users: bigint;
}
function createBaseReward(): Reward {
  return {
    index: BigInt(0),
    total: '',
    rewards: '',
  };
}
export const Reward = {
  typeUrl: '/noble.dollar.vaults.v1.Reward' as const,
  encode(
    message: Reward,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.index !== BigInt(0)) {
      writer.uint32(8).int64(message.index);
    }
    if (message.total !== '') {
      writer.uint32(18).string(message.total);
    }
    if (message.rewards !== '') {
      writer.uint32(26).string(message.rewards);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Reward {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseReward();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.index = reader.int64();
          break;
        case 2:
          message.total = reader.string();
          break;
        case 3:
          message.rewards = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Reward {
    return {
      index: isSet(object.index) ? BigInt(object.index.toString()) : BigInt(0),
      total: isSet(object.total) ? String(object.total) : '',
      rewards: isSet(object.rewards) ? String(object.rewards) : '',
    };
  },
  toJSON(message: Reward): JsonSafe<Reward> {
    const obj: any = {};
    message.index !== undefined &&
      (obj.index = (message.index || BigInt(0)).toString());
    message.total !== undefined && (obj.total = message.total);
    message.rewards !== undefined && (obj.rewards = message.rewards);
    return obj;
  },
  fromPartial(object: Partial<Reward>): Reward {
    const message = createBaseReward();
    message.index =
      object.index !== undefined && object.index !== null
        ? BigInt(object.index.toString())
        : BigInt(0);
    message.total = object.total ?? '';
    message.rewards = object.rewards ?? '';
    return message;
  },
  fromProtoMsg(message: RewardProtoMsg): Reward {
    return Reward.decode(message.value);
  },
  toProto(message: Reward): Uint8Array {
    return Reward.encode(message).finish();
  },
  toProtoMsg(message: Reward): RewardProtoMsg {
    return {
      typeUrl: '/noble.dollar.vaults.v1.Reward',
      value: Reward.encode(message).finish(),
    };
  },
};
function createBasePosition(): Position {
  return {
    principal: '',
    index: BigInt(0),
    amount: '',
    time: Timestamp.fromPartial({}),
  };
}
export const Position = {
  typeUrl: '/noble.dollar.vaults.v1.Position' as const,
  encode(
    message: Position,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.principal !== '') {
      writer.uint32(10).string(message.principal);
    }
    if (message.index !== BigInt(0)) {
      writer.uint32(16).int64(message.index);
    }
    if (message.amount !== '') {
      writer.uint32(26).string(message.amount);
    }
    if (message.time !== undefined) {
      Timestamp.encode(message.time, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Position {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePosition();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.principal = reader.string();
          break;
        case 2:
          message.index = reader.int64();
          break;
        case 3:
          message.amount = reader.string();
          break;
        case 4:
          message.time = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Position {
    return {
      principal: isSet(object.principal) ? String(object.principal) : '',
      index: isSet(object.index) ? BigInt(object.index.toString()) : BigInt(0),
      amount: isSet(object.amount) ? String(object.amount) : '',
      time: isSet(object.time) ? fromJsonTimestamp(object.time) : undefined,
    };
  },
  toJSON(message: Position): JsonSafe<Position> {
    const obj: any = {};
    message.principal !== undefined && (obj.principal = message.principal);
    message.index !== undefined &&
      (obj.index = (message.index || BigInt(0)).toString());
    message.amount !== undefined && (obj.amount = message.amount);
    message.time !== undefined &&
      (obj.time = fromTimestamp(message.time).toISOString());
    return obj;
  },
  fromPartial(object: Partial<Position>): Position {
    const message = createBasePosition();
    message.principal = object.principal ?? '';
    message.index =
      object.index !== undefined && object.index !== null
        ? BigInt(object.index.toString())
        : BigInt(0);
    message.amount = object.amount ?? '';
    message.time =
      object.time !== undefined && object.time !== null
        ? Timestamp.fromPartial(object.time)
        : undefined;
    return message;
  },
  fromProtoMsg(message: PositionProtoMsg): Position {
    return Position.decode(message.value);
  },
  toProto(message: Position): Uint8Array {
    return Position.encode(message).finish();
  },
  toProtoMsg(message: Position): PositionProtoMsg {
    return {
      typeUrl: '/noble.dollar.vaults.v1.Position',
      value: Position.encode(message).finish(),
    };
  },
};
function createBasePositionRewards(): PositionRewards {
  return {
    amount: '',
    pendingRewards: '',
  };
}
export const PositionRewards = {
  typeUrl: '/noble.dollar.vaults.v1.PositionRewards' as const,
  encode(
    message: PositionRewards,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.amount !== '') {
      writer.uint32(10).string(message.amount);
    }
    if (message.pendingRewards !== '') {
      writer.uint32(18).string(message.pendingRewards);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PositionRewards {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePositionRewards();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.amount = reader.string();
          break;
        case 2:
          message.pendingRewards = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PositionRewards {
    return {
      amount: isSet(object.amount) ? String(object.amount) : '',
      pendingRewards: isSet(object.pendingRewards)
        ? String(object.pendingRewards)
        : '',
    };
  },
  toJSON(message: PositionRewards): JsonSafe<PositionRewards> {
    const obj: any = {};
    message.amount !== undefined && (obj.amount = message.amount);
    message.pendingRewards !== undefined &&
      (obj.pendingRewards = message.pendingRewards);
    return obj;
  },
  fromPartial(object: Partial<PositionRewards>): PositionRewards {
    const message = createBasePositionRewards();
    message.amount = object.amount ?? '';
    message.pendingRewards = object.pendingRewards ?? '';
    return message;
  },
  fromProtoMsg(message: PositionRewardsProtoMsg): PositionRewards {
    return PositionRewards.decode(message.value);
  },
  toProto(message: PositionRewards): Uint8Array {
    return PositionRewards.encode(message).finish();
  },
  toProtoMsg(message: PositionRewards): PositionRewardsProtoMsg {
    return {
      typeUrl: '/noble.dollar.vaults.v1.PositionRewards',
      value: PositionRewards.encode(message).finish(),
    };
  },
};
function createBasePositionEntry(): PositionEntry {
  return {
    address: new Uint8Array(),
    vault: 0,
    principal: '',
    index: BigInt(0),
    amount: '',
    time: Timestamp.fromPartial({}),
  };
}
export const PositionEntry = {
  typeUrl: '/noble.dollar.vaults.v1.PositionEntry' as const,
  encode(
    message: PositionEntry,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address.length !== 0) {
      writer.uint32(10).bytes(message.address);
    }
    if (message.vault !== 0) {
      writer.uint32(16).int32(message.vault);
    }
    if (message.principal !== '') {
      writer.uint32(26).string(message.principal);
    }
    if (message.index !== BigInt(0)) {
      writer.uint32(32).int64(message.index);
    }
    if (message.amount !== '') {
      writer.uint32(42).string(message.amount);
    }
    if (message.time !== undefined) {
      Timestamp.encode(message.time, writer.uint32(50).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PositionEntry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePositionEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.bytes();
          break;
        case 2:
          message.vault = reader.int32() as any;
          break;
        case 3:
          message.principal = reader.string();
          break;
        case 4:
          message.index = reader.int64();
          break;
        case 5:
          message.amount = reader.string();
          break;
        case 6:
          message.time = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PositionEntry {
    return {
      address: isSet(object.address)
        ? bytesFromBase64(object.address)
        : new Uint8Array(),
      vault: isSet(object.vault) ? vaultTypeFromJSON(object.vault) : -1,
      principal: isSet(object.principal) ? String(object.principal) : '',
      index: isSet(object.index) ? BigInt(object.index.toString()) : BigInt(0),
      amount: isSet(object.amount) ? String(object.amount) : '',
      time: isSet(object.time) ? fromJsonTimestamp(object.time) : undefined,
    };
  },
  toJSON(message: PositionEntry): JsonSafe<PositionEntry> {
    const obj: any = {};
    message.address !== undefined &&
      (obj.address = base64FromBytes(
        message.address !== undefined ? message.address : new Uint8Array(),
      ));
    message.vault !== undefined && (obj.vault = vaultTypeToJSON(message.vault));
    message.principal !== undefined && (obj.principal = message.principal);
    message.index !== undefined &&
      (obj.index = (message.index || BigInt(0)).toString());
    message.amount !== undefined && (obj.amount = message.amount);
    message.time !== undefined &&
      (obj.time = fromTimestamp(message.time).toISOString());
    return obj;
  },
  fromPartial(object: Partial<PositionEntry>): PositionEntry {
    const message = createBasePositionEntry();
    message.address = object.address ?? new Uint8Array();
    message.vault = object.vault ?? 0;
    message.principal = object.principal ?? '';
    message.index =
      object.index !== undefined && object.index !== null
        ? BigInt(object.index.toString())
        : BigInt(0);
    message.amount = object.amount ?? '';
    message.time =
      object.time !== undefined && object.time !== null
        ? Timestamp.fromPartial(object.time)
        : undefined;
    return message;
  },
  fromProtoMsg(message: PositionEntryProtoMsg): PositionEntry {
    return PositionEntry.decode(message.value);
  },
  toProto(message: PositionEntry): Uint8Array {
    return PositionEntry.encode(message).finish();
  },
  toProtoMsg(message: PositionEntry): PositionEntryProtoMsg {
    return {
      typeUrl: '/noble.dollar.vaults.v1.PositionEntry',
      value: PositionEntry.encode(message).finish(),
    };
  },
};
function createBaseStats(): Stats {
  return {
    flexibleTotalPrincipal: '',
    flexibleTotalUsers: BigInt(0),
    flexibleTotalDistributedRewardsPrincipal: '',
    stakedTotalPrincipal: '',
    stakedTotalUsers: BigInt(0),
  };
}
export const Stats = {
  typeUrl: '/noble.dollar.vaults.v1.Stats' as const,
  encode(
    message: Stats,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.flexibleTotalPrincipal !== '') {
      writer.uint32(10).string(message.flexibleTotalPrincipal);
    }
    if (message.flexibleTotalUsers !== BigInt(0)) {
      writer.uint32(16).uint64(message.flexibleTotalUsers);
    }
    if (message.flexibleTotalDistributedRewardsPrincipal !== '') {
      writer
        .uint32(26)
        .string(message.flexibleTotalDistributedRewardsPrincipal);
    }
    if (message.stakedTotalPrincipal !== '') {
      writer.uint32(34).string(message.stakedTotalPrincipal);
    }
    if (message.stakedTotalUsers !== BigInt(0)) {
      writer.uint32(40).uint64(message.stakedTotalUsers);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Stats {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseStats();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.flexibleTotalPrincipal = reader.string();
          break;
        case 2:
          message.flexibleTotalUsers = reader.uint64();
          break;
        case 3:
          message.flexibleTotalDistributedRewardsPrincipal = reader.string();
          break;
        case 4:
          message.stakedTotalPrincipal = reader.string();
          break;
        case 5:
          message.stakedTotalUsers = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Stats {
    return {
      flexibleTotalPrincipal: isSet(object.flexibleTotalPrincipal)
        ? String(object.flexibleTotalPrincipal)
        : '',
      flexibleTotalUsers: isSet(object.flexibleTotalUsers)
        ? BigInt(object.flexibleTotalUsers.toString())
        : BigInt(0),
      flexibleTotalDistributedRewardsPrincipal: isSet(
        object.flexibleTotalDistributedRewardsPrincipal,
      )
        ? String(object.flexibleTotalDistributedRewardsPrincipal)
        : '',
      stakedTotalPrincipal: isSet(object.stakedTotalPrincipal)
        ? String(object.stakedTotalPrincipal)
        : '',
      stakedTotalUsers: isSet(object.stakedTotalUsers)
        ? BigInt(object.stakedTotalUsers.toString())
        : BigInt(0),
    };
  },
  toJSON(message: Stats): JsonSafe<Stats> {
    const obj: any = {};
    message.flexibleTotalPrincipal !== undefined &&
      (obj.flexibleTotalPrincipal = message.flexibleTotalPrincipal);
    message.flexibleTotalUsers !== undefined &&
      (obj.flexibleTotalUsers = (
        message.flexibleTotalUsers || BigInt(0)
      ).toString());
    message.flexibleTotalDistributedRewardsPrincipal !== undefined &&
      (obj.flexibleTotalDistributedRewardsPrincipal =
        message.flexibleTotalDistributedRewardsPrincipal);
    message.stakedTotalPrincipal !== undefined &&
      (obj.stakedTotalPrincipal = message.stakedTotalPrincipal);
    message.stakedTotalUsers !== undefined &&
      (obj.stakedTotalUsers = (
        message.stakedTotalUsers || BigInt(0)
      ).toString());
    return obj;
  },
  fromPartial(object: Partial<Stats>): Stats {
    const message = createBaseStats();
    message.flexibleTotalPrincipal = object.flexibleTotalPrincipal ?? '';
    message.flexibleTotalUsers =
      object.flexibleTotalUsers !== undefined &&
      object.flexibleTotalUsers !== null
        ? BigInt(object.flexibleTotalUsers.toString())
        : BigInt(0);
    message.flexibleTotalDistributedRewardsPrincipal =
      object.flexibleTotalDistributedRewardsPrincipal ?? '';
    message.stakedTotalPrincipal = object.stakedTotalPrincipal ?? '';
    message.stakedTotalUsers =
      object.stakedTotalUsers !== undefined && object.stakedTotalUsers !== null
        ? BigInt(object.stakedTotalUsers.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: StatsProtoMsg): Stats {
    return Stats.decode(message.value);
  },
  toProto(message: Stats): Uint8Array {
    return Stats.encode(message).finish();
  },
  toProtoMsg(message: Stats): StatsProtoMsg {
    return {
      typeUrl: '/noble.dollar.vaults.v1.Stats',
      value: Stats.encode(message).finish(),
    };
  },
};
