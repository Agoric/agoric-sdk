//@ts-nocheck
import {
  Duration,
  DurationSDKType,
} from '../../../google/protobuf/duration.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
export interface Params {
  /**
   * minted_denom is the denomination of the coin expected to be minted by the
   * minting module. Pool-incentives module doesn’t actually mint the coin
   * itself, but rather manages the distribution of coins that matches the
   * defined minted_denom.
   */
  mintedDenom: string;
}
export interface ParamsProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.Params';
  value: Uint8Array;
}
export interface ParamsSDKType {
  minted_denom: string;
}
export interface LockableDurationsInfo {
  lockableDurations: Duration[];
}
export interface LockableDurationsInfoProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.LockableDurationsInfo';
  value: Uint8Array;
}
export interface LockableDurationsInfoSDKType {
  lockable_durations: DurationSDKType[];
}
export interface DistrInfo {
  totalWeight: string;
  records: DistrRecord[];
}
export interface DistrInfoProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.DistrInfo';
  value: Uint8Array;
}
export interface DistrInfoSDKType {
  total_weight: string;
  records: DistrRecordSDKType[];
}
export interface DistrRecord {
  gaugeId: bigint;
  weight: string;
}
export interface DistrRecordProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.DistrRecord';
  value: Uint8Array;
}
export interface DistrRecordSDKType {
  gauge_id: bigint;
  weight: string;
}
export interface PoolToGauge {
  poolId: bigint;
  gaugeId: bigint;
  duration: Duration;
}
export interface PoolToGaugeProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.PoolToGauge';
  value: Uint8Array;
}
export interface PoolToGaugeSDKType {
  pool_id: bigint;
  gauge_id: bigint;
  duration: DurationSDKType;
}
export interface PoolToGauges {
  poolToGauge: PoolToGauge[];
}
export interface PoolToGaugesProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.PoolToGauges';
  value: Uint8Array;
}
export interface PoolToGaugesSDKType {
  pool_to_gauge: PoolToGaugeSDKType[];
}
function createBaseParams(): Params {
  return {
    mintedDenom: '',
  };
}
export const Params = {
  typeUrl: '/osmosis.poolincentives.v1beta1.Params',
  encode(
    message: Params,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.mintedDenom !== '') {
      writer.uint32(10).string(message.mintedDenom);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Params {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseParams();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.mintedDenom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Params {
    return {
      mintedDenom: isSet(object.mintedDenom) ? String(object.mintedDenom) : '',
    };
  },
  toJSON(message: Params): JsonSafe<Params> {
    const obj: any = {};
    message.mintedDenom !== undefined &&
      (obj.mintedDenom = message.mintedDenom);
    return obj;
  },
  fromPartial(object: Partial<Params>): Params {
    const message = createBaseParams();
    message.mintedDenom = object.mintedDenom ?? '';
    return message;
  },
  fromProtoMsg(message: ParamsProtoMsg): Params {
    return Params.decode(message.value);
  },
  toProto(message: Params): Uint8Array {
    return Params.encode(message).finish();
  },
  toProtoMsg(message: Params): ParamsProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.Params',
      value: Params.encode(message).finish(),
    };
  },
};
function createBaseLockableDurationsInfo(): LockableDurationsInfo {
  return {
    lockableDurations: [],
  };
}
export const LockableDurationsInfo = {
  typeUrl: '/osmosis.poolincentives.v1beta1.LockableDurationsInfo',
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
      typeUrl: '/osmosis.poolincentives.v1beta1.LockableDurationsInfo',
      value: LockableDurationsInfo.encode(message).finish(),
    };
  },
};
function createBaseDistrInfo(): DistrInfo {
  return {
    totalWeight: '',
    records: [],
  };
}
export const DistrInfo = {
  typeUrl: '/osmosis.poolincentives.v1beta1.DistrInfo',
  encode(
    message: DistrInfo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.totalWeight !== '') {
      writer.uint32(10).string(message.totalWeight);
    }
    for (const v of message.records) {
      DistrRecord.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): DistrInfo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDistrInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.totalWeight = reader.string();
          break;
        case 2:
          message.records.push(DistrRecord.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DistrInfo {
    return {
      totalWeight: isSet(object.totalWeight) ? String(object.totalWeight) : '',
      records: Array.isArray(object?.records)
        ? object.records.map((e: any) => DistrRecord.fromJSON(e))
        : [],
    };
  },
  toJSON(message: DistrInfo): JsonSafe<DistrInfo> {
    const obj: any = {};
    message.totalWeight !== undefined &&
      (obj.totalWeight = message.totalWeight);
    if (message.records) {
      obj.records = message.records.map(e =>
        e ? DistrRecord.toJSON(e) : undefined,
      );
    } else {
      obj.records = [];
    }
    return obj;
  },
  fromPartial(object: Partial<DistrInfo>): DistrInfo {
    const message = createBaseDistrInfo();
    message.totalWeight = object.totalWeight ?? '';
    message.records =
      object.records?.map(e => DistrRecord.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: DistrInfoProtoMsg): DistrInfo {
    return DistrInfo.decode(message.value);
  },
  toProto(message: DistrInfo): Uint8Array {
    return DistrInfo.encode(message).finish();
  },
  toProtoMsg(message: DistrInfo): DistrInfoProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.DistrInfo',
      value: DistrInfo.encode(message).finish(),
    };
  },
};
function createBaseDistrRecord(): DistrRecord {
  return {
    gaugeId: BigInt(0),
    weight: '',
  };
}
export const DistrRecord = {
  typeUrl: '/osmosis.poolincentives.v1beta1.DistrRecord',
  encode(
    message: DistrRecord,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.gaugeId !== BigInt(0)) {
      writer.uint32(8).uint64(message.gaugeId);
    }
    if (message.weight !== '') {
      writer.uint32(18).string(message.weight);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): DistrRecord {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDistrRecord();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.gaugeId = reader.uint64();
          break;
        case 2:
          message.weight = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DistrRecord {
    return {
      gaugeId: isSet(object.gaugeId)
        ? BigInt(object.gaugeId.toString())
        : BigInt(0),
      weight: isSet(object.weight) ? String(object.weight) : '',
    };
  },
  toJSON(message: DistrRecord): JsonSafe<DistrRecord> {
    const obj: any = {};
    message.gaugeId !== undefined &&
      (obj.gaugeId = (message.gaugeId || BigInt(0)).toString());
    message.weight !== undefined && (obj.weight = message.weight);
    return obj;
  },
  fromPartial(object: Partial<DistrRecord>): DistrRecord {
    const message = createBaseDistrRecord();
    message.gaugeId =
      object.gaugeId !== undefined && object.gaugeId !== null
        ? BigInt(object.gaugeId.toString())
        : BigInt(0);
    message.weight = object.weight ?? '';
    return message;
  },
  fromProtoMsg(message: DistrRecordProtoMsg): DistrRecord {
    return DistrRecord.decode(message.value);
  },
  toProto(message: DistrRecord): Uint8Array {
    return DistrRecord.encode(message).finish();
  },
  toProtoMsg(message: DistrRecord): DistrRecordProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.DistrRecord',
      value: DistrRecord.encode(message).finish(),
    };
  },
};
function createBasePoolToGauge(): PoolToGauge {
  return {
    poolId: BigInt(0),
    gaugeId: BigInt(0),
    duration: Duration.fromPartial({}),
  };
}
export const PoolToGauge = {
  typeUrl: '/osmosis.poolincentives.v1beta1.PoolToGauge',
  encode(
    message: PoolToGauge,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolId !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolId);
    }
    if (message.gaugeId !== BigInt(0)) {
      writer.uint32(16).uint64(message.gaugeId);
    }
    if (message.duration !== undefined) {
      Duration.encode(message.duration, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PoolToGauge {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePoolToGauge();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolId = reader.uint64();
          break;
        case 2:
          message.gaugeId = reader.uint64();
          break;
        case 3:
          message.duration = Duration.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PoolToGauge {
    return {
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      gaugeId: isSet(object.gaugeId)
        ? BigInt(object.gaugeId.toString())
        : BigInt(0),
      duration: isSet(object.duration)
        ? Duration.fromJSON(object.duration)
        : undefined,
    };
  },
  toJSON(message: PoolToGauge): JsonSafe<PoolToGauge> {
    const obj: any = {};
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.gaugeId !== undefined &&
      (obj.gaugeId = (message.gaugeId || BigInt(0)).toString());
    message.duration !== undefined &&
      (obj.duration = message.duration
        ? Duration.toJSON(message.duration)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<PoolToGauge>): PoolToGauge {
    const message = createBasePoolToGauge();
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.gaugeId =
      object.gaugeId !== undefined && object.gaugeId !== null
        ? BigInt(object.gaugeId.toString())
        : BigInt(0);
    message.duration =
      object.duration !== undefined && object.duration !== null
        ? Duration.fromPartial(object.duration)
        : undefined;
    return message;
  },
  fromProtoMsg(message: PoolToGaugeProtoMsg): PoolToGauge {
    return PoolToGauge.decode(message.value);
  },
  toProto(message: PoolToGauge): Uint8Array {
    return PoolToGauge.encode(message).finish();
  },
  toProtoMsg(message: PoolToGauge): PoolToGaugeProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.PoolToGauge',
      value: PoolToGauge.encode(message).finish(),
    };
  },
};
function createBasePoolToGauges(): PoolToGauges {
  return {
    poolToGauge: [],
  };
}
export const PoolToGauges = {
  typeUrl: '/osmosis.poolincentives.v1beta1.PoolToGauges',
  encode(
    message: PoolToGauges,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.poolToGauge) {
      PoolToGauge.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): PoolToGauges {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePoolToGauges();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 2:
          message.poolToGauge.push(PoolToGauge.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): PoolToGauges {
    return {
      poolToGauge: Array.isArray(object?.poolToGauge)
        ? object.poolToGauge.map((e: any) => PoolToGauge.fromJSON(e))
        : [],
    };
  },
  toJSON(message: PoolToGauges): JsonSafe<PoolToGauges> {
    const obj: any = {};
    if (message.poolToGauge) {
      obj.poolToGauge = message.poolToGauge.map(e =>
        e ? PoolToGauge.toJSON(e) : undefined,
      );
    } else {
      obj.poolToGauge = [];
    }
    return obj;
  },
  fromPartial(object: Partial<PoolToGauges>): PoolToGauges {
    const message = createBasePoolToGauges();
    message.poolToGauge =
      object.poolToGauge?.map(e => PoolToGauge.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: PoolToGaugesProtoMsg): PoolToGauges {
    return PoolToGauges.decode(message.value);
  },
  toProto(message: PoolToGauges): Uint8Array {
    return PoolToGauges.encode(message).finish();
  },
  toProtoMsg(message: PoolToGauges): PoolToGaugesProtoMsg {
    return {
      typeUrl: '/osmosis.poolincentives.v1beta1.PoolToGauges',
      value: PoolToGauges.encode(message).finish(),
    };
  },
};
