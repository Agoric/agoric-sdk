//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
/** The initial or exported state. */
export interface GenesisState {
  data: DataEntry[];
}
export interface GenesisStateProtoMsg {
  typeUrl: '/agoric.vstorage.GenesisState';
  value: Uint8Array;
}
/** The initial or exported state. */
export interface GenesisStateAmino {
  data: DataEntryAmino[];
}
export interface GenesisStateAminoMsg {
  type: '/agoric.vstorage.GenesisState';
  value: GenesisStateAmino;
}
/** The initial or exported state. */
export interface GenesisStateSDKType {
  data: DataEntrySDKType[];
}
/**
 * A vstorage entry.  The only necessary entries are those with data, as the
 * ancestor nodes are reconstructed on import.
 */
export interface DataEntry {
  /**
   * A "."-separated path with individual path elements matching
   * `[-_A-Za-z0-9]+`
   */
  path: string;
  value: string;
}
export interface DataEntryProtoMsg {
  typeUrl: '/agoric.vstorage.DataEntry';
  value: Uint8Array;
}
/**
 * A vstorage entry.  The only necessary entries are those with data, as the
 * ancestor nodes are reconstructed on import.
 */
export interface DataEntryAmino {
  /**
   * A "."-separated path with individual path elements matching
   * `[-_A-Za-z0-9]+`
   */
  path?: string;
  value?: string;
}
export interface DataEntryAminoMsg {
  type: '/agoric.vstorage.DataEntry';
  value: DataEntryAmino;
}
/**
 * A vstorage entry.  The only necessary entries are those with data, as the
 * ancestor nodes are reconstructed on import.
 */
export interface DataEntrySDKType {
  path: string;
  value: string;
}
function createBaseGenesisState(): GenesisState {
  return {
    data: [],
  };
}
export const GenesisState = {
  typeUrl: '/agoric.vstorage.GenesisState',
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.data) {
      DataEntry.encode(v!, writer.uint32(10).fork()).ldelim();
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
          message.data.push(DataEntry.decode(reader, reader.uint32()));
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
      data: Array.isArray(object?.data)
        ? object.data.map((e: any) => DataEntry.fromJSON(e))
        : [],
    };
  },
  toJSON(message: GenesisState): unknown {
    const obj: any = {};
    if (message.data) {
      obj.data = message.data.map(e => (e ? DataEntry.toJSON(e) : undefined));
    } else {
      obj.data = [];
    }
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.data = object.data?.map(e => DataEntry.fromPartial(e)) || [];
    return message;
  },
  fromAmino(object: GenesisStateAmino): GenesisState {
    const message = createBaseGenesisState();
    message.data = object.data?.map(e => DataEntry.fromAmino(e)) || [];
    return message;
  },
  toAmino(message: GenesisState): GenesisStateAmino {
    const obj: any = {};
    if (message.data) {
      obj.data = message.data.map(e => (e ? DataEntry.toAmino(e) : undefined));
    } else {
      obj.data = message.data;
    }
    return obj;
  },
  fromAminoMsg(object: GenesisStateAminoMsg): GenesisState {
    return GenesisState.fromAmino(object.value);
  },
  fromProtoMsg(message: GenesisStateProtoMsg): GenesisState {
    return GenesisState.decode(message.value);
  },
  toProto(message: GenesisState): Uint8Array {
    return GenesisState.encode(message).finish();
  },
  toProtoMsg(message: GenesisState): GenesisStateProtoMsg {
    return {
      typeUrl: '/agoric.vstorage.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
function createBaseDataEntry(): DataEntry {
  return {
    path: '',
    value: '',
  };
}
export const DataEntry = {
  typeUrl: '/agoric.vstorage.DataEntry',
  encode(
    message: DataEntry,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.path !== '') {
      writer.uint32(10).string(message.path);
    }
    if (message.value !== '') {
      writer.uint32(18).string(message.value);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): DataEntry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDataEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.path = reader.string();
          break;
        case 2:
          message.value = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DataEntry {
    return {
      path: isSet(object.path) ? String(object.path) : '',
      value: isSet(object.value) ? String(object.value) : '',
    };
  },
  toJSON(message: DataEntry): unknown {
    const obj: any = {};
    message.path !== undefined && (obj.path = message.path);
    message.value !== undefined && (obj.value = message.value);
    return obj;
  },
  fromPartial(object: Partial<DataEntry>): DataEntry {
    const message = createBaseDataEntry();
    message.path = object.path ?? '';
    message.value = object.value ?? '';
    return message;
  },
  fromAmino(object: DataEntryAmino): DataEntry {
    const message = createBaseDataEntry();
    if (object.path !== undefined && object.path !== null) {
      message.path = object.path;
    }
    if (object.value !== undefined && object.value !== null) {
      message.value = object.value;
    }
    return message;
  },
  toAmino(message: DataEntry): DataEntryAmino {
    const obj: any = {};
    obj.path = message.path === '' ? undefined : message.path;
    obj.value = message.value === '' ? undefined : message.value;
    return obj;
  },
  fromAminoMsg(object: DataEntryAminoMsg): DataEntry {
    return DataEntry.fromAmino(object.value);
  },
  fromProtoMsg(message: DataEntryProtoMsg): DataEntry {
    return DataEntry.decode(message.value);
  },
  toProto(message: DataEntry): Uint8Array {
    return DataEntry.encode(message).finish();
  },
  toProtoMsg(message: DataEntry): DataEntryProtoMsg {
    return {
      typeUrl: '/agoric.vstorage.DataEntry',
      value: DataEntry.encode(message).finish(),
    };
  },
};
