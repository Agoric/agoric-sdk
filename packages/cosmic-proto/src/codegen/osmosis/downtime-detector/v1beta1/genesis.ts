//@ts-nocheck
import {
  Downtime,
  downtimeFromJSON,
  downtimeToJSON,
} from './downtime_duration.js';
import {
  Timestamp,
  TimestampSDKType,
} from '../../../google/protobuf/timestamp.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet, fromJsonTimestamp, fromTimestamp } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
export interface GenesisDowntimeEntry {
  duration: Downtime;
  lastDowntime: Timestamp;
}
export interface GenesisDowntimeEntryProtoMsg {
  typeUrl: '/osmosis.downtimedetector.v1beta1.GenesisDowntimeEntry';
  value: Uint8Array;
}
export interface GenesisDowntimeEntrySDKType {
  duration: Downtime;
  last_downtime: TimestampSDKType;
}
/** GenesisState defines the twap module's genesis state. */
export interface GenesisState {
  downtimes: GenesisDowntimeEntry[];
  lastBlockTime: Timestamp;
}
export interface GenesisStateProtoMsg {
  typeUrl: '/osmosis.downtimedetector.v1beta1.GenesisState';
  value: Uint8Array;
}
/** GenesisState defines the twap module's genesis state. */
export interface GenesisStateSDKType {
  downtimes: GenesisDowntimeEntrySDKType[];
  last_block_time: TimestampSDKType;
}
function createBaseGenesisDowntimeEntry(): GenesisDowntimeEntry {
  return {
    duration: 0,
    lastDowntime: Timestamp.fromPartial({}),
  };
}
export const GenesisDowntimeEntry = {
  typeUrl: '/osmosis.downtimedetector.v1beta1.GenesisDowntimeEntry',
  encode(
    message: GenesisDowntimeEntry,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.duration !== 0) {
      writer.uint32(8).int32(message.duration);
    }
    if (message.lastDowntime !== undefined) {
      Timestamp.encode(message.lastDowntime, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): GenesisDowntimeEntry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisDowntimeEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.duration = reader.int32() as any;
          break;
        case 2:
          message.lastDowntime = Timestamp.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GenesisDowntimeEntry {
    return {
      duration: isSet(object.duration) ? downtimeFromJSON(object.duration) : -1,
      lastDowntime: isSet(object.lastDowntime)
        ? fromJsonTimestamp(object.lastDowntime)
        : undefined,
    };
  },
  toJSON(message: GenesisDowntimeEntry): JsonSafe<GenesisDowntimeEntry> {
    const obj: any = {};
    message.duration !== undefined &&
      (obj.duration = downtimeToJSON(message.duration));
    message.lastDowntime !== undefined &&
      (obj.lastDowntime = fromTimestamp(message.lastDowntime).toISOString());
    return obj;
  },
  fromPartial(object: Partial<GenesisDowntimeEntry>): GenesisDowntimeEntry {
    const message = createBaseGenesisDowntimeEntry();
    message.duration = object.duration ?? 0;
    message.lastDowntime =
      object.lastDowntime !== undefined && object.lastDowntime !== null
        ? Timestamp.fromPartial(object.lastDowntime)
        : undefined;
    return message;
  },
  fromProtoMsg(message: GenesisDowntimeEntryProtoMsg): GenesisDowntimeEntry {
    return GenesisDowntimeEntry.decode(message.value);
  },
  toProto(message: GenesisDowntimeEntry): Uint8Array {
    return GenesisDowntimeEntry.encode(message).finish();
  },
  toProtoMsg(message: GenesisDowntimeEntry): GenesisDowntimeEntryProtoMsg {
    return {
      typeUrl: '/osmosis.downtimedetector.v1beta1.GenesisDowntimeEntry',
      value: GenesisDowntimeEntry.encode(message).finish(),
    };
  },
};
function createBaseGenesisState(): GenesisState {
  return {
    downtimes: [],
    lastBlockTime: Timestamp.fromPartial({}),
  };
}
export const GenesisState = {
  typeUrl: '/osmosis.downtimedetector.v1beta1.GenesisState',
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.downtimes) {
      GenesisDowntimeEntry.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.lastBlockTime !== undefined) {
      Timestamp.encode(
        message.lastBlockTime,
        writer.uint32(18).fork(),
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
          message.downtimes.push(
            GenesisDowntimeEntry.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.lastBlockTime = Timestamp.decode(reader, reader.uint32());
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
      downtimes: Array.isArray(object?.downtimes)
        ? object.downtimes.map((e: any) => GenesisDowntimeEntry.fromJSON(e))
        : [],
      lastBlockTime: isSet(object.lastBlockTime)
        ? fromJsonTimestamp(object.lastBlockTime)
        : undefined,
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    if (message.downtimes) {
      obj.downtimes = message.downtimes.map(e =>
        e ? GenesisDowntimeEntry.toJSON(e) : undefined,
      );
    } else {
      obj.downtimes = [];
    }
    message.lastBlockTime !== undefined &&
      (obj.lastBlockTime = fromTimestamp(message.lastBlockTime).toISOString());
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.downtimes =
      object.downtimes?.map(e => GenesisDowntimeEntry.fromPartial(e)) || [];
    message.lastBlockTime =
      object.lastBlockTime !== undefined && object.lastBlockTime !== null
        ? Timestamp.fromPartial(object.lastBlockTime)
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
      typeUrl: '/osmosis.downtimedetector.v1beta1.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
