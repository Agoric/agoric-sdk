//@ts-nocheck
import { Params, ParamsSDKType } from './params.js';
import { Gauge, GaugeSDKType } from './gauge.js';
import { Duration, DurationSDKType } from '../../google/protobuf/duration.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { JsonSafe } from '../../json-safe.js';
/**
 * GenesisState defines the incentives module's various parameters when first
 * initialized
 */
export interface GenesisState {
  /** params are all the parameters of the module */
  params: Params;
  /** gauges are all gauges that should exist at genesis */
  gauges: Gauge[];
  /**
   * lockable_durations are all lockup durations that gauges can be locked for
   * in order to recieve incentives
   */
  lockableDurations: Duration[];
  /**
   * last_gauge_id is what the gauge number will increment from when creating
   * the next gauge after genesis
   */
  lastGaugeId: bigint;
}
export interface GenesisStateProtoMsg {
  typeUrl: '/osmosis.incentives.GenesisState';
  value: Uint8Array;
}
/**
 * GenesisState defines the incentives module's various parameters when first
 * initialized
 */
export interface GenesisStateSDKType {
  params: ParamsSDKType;
  gauges: GaugeSDKType[];
  lockable_durations: DurationSDKType[];
  last_gauge_id: bigint;
}
function createBaseGenesisState(): GenesisState {
  return {
    params: Params.fromPartial({}),
    gauges: [],
    lockableDurations: [],
    lastGaugeId: BigInt(0),
  };
}
export const GenesisState = {
  typeUrl: '/osmosis.incentives.GenesisState',
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.gauges) {
      Gauge.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    for (const v of message.lockableDurations) {
      Duration.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    if (message.lastGaugeId !== BigInt(0)) {
      writer.uint32(32).uint64(message.lastGaugeId);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): GenesisState {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisState();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.params = Params.decode(reader, reader.uint32());
          break;
        case 2:
          message.gauges.push(Gauge.decode(reader, reader.uint32()));
          break;
        case 3:
          message.lockableDurations.push(
            Duration.decode(reader, reader.uint32()),
          );
          break;
        case 4:
          message.lastGaugeId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GenesisState {
    return {
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
      gauges: Array.isArray(object?.gauges)
        ? object.gauges.map((e: any) => Gauge.fromJSON(e))
        : [],
      lockableDurations: Array.isArray(object?.lockableDurations)
        ? object.lockableDurations.map((e: any) => Duration.fromJSON(e))
        : [],
      lastGaugeId: isSet(object.lastGaugeId)
        ? BigInt(object.lastGaugeId.toString())
        : BigInt(0),
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    if (message.gauges) {
      obj.gauges = message.gauges.map(e => (e ? Gauge.toJSON(e) : undefined));
    } else {
      obj.gauges = [];
    }
    if (message.lockableDurations) {
      obj.lockableDurations = message.lockableDurations.map(e =>
        e ? Duration.toJSON(e) : undefined,
      );
    } else {
      obj.lockableDurations = [];
    }
    message.lastGaugeId !== undefined &&
      (obj.lastGaugeId = (message.lastGaugeId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    message.gauges = object.gauges?.map(e => Gauge.fromPartial(e)) || [];
    message.lockableDurations =
      object.lockableDurations?.map(e => Duration.fromPartial(e)) || [];
    message.lastGaugeId =
      object.lastGaugeId !== undefined && object.lastGaugeId !== null
        ? BigInt(object.lastGaugeId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: GenesisStateProtoMsg): GenesisState {
    return GenesisState.decode(message.value);
  },
  toProto(message: GenesisState): Uint8Array {
    return GenesisState.encode(message).finish();
  },
  toProtoMsg(message: GenesisState): GenesisStateProtoMsg {
    return {
      typeUrl: '/osmosis.incentives.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
