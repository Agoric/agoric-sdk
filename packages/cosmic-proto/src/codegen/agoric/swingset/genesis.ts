//@ts-nocheck
import {
  Params,
  ParamsAmino,
  ParamsSDKType,
  State,
  StateAmino,
  StateSDKType,
} from './swingset.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
/** The initial or exported state. */
export interface GenesisState {
  params: Params;
  state: State;
  swingStoreExportData: SwingStoreExportDataEntry[];
}
export interface GenesisStateProtoMsg {
  typeUrl: '/agoric.swingset.GenesisState';
  value: Uint8Array;
}
/** The initial or exported state. */
export interface GenesisStateAmino {
  params?: ParamsAmino;
  state?: StateAmino;
  swing_store_export_data: SwingStoreExportDataEntryAmino[];
}
export interface GenesisStateAminoMsg {
  type: '/agoric.swingset.GenesisState';
  value: GenesisStateAmino;
}
/** The initial or exported state. */
export interface GenesisStateSDKType {
  params: ParamsSDKType;
  state: StateSDKType;
  swing_store_export_data: SwingStoreExportDataEntrySDKType[];
}
/** A SwingStore "export data" entry. */
export interface SwingStoreExportDataEntry {
  key: string;
  value: string;
}
export interface SwingStoreExportDataEntryProtoMsg {
  typeUrl: '/agoric.swingset.SwingStoreExportDataEntry';
  value: Uint8Array;
}
/** A SwingStore "export data" entry. */
export interface SwingStoreExportDataEntryAmino {
  key?: string;
  value?: string;
}
export interface SwingStoreExportDataEntryAminoMsg {
  type: '/agoric.swingset.SwingStoreExportDataEntry';
  value: SwingStoreExportDataEntryAmino;
}
/** A SwingStore "export data" entry. */
export interface SwingStoreExportDataEntrySDKType {
  key: string;
  value: string;
}
function createBaseGenesisState(): GenesisState {
  return {
    params: Params.fromPartial({}),
    state: State.fromPartial({}),
    swingStoreExportData: [],
  };
}
export const GenesisState = {
  typeUrl: '/agoric.swingset.GenesisState',
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(18).fork()).ldelim();
    }
    if (message.state !== undefined) {
      State.encode(message.state, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.swingStoreExportData) {
      SwingStoreExportDataEntry.encode(v!, writer.uint32(34).fork()).ldelim();
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
        case 2:
          message.params = Params.decode(reader, reader.uint32());
          break;
        case 3:
          message.state = State.decode(reader, reader.uint32());
          break;
        case 4:
          message.swingStoreExportData.push(
            SwingStoreExportDataEntry.decode(reader, reader.uint32()),
          );
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
      state: isSet(object.state) ? State.fromJSON(object.state) : undefined,
      swingStoreExportData: Array.isArray(object?.swingStoreExportData)
        ? object.swingStoreExportData.map((e: any) =>
            SwingStoreExportDataEntry.fromJSON(e),
          )
        : [],
    };
  },
  toJSON(message: GenesisState): unknown {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    message.state !== undefined &&
      (obj.state = message.state ? State.toJSON(message.state) : undefined);
    if (message.swingStoreExportData) {
      obj.swingStoreExportData = message.swingStoreExportData.map(e =>
        e ? SwingStoreExportDataEntry.toJSON(e) : undefined,
      );
    } else {
      obj.swingStoreExportData = [];
    }
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    message.state =
      object.state !== undefined && object.state !== null
        ? State.fromPartial(object.state)
        : undefined;
    message.swingStoreExportData =
      object.swingStoreExportData?.map(e =>
        SwingStoreExportDataEntry.fromPartial(e),
      ) || [];
    return message;
  },
  fromAmino(object: GenesisStateAmino): GenesisState {
    const message = createBaseGenesisState();
    if (object.params !== undefined && object.params !== null) {
      message.params = Params.fromAmino(object.params);
    }
    if (object.state !== undefined && object.state !== null) {
      message.state = State.fromAmino(object.state);
    }
    message.swingStoreExportData =
      object.swing_store_export_data?.map(e =>
        SwingStoreExportDataEntry.fromAmino(e),
      ) || [];
    return message;
  },
  toAmino(message: GenesisState): GenesisStateAmino {
    const obj: any = {};
    obj.params = message.params ? Params.toAmino(message.params) : undefined;
    obj.state = message.state ? State.toAmino(message.state) : undefined;
    if (message.swingStoreExportData) {
      obj.swing_store_export_data = message.swingStoreExportData.map(e =>
        e ? SwingStoreExportDataEntry.toAmino(e) : undefined,
      );
    } else {
      obj.swing_store_export_data = message.swingStoreExportData;
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
      typeUrl: '/agoric.swingset.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
function createBaseSwingStoreExportDataEntry(): SwingStoreExportDataEntry {
  return {
    key: '',
    value: '',
  };
}
export const SwingStoreExportDataEntry = {
  typeUrl: '/agoric.swingset.SwingStoreExportDataEntry',
  encode(
    message: SwingStoreExportDataEntry,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key !== '') {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== '') {
      writer.uint32(18).string(message.value);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): SwingStoreExportDataEntry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSwingStoreExportDataEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string();
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
  fromJSON(object: any): SwingStoreExportDataEntry {
    return {
      key: isSet(object.key) ? String(object.key) : '',
      value: isSet(object.value) ? String(object.value) : '',
    };
  },
  toJSON(message: SwingStoreExportDataEntry): unknown {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = message.value);
    return obj;
  },
  fromPartial(
    object: Partial<SwingStoreExportDataEntry>,
  ): SwingStoreExportDataEntry {
    const message = createBaseSwingStoreExportDataEntry();
    message.key = object.key ?? '';
    message.value = object.value ?? '';
    return message;
  },
  fromAmino(object: SwingStoreExportDataEntryAmino): SwingStoreExportDataEntry {
    const message = createBaseSwingStoreExportDataEntry();
    if (object.key !== undefined && object.key !== null) {
      message.key = object.key;
    }
    if (object.value !== undefined && object.value !== null) {
      message.value = object.value;
    }
    return message;
  },
  toAmino(message: SwingStoreExportDataEntry): SwingStoreExportDataEntryAmino {
    const obj: any = {};
    obj.key = message.key === '' ? undefined : message.key;
    obj.value = message.value === '' ? undefined : message.value;
    return obj;
  },
  fromAminoMsg(
    object: SwingStoreExportDataEntryAminoMsg,
  ): SwingStoreExportDataEntry {
    return SwingStoreExportDataEntry.fromAmino(object.value);
  },
  fromProtoMsg(
    message: SwingStoreExportDataEntryProtoMsg,
  ): SwingStoreExportDataEntry {
    return SwingStoreExportDataEntry.decode(message.value);
  },
  toProto(message: SwingStoreExportDataEntry): Uint8Array {
    return SwingStoreExportDataEntry.encode(message).finish();
  },
  toProtoMsg(
    message: SwingStoreExportDataEntry,
  ): SwingStoreExportDataEntryProtoMsg {
    return {
      typeUrl: '/agoric.swingset.SwingStoreExportDataEntry',
      value: SwingStoreExportDataEntry.encode(message).finish(),
    };
  },
};
