//@ts-nocheck
import { Duration, DurationSDKType } from '../../google/protobuf/duration.js';
import {
  Timestamp,
  TimestampSDKType,
} from '../../google/protobuf/timestamp.js';
import { Coin, CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet, fromJsonTimestamp, fromTimestamp } from '../../helpers.js';
import { JsonSafe } from '../../json-safe.js';
/**
 * LockQueryType defines the type of the lock query that can
 * either be by duration or start time of the lock.
 */
export enum LockQueryType {
  ByDuration = 0,
  ByTime = 1,
  UNRECOGNIZED = -1,
}
export const LockQueryTypeSDKType = LockQueryType;
export function lockQueryTypeFromJSON(object: any): LockQueryType {
  switch (object) {
    case 0:
    case 'ByDuration':
      return LockQueryType.ByDuration;
    case 1:
    case 'ByTime':
      return LockQueryType.ByTime;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return LockQueryType.UNRECOGNIZED;
  }
}
export function lockQueryTypeToJSON(object: LockQueryType): string {
  switch (object) {
    case LockQueryType.ByDuration:
      return 'ByDuration';
    case LockQueryType.ByTime:
      return 'ByTime';
    case LockQueryType.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/**
 * PeriodLock is a single lock unit by period defined by the x/lockup module.
 * It's a record of a locked coin at a specific time. It stores owner, duration,
 * unlock time and the number of coins locked. A state of a period lock is
 * created upon lock creation, and deleted once the lock has been matured after
 * the `duration` has passed since unbonding started.
 */
export interface PeriodLock {
  /**
   * ID is the unique id of the lock.
   * The ID of the lock is decided upon lock creation, incrementing by 1 for
   * every lock.
   */
  ID: bigint;
  /**
   * Owner is the account address of the lock owner.
   * Only the owner can modify the state of the lock.
   */
  owner: string;
  /**
   * Duration is the time needed for a lock to mature after unlocking has
   * started.
   */
  duration: Duration;
  /**
   * EndTime refers to the time at which the lock would mature and get deleted.
   * This value is first initialized when an unlock has started for the lock,
   * end time being block time + duration.
   */
  endTime: Timestamp;
  /** Coins are the tokens locked within the lock, kept in the module account. */
  coins: Coin[];
}
export interface PeriodLockProtoMsg {
  typeUrl: '/osmosis.lockup.PeriodLock';
  value: Uint8Array;
}
/**
 * PeriodLock is a single lock unit by period defined by the x/lockup module.
 * It's a record of a locked coin at a specific time. It stores owner, duration,
 * unlock time and the number of coins locked. A state of a period lock is
 * created upon lock creation, and deleted once the lock has been matured after
 * the `duration` has passed since unbonding started.
 */
export interface PeriodLockSDKType {
  ID: bigint;
  owner: string;
  duration: DurationSDKType;
  end_time: TimestampSDKType;
  coins: CoinSDKType[];
}
/**
 * QueryCondition is a struct used for querying locks upon different conditions.
 * Duration field and timestamp fields could be optional, depending on the
 * LockQueryType.
 */
export interface QueryCondition {
  /** LockQueryType is a type of lock query, ByLockDuration | ByLockTime */
  lockQueryType: LockQueryType;
  /** Denom represents the token denomination we are looking to lock up */
  denom: string;
  /**
   * Duration is used to query locks with longer duration than the specified
   * duration. Duration field must not be nil when the lock query type is
   * `ByLockDuration`.
   */
  duration: Duration;
  /**
   * Timestamp is used by locks started before the specified duration.
   * Timestamp field must not be nil when the lock query type is `ByLockTime`.
   * Querying locks with timestamp is currently not implemented.
   */
  timestamp: Timestamp;
}
export interface QueryConditionProtoMsg {
  typeUrl: '/osmosis.lockup.QueryCondition';
  value: Uint8Array;
}
/**
 * QueryCondition is a struct used for querying locks upon different conditions.
 * Duration field and timestamp fields could be optional, depending on the
 * LockQueryType.
 */
export interface QueryConditionSDKType {
  lock_query_type: LockQueryType;
  denom: string;
  duration: DurationSDKType;
  timestamp: TimestampSDKType;
}
/**
 * SyntheticLock is creating virtual lockup where new denom is combination of
 * original denom and synthetic suffix. At the time of synthetic lockup creation
 * and deletion, accumulation store is also being updated and on querier side,
 * they can query as freely as native lockup.
 */
export interface SyntheticLock {
  /**
   * Underlying Lock ID is the underlying native lock's id for this synthetic
   * lockup. A synthetic lock MUST have an underlying lock.
   */
  underlyingLockId: bigint;
  /**
   * SynthDenom is the synthetic denom that is a combination of
   * gamm share + bonding status + validator address.
   */
  synthDenom: string;
  /**
   * used for unbonding synthetic lockups, for active synthetic lockups, this
   * value is set to uninitialized value
   */
  endTime: Timestamp;
  /**
   * Duration is the duration for a synthetic lock to mature
   * at the point of unbonding has started.
   */
  duration: Duration;
}
export interface SyntheticLockProtoMsg {
  typeUrl: '/osmosis.lockup.SyntheticLock';
  value: Uint8Array;
}
/**
 * SyntheticLock is creating virtual lockup where new denom is combination of
 * original denom and synthetic suffix. At the time of synthetic lockup creation
 * and deletion, accumulation store is also being updated and on querier side,
 * they can query as freely as native lockup.
 */
export interface SyntheticLockSDKType {
  underlying_lock_id: bigint;
  synth_denom: string;
  end_time: TimestampSDKType;
  duration: DurationSDKType;
}
function createBasePeriodLock(): PeriodLock {
  return {
    ID: BigInt(0),
    owner: '',
    duration: Duration.fromPartial({}),
    endTime: Timestamp.fromPartial({}),
    coins: [],
  };
}
export const PeriodLock = {
  typeUrl: '/osmosis.lockup.PeriodLock',
  encode(
    message: PeriodLock,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.ID !== BigInt(0)) {
      writer.uint32(8).uint64(message.ID);
    }
    if (message.owner !== '') {
      writer.uint32(18).string(message.owner);
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(26).fork()).ldelim();
    }
    if (message.endTime !== undefined) {
      Timestamp.encode(message.endTime, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PeriodLock {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePeriodLock();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.ID = reader.uint64();
          break;
        case 2:
          message.owner = reader.string();
          break;
        case 3:
          message.duration = Duration.decode(reader, reader.uint32());
          break;
        case 4:
          message.endTime = Timestamp.decode(reader, reader.uint32());
          break;
        case 5:
          message.coins.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PeriodLock {
    return {
      ID: isSet(object.ID) ? BigInt(object.ID.toString()) : BigInt(0),
      owner: isSet(object.owner) ? String(object.owner) : '',
      duration: isSet(object.duration)
        ? Duration.fromJSON(object.duration)
        : undefined,
      endTime: isSet(object.endTime)
        ? fromJsonTimestamp(object.endTime)
        : undefined,
      coins: Array.isArray(object?.coins)
        ? object.coins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: PeriodLock): JsonSafe<PeriodLock> {
    const obj: any = {};
    message.ID !== undefined && (obj.ID = (message.ID || BigInt(0)).toString());
    message.owner !== undefined && (obj.owner = message.owner);
    message.duration !== undefined &&
      (obj.duration = message.duration
        ? Duration.toJSON(message.duration)
        : undefined);
    message.endTime !== undefined &&
      (obj.endTime = fromTimestamp(message.endTime).toISOString());
    if (message.coins) {
      obj.coins = message.coins.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.coins = [];
    }
    return obj;
  },
  fromPartial(object: Partial<PeriodLock>): PeriodLock {
    const message = createBasePeriodLock();
    message.ID =
      object.ID !== undefined && object.ID !== null
        ? BigInt(object.ID.toString())
        : BigInt(0);
    message.owner = object.owner ?? '';
    message.duration =
      object.duration !== undefined && object.duration !== null
        ? Duration.fromPartial(object.duration)
        : undefined;
    message.endTime =
      object.endTime !== undefined && object.endTime !== null
        ? Timestamp.fromPartial(object.endTime)
        : undefined;
    message.coins = object.coins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: PeriodLockProtoMsg): PeriodLock {
    return PeriodLock.decode(message.value);
  },
  toProto(message: PeriodLock): Uint8Array {
    return PeriodLock.encode(message).finish();
  },
  toProtoMsg(message: PeriodLock): PeriodLockProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.PeriodLock',
      value: PeriodLock.encode(message).finish(),
    };
  },
};
function createBaseQueryCondition(): QueryCondition {
  return {
    lockQueryType: 0,
    denom: '',
    duration: Duration.fromPartial({}),
    timestamp: Timestamp.fromPartial({}),
  };
}
export const QueryCondition = {
  typeUrl: '/osmosis.lockup.QueryCondition',
  encode(
    message: QueryCondition,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.lockQueryType !== 0) {
      writer.uint32(8).int32(message.lockQueryType);
    }
    if (message.denom !== '') {
      writer.uint32(18).string(message.denom);
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(26).fork()).ldelim();
    }
    if (message.timestamp !== undefined) {
      Timestamp.encode(message.timestamp, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): QueryCondition {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCondition();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.lockQueryType = reader.int32() as any;
          break;
        case 2:
          message.denom = reader.string();
          break;
        case 3:
          message.duration = Duration.decode(reader, reader.uint32());
          break;
        case 4:
          message.timestamp = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryCondition {
    return {
      lockQueryType: isSet(object.lockQueryType)
        ? lockQueryTypeFromJSON(object.lockQueryType)
        : -1,
      denom: isSet(object.denom) ? String(object.denom) : '',
      duration: isSet(object.duration)
        ? Duration.fromJSON(object.duration)
        : undefined,
      timestamp: isSet(object.timestamp)
        ? fromJsonTimestamp(object.timestamp)
        : undefined,
    };
  },
  toJSON(message: QueryCondition): JsonSafe<QueryCondition> {
    const obj: any = {};
    message.lockQueryType !== undefined &&
      (obj.lockQueryType = lockQueryTypeToJSON(message.lockQueryType));
    message.denom !== undefined && (obj.denom = message.denom);
    message.duration !== undefined &&
      (obj.duration = message.duration
        ? Duration.toJSON(message.duration)
        : undefined);
    message.timestamp !== undefined &&
      (obj.timestamp = fromTimestamp(message.timestamp).toISOString());
    return obj;
  },
  fromPartial(object: Partial<QueryCondition>): QueryCondition {
    const message = createBaseQueryCondition();
    message.lockQueryType = object.lockQueryType ?? 0;
    message.denom = object.denom ?? '';
    message.duration =
      object.duration !== undefined && object.duration !== null
        ? Duration.fromPartial(object.duration)
        : undefined;
    message.timestamp =
      object.timestamp !== undefined && object.timestamp !== null
        ? Timestamp.fromPartial(object.timestamp)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryConditionProtoMsg): QueryCondition {
    return QueryCondition.decode(message.value);
  },
  toProto(message: QueryCondition): Uint8Array {
    return QueryCondition.encode(message).finish();
  },
  toProtoMsg(message: QueryCondition): QueryConditionProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.QueryCondition',
      value: QueryCondition.encode(message).finish(),
    };
  },
};
function createBaseSyntheticLock(): SyntheticLock {
  return {
    underlyingLockId: BigInt(0),
    synthDenom: '',
    endTime: Timestamp.fromPartial({}),
    duration: Duration.fromPartial({}),
  };
}
export const SyntheticLock = {
  typeUrl: '/osmosis.lockup.SyntheticLock',
  encode(
    message: SyntheticLock,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.underlyingLockId !== BigInt(0)) {
      writer.uint32(8).uint64(message.underlyingLockId);
    }
    if (message.synthDenom !== '') {
      writer.uint32(18).string(message.synthDenom);
    }
    if (message.endTime !== undefined) {
      Timestamp.encode(message.endTime, writer.uint32(26).fork()).ldelim();
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): SyntheticLock {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSyntheticLock();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.underlyingLockId = reader.uint64();
          break;
        case 2:
          message.synthDenom = reader.string();
          break;
        case 3:
          message.endTime = Timestamp.decode(reader, reader.uint32());
          break;
        case 4:
          message.duration = Duration.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SyntheticLock {
    return {
      underlyingLockId: isSet(object.underlyingLockId)
        ? BigInt(object.underlyingLockId.toString())
        : BigInt(0),
      synthDenom: isSet(object.synthDenom) ? String(object.synthDenom) : '',
      endTime: isSet(object.endTime)
        ? fromJsonTimestamp(object.endTime)
        : undefined,
      duration: isSet(object.duration)
        ? Duration.fromJSON(object.duration)
        : undefined,
    };
  },
  toJSON(message: SyntheticLock): JsonSafe<SyntheticLock> {
    const obj: any = {};
    message.underlyingLockId !== undefined &&
      (obj.underlyingLockId = (
        message.underlyingLockId || BigInt(0)
      ).toString());
    message.synthDenom !== undefined && (obj.synthDenom = message.synthDenom);
    message.endTime !== undefined &&
      (obj.endTime = fromTimestamp(message.endTime).toISOString());
    message.duration !== undefined &&
      (obj.duration = message.duration
        ? Duration.toJSON(message.duration)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<SyntheticLock>): SyntheticLock {
    const message = createBaseSyntheticLock();
    message.underlyingLockId =
      object.underlyingLockId !== undefined && object.underlyingLockId !== null
        ? BigInt(object.underlyingLockId.toString())
        : BigInt(0);
    message.synthDenom = object.synthDenom ?? '';
    message.endTime =
      object.endTime !== undefined && object.endTime !== null
        ? Timestamp.fromPartial(object.endTime)
        : undefined;
    message.duration =
      object.duration !== undefined && object.duration !== null
        ? Duration.fromPartial(object.duration)
        : undefined;
    return message;
  },
  fromProtoMsg(message: SyntheticLockProtoMsg): SyntheticLock {
    return SyntheticLock.decode(message.value);
  },
  toProto(message: SyntheticLock): Uint8Array {
    return SyntheticLock.encode(message).finish();
  },
  toProtoMsg(message: SyntheticLock): SyntheticLockProtoMsg {
    return {
      typeUrl: '/osmosis.lockup.SyntheticLock',
      value: SyntheticLock.encode(message).finish(),
    };
  },
};
