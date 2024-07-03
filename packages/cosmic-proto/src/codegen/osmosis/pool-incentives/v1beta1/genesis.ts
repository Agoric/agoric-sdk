//@ts-nocheck
import {
  Params,
  ParamsSDKType,
  DistrInfo,
  DistrInfoSDKType,
  PoolToGauges,
  PoolToGaugesSDKType,
} from './incentives.js';
import {
  Duration,
  DurationSDKType,
} from '../../../google/protobuf/duration.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/** GenesisState defines the pool incentives module's genesis state. */
export interface GenesisState {
  /** params defines all the paramaters of the module. */
  params: Params;
  lockableDurations: Duration[];
  distrInfo?: DistrInfo;
  poolToGauges?: PoolToGauges;
}
export interface GenesisStateProtoMsg {
  typeUrl: '/osmosis.poolincentives.v1beta1.GenesisState';
  value: Uint8Array;
}
/** GenesisState defines the pool incentives module's genesis state. */
export interface GenesisStateSDKType {
  params: ParamsSDKType;
  lockable_durations: DurationSDKType[];
  distr_info?: DistrInfoSDKType;
  pool_to_gauges?: PoolToGaugesSDKType;
}
function createBaseGenesisState(): GenesisState {
  return {
    params: Params.fromPartial({}),
    lockableDurations: [],
    distrInfo: undefined,
    poolToGauges: undefined,
  };
}
export const GenesisState = {
  typeUrl: '/osmosis.poolincentives.v1beta1.GenesisState',
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.lockableDurations) {
      Duration.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.distrInfo !== undefined) {
      DistrInfo.encode(message.distrInfo, writer.uint32(26).fork()).ldelim();
    }
    if (message.poolToGauges !== undefined) {
      PoolToGauges.encode(
        message.poolToGauges,
        writer.uint32(34).fork(),
      ).ldelim();
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
          message.lockableDurations.push(
            Duration.decode(reader, reader.uint32()),
          );
          break;
        case 3:
          message.distrInfo = DistrInfo.decode(reader, reader.uint32());
          break;
        case 4:
          message.poolToGauges = PoolToGauges.decode(reader, reader.uint32());
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
      lockableDurations: Array.isArray(object?.lockableDurations)
        ? object.lockableDurations.map((e: any) => Duration.fromJSON(e))
        : [],
      distrInfo: isSet(object.distrInfo)
        ? DistrInfo.fromJSON(object.distrInfo)
        : undefined,
      poolToGauges: isSet(object.poolToGauges)
        ? PoolToGauges.fromJSON(object.poolToGauges)
        : undefined,
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    if (message.lockableDurations) {
      obj.lockableDurations = message.lockableDurations.map(e =>
        e ? Duration.toJSON(e) : undefined,
      );
    } else {
      obj.lockableDurations = [];
    }
    message.distrInfo !== undefined &&
      (obj.distrInfo = message.distrInfo
        ? DistrInfo.toJSON(message.distrInfo)
        : undefined);
    message.poolToGauges !== undefined &&
      (obj.poolToGauges = message.poolToGauges
        ? PoolToGauges.toJSON(message.poolToGauges)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    message.lockableDurations =
      object.lockableDurations?.map(e => Duration.fromPartial(e)) || [];
    message.distrInfo =
      object.distrInfo !== undefined && object.distrInfo !== null
        ? DistrInfo.fromPartial(object.distrInfo)
        : undefined;
    message.poolToGauges =
      object.poolToGauges !== undefined && object.poolToGauges !== null
        ? PoolToGauges.fromPartial(object.poolToGauges)
        : undefined;
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
      typeUrl: '/osmosis.poolincentives.v1beta1.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
