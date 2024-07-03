//@ts-nocheck
import { QueryCondition, QueryConditionSDKType } from '../lockup/lock.js';
import { Coin, CoinSDKType } from '../../cosmos/base/v1beta1/coin.js';
import {
  Timestamp,
  TimestampSDKType,
} from '../../google/protobuf/timestamp.js';
import { Duration, DurationSDKType } from '../../google/protobuf/duration.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet, fromJsonTimestamp, fromTimestamp } from '../../helpers.js';
import { JsonSafe } from '../../json-safe.js';
/**
 * Gauge is an object that stores and distributes yields to recipients who
 * satisfy certain conditions. Currently gauges support conditions around the
 * duration for which a given denom is locked.
 */
export interface Gauge {
  /** id is the unique ID of a Gauge */
  id: bigint;
  /**
   * is_perpetual is a flag to show if it's a perpetual or non-perpetual gauge
   * Non-perpetual gauges distribute their tokens equally per epoch while the
   * gauge is in the active period. Perpetual gauges distribute all their tokens
   * at a single time and only distribute their tokens again once the gauge is
   * refilled, Intended for use with incentives that get refilled daily.
   */
  isPerpetual: boolean;
  /**
   * distribute_to is where the gauge rewards are distributed to.
   * This is queried via lock duration or by timestamp
   */
  distributeTo: QueryCondition;
  /**
   * coins is the total amount of coins that have been in the gauge
   * Can distribute multiple coin denoms
   */
  coins: Coin[];
  /** start_time is the distribution start time */
  startTime: Timestamp;
  /**
   * num_epochs_paid_over is the number of total epochs distribution will be
   * completed over
   */
  numEpochsPaidOver: bigint;
  /**
   * filled_epochs is the number of epochs distribution has been completed on
   * already
   */
  filledEpochs: bigint;
  /** distributed_coins are coins that have been distributed already */
  distributedCoins: Coin[];
}
export interface GaugeProtoMsg {
  typeUrl: '/osmosis.incentives.Gauge';
  value: Uint8Array;
}
/**
 * Gauge is an object that stores and distributes yields to recipients who
 * satisfy certain conditions. Currently gauges support conditions around the
 * duration for which a given denom is locked.
 */
export interface GaugeSDKType {
  id: bigint;
  is_perpetual: boolean;
  distribute_to: QueryConditionSDKType;
  coins: CoinSDKType[];
  start_time: TimestampSDKType;
  num_epochs_paid_over: bigint;
  filled_epochs: bigint;
  distributed_coins: CoinSDKType[];
}
export interface LockableDurationsInfo {
  /** List of incentivised durations that gauges will pay out to */
  lockableDurations: Duration[];
}
export interface LockableDurationsInfoProtoMsg {
  typeUrl: '/osmosis.incentives.LockableDurationsInfo';
  value: Uint8Array;
}
export interface LockableDurationsInfoSDKType {
  lockable_durations: DurationSDKType[];
}
function createBaseGauge(): Gauge {
  return {
    id: BigInt(0),
    isPerpetual: false,
    distributeTo: QueryCondition.fromPartial({}),
    coins: [],
    startTime: Timestamp.fromPartial({}),
    numEpochsPaidOver: BigInt(0),
    filledEpochs: BigInt(0),
    distributedCoins: [],
  };
}
export const Gauge = {
  typeUrl: '/osmosis.incentives.Gauge',
  encode(
    message: Gauge,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.id !== BigInt(0)) {
      writer.uint32(8).uint64(message.id);
    }
    if (message.isPerpetual === true) {
      writer.uint32(16).bool(message.isPerpetual);
    }
    if (message.distributeTo !== undefined) {
      QueryCondition.encode(
        message.distributeTo,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    if (message.startTime !== undefined) {
      Timestamp.encode(message.startTime, writer.uint32(42).fork()).ldelim();
    }
    if (message.numEpochsPaidOver !== BigInt(0)) {
      writer.uint32(48).uint64(message.numEpochsPaidOver);
    }
    if (message.filledEpochs !== BigInt(0)) {
      writer.uint32(56).uint64(message.filledEpochs);
    }
    for (const v of message.distributedCoins) {
      Coin.encode(v!, writer.uint32(66).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Gauge {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGauge();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.id = reader.uint64();
          break;
        case 2:
          message.isPerpetual = reader.bool();
          break;
        case 3:
          message.distributeTo = QueryCondition.decode(reader, reader.uint32());
          break;
        case 4:
          message.coins.push(Coin.decode(reader, reader.uint32()));
          break;
        case 5:
          message.startTime = Timestamp.decode(reader, reader.uint32());
          break;
        case 6:
          message.numEpochsPaidOver = reader.uint64();
          break;
        case 7:
          message.filledEpochs = reader.uint64();
          break;
        case 8:
          message.distributedCoins.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Gauge {
    return {
      id: isSet(object.id) ? BigInt(object.id.toString()) : BigInt(0),
      isPerpetual: isSet(object.isPerpetual)
        ? Boolean(object.isPerpetual)
        : false,
      distributeTo: isSet(object.distributeTo)
        ? QueryCondition.fromJSON(object.distributeTo)
        : undefined,
      coins: Array.isArray(object?.coins)
        ? object.coins.map((e: any) => Coin.fromJSON(e))
        : [],
      startTime: isSet(object.startTime)
        ? fromJsonTimestamp(object.startTime)
        : undefined,
      numEpochsPaidOver: isSet(object.numEpochsPaidOver)
        ? BigInt(object.numEpochsPaidOver.toString())
        : BigInt(0),
      filledEpochs: isSet(object.filledEpochs)
        ? BigInt(object.filledEpochs.toString())
        : BigInt(0),
      distributedCoins: Array.isArray(object?.distributedCoins)
        ? object.distributedCoins.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(message: Gauge): JsonSafe<Gauge> {
    const obj: any = {};
    message.id !== undefined && (obj.id = (message.id || BigInt(0)).toString());
    message.isPerpetual !== undefined &&
      (obj.isPerpetual = message.isPerpetual);
    message.distributeTo !== undefined &&
      (obj.distributeTo = message.distributeTo
        ? QueryCondition.toJSON(message.distributeTo)
        : undefined);
    if (message.coins) {
      obj.coins = message.coins.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.coins = [];
    }
    message.startTime !== undefined &&
      (obj.startTime = fromTimestamp(message.startTime).toISOString());
    message.numEpochsPaidOver !== undefined &&
      (obj.numEpochsPaidOver = (
        message.numEpochsPaidOver || BigInt(0)
      ).toString());
    message.filledEpochs !== undefined &&
      (obj.filledEpochs = (message.filledEpochs || BigInt(0)).toString());
    if (message.distributedCoins) {
      obj.distributedCoins = message.distributedCoins.map(e =>
        e ? Coin.toJSON(e) : undefined,
      );
    } else {
      obj.distributedCoins = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Gauge>): Gauge {
    const message = createBaseGauge();
    message.id =
      object.id !== undefined && object.id !== null
        ? BigInt(object.id.toString())
        : BigInt(0);
    message.isPerpetual = object.isPerpetual ?? false;
    message.distributeTo =
      object.distributeTo !== undefined && object.distributeTo !== null
        ? QueryCondition.fromPartial(object.distributeTo)
        : undefined;
    message.coins = object.coins?.map(e => Coin.fromPartial(e)) || [];
    message.startTime =
      object.startTime !== undefined && object.startTime !== null
        ? Timestamp.fromPartial(object.startTime)
        : undefined;
    message.numEpochsPaidOver =
      object.numEpochsPaidOver !== undefined &&
      object.numEpochsPaidOver !== null
        ? BigInt(object.numEpochsPaidOver.toString())
        : BigInt(0);
    message.filledEpochs =
      object.filledEpochs !== undefined && object.filledEpochs !== null
        ? BigInt(object.filledEpochs.toString())
        : BigInt(0);
    message.distributedCoins =
      object.distributedCoins?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: GaugeProtoMsg): Gauge {
    return Gauge.decode(message.value);
  },
  toProto(message: Gauge): Uint8Array {
    return Gauge.encode(message).finish();
  },
  toProtoMsg(message: Gauge): GaugeProtoMsg {
    return {
      typeUrl: '/osmosis.incentives.Gauge',
      value: Gauge.encode(message).finish(),
    };
  },
};
function createBaseLockableDurationsInfo(): LockableDurationsInfo {
  return {
    lockableDurations: [],
  };
}
export const LockableDurationsInfo = {
  typeUrl: '/osmosis.incentives.LockableDurationsInfo',
  encode(
    message: LockableDurationsInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.lockableDurations) {
      Duration.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): LockableDurationsInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseLockableDurationsInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.lockableDurations.push(
            Duration.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): LockableDurationsInfo {
    return {
      lockableDurations: Array.isArray(object?.lockableDurations)
        ? object.lockableDurations.map((e: any) => Duration.fromJSON(e))
        : [],
    };
  },
  toJSON(message: LockableDurationsInfo): JsonSafe<LockableDurationsInfo> {
    const obj: any = {};
    if (message.lockableDurations) {
      obj.lockableDurations = message.lockableDurations.map(e =>
        e ? Duration.toJSON(e) : undefined,
      );
    } else {
      obj.lockableDurations = [];
    }
    return obj;
  },
  fromPartial(object: Partial<LockableDurationsInfo>): LockableDurationsInfo {
    const message = createBaseLockableDurationsInfo();
    message.lockableDurations =
      object.lockableDurations?.map(e => Duration.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: LockableDurationsInfoProtoMsg): LockableDurationsInfo {
    return LockableDurationsInfo.decode(message.value);
  },
  toProto(message: LockableDurationsInfo): Uint8Array {
    return LockableDurationsInfo.encode(message).finish();
  },
  toProtoMsg(message: LockableDurationsInfo): LockableDurationsInfoProtoMsg {
    return {
      typeUrl: '/osmosis.incentives.LockableDurationsInfo',
      value: LockableDurationsInfo.encode(message).finish(),
    };
  },
};
