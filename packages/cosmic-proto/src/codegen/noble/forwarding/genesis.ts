//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet, isObject } from '../../helpers.js';
import { type JsonSafe } from '../../json-safe.js';
export interface GenesisState_NumOfAccountsEntry {
  key: string;
  value: bigint;
}
export interface GenesisState_NumOfAccountsEntryProtoMsg {
  typeUrl: string;
  value: Uint8Array;
}
export interface GenesisState_NumOfAccountsEntrySDKType {
  key: string;
  value: bigint;
}
export interface GenesisState_NumOfForwardsEntry {
  key: string;
  value: bigint;
}
export interface GenesisState_NumOfForwardsEntryProtoMsg {
  typeUrl: string;
  value: Uint8Array;
}
export interface GenesisState_NumOfForwardsEntrySDKType {
  key: string;
  value: bigint;
}
export interface GenesisState_TotalForwardedEntry {
  key: string;
  value: string;
}
export interface GenesisState_TotalForwardedEntryProtoMsg {
  typeUrl: string;
  value: Uint8Array;
}
export interface GenesisState_TotalForwardedEntrySDKType {
  key: string;
  value: string;
}
export interface GenesisState {
  allowedDenoms: string[];
  numOfAccounts: {
    [key: string]: bigint;
  };
  numOfForwards: {
    [key: string]: bigint;
  };
  totalForwarded: {
    [key: string]: string;
  };
}
export interface GenesisStateProtoMsg {
  typeUrl: '/noble.forwarding.v1.GenesisState';
  value: Uint8Array;
}
export interface GenesisStateSDKType {
  allowed_denoms: string[];
  num_of_accounts: {
    [key: string]: bigint;
  };
  num_of_forwards: {
    [key: string]: bigint;
  };
  total_forwarded: {
    [key: string]: string;
  };
}
function createBaseGenesisState_NumOfAccountsEntry(): GenesisState_NumOfAccountsEntry {
  return {
    key: '',
    value: BigInt(0),
  };
}
export const GenesisState_NumOfAccountsEntry = {
  encode(
    message: GenesisState_NumOfAccountsEntry,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key !== '') {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== BigInt(0)) {
      writer.uint32(16).uint64(message.value);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): GenesisState_NumOfAccountsEntry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisState_NumOfAccountsEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string();
          break;
        case 2:
          message.value = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GenesisState_NumOfAccountsEntry {
    return {
      key: isSet(object.key) ? String(object.key) : '',
      value: isSet(object.value) ? BigInt(object.value.toString()) : BigInt(0),
    };
  },
  toJSON(
    message: GenesisState_NumOfAccountsEntry,
  ): JsonSafe<GenesisState_NumOfAccountsEntry> {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined &&
      (obj.value = (message.value || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<GenesisState_NumOfAccountsEntry>,
  ): GenesisState_NumOfAccountsEntry {
    const message = createBaseGenesisState_NumOfAccountsEntry();
    message.key = object.key ?? '';
    message.value =
      object.value !== undefined && object.value !== null
        ? BigInt(object.value.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: GenesisState_NumOfAccountsEntryProtoMsg,
  ): GenesisState_NumOfAccountsEntry {
    return GenesisState_NumOfAccountsEntry.decode(message.value);
  },
  toProto(message: GenesisState_NumOfAccountsEntry): Uint8Array {
    return GenesisState_NumOfAccountsEntry.encode(message).finish();
  },
};
function createBaseGenesisState_NumOfForwardsEntry(): GenesisState_NumOfForwardsEntry {
  return {
    key: '',
    value: BigInt(0),
  };
}
export const GenesisState_NumOfForwardsEntry = {
  encode(
    message: GenesisState_NumOfForwardsEntry,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key !== '') {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== BigInt(0)) {
      writer.uint32(16).uint64(message.value);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): GenesisState_NumOfForwardsEntry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisState_NumOfForwardsEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.string();
          break;
        case 2:
          message.value = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GenesisState_NumOfForwardsEntry {
    return {
      key: isSet(object.key) ? String(object.key) : '',
      value: isSet(object.value) ? BigInt(object.value.toString()) : BigInt(0),
    };
  },
  toJSON(
    message: GenesisState_NumOfForwardsEntry,
  ): JsonSafe<GenesisState_NumOfForwardsEntry> {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined &&
      (obj.value = (message.value || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<GenesisState_NumOfForwardsEntry>,
  ): GenesisState_NumOfForwardsEntry {
    const message = createBaseGenesisState_NumOfForwardsEntry();
    message.key = object.key ?? '';
    message.value =
      object.value !== undefined && object.value !== null
        ? BigInt(object.value.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: GenesisState_NumOfForwardsEntryProtoMsg,
  ): GenesisState_NumOfForwardsEntry {
    return GenesisState_NumOfForwardsEntry.decode(message.value);
  },
  toProto(message: GenesisState_NumOfForwardsEntry): Uint8Array {
    return GenesisState_NumOfForwardsEntry.encode(message).finish();
  },
};
function createBaseGenesisState_TotalForwardedEntry(): GenesisState_TotalForwardedEntry {
  return {
    key: '',
    value: '',
  };
}
export const GenesisState_TotalForwardedEntry = {
  encode(
    message: GenesisState_TotalForwardedEntry,
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
  ): GenesisState_TotalForwardedEntry {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGenesisState_TotalForwardedEntry();
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
  fromJSON(object: any): GenesisState_TotalForwardedEntry {
    return {
      key: isSet(object.key) ? String(object.key) : '',
      value: isSet(object.value) ? String(object.value) : '',
    };
  },
  toJSON(
    message: GenesisState_TotalForwardedEntry,
  ): JsonSafe<GenesisState_TotalForwardedEntry> {
    const obj: any = {};
    message.key !== undefined && (obj.key = message.key);
    message.value !== undefined && (obj.value = message.value);
    return obj;
  },
  fromPartial(
    object: Partial<GenesisState_TotalForwardedEntry>,
  ): GenesisState_TotalForwardedEntry {
    const message = createBaseGenesisState_TotalForwardedEntry();
    message.key = object.key ?? '';
    message.value = object.value ?? '';
    return message;
  },
  fromProtoMsg(
    message: GenesisState_TotalForwardedEntryProtoMsg,
  ): GenesisState_TotalForwardedEntry {
    return GenesisState_TotalForwardedEntry.decode(message.value);
  },
  toProto(message: GenesisState_TotalForwardedEntry): Uint8Array {
    return GenesisState_TotalForwardedEntry.encode(message).finish();
  },
};
function createBaseGenesisState(): GenesisState {
  return {
    allowedDenoms: [],
    numOfAccounts: {},
    numOfForwards: {},
    totalForwarded: {},
  };
}
export const GenesisState = {
  typeUrl: '/noble.forwarding.v1.GenesisState' as const,
  encode(
    message: GenesisState,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.allowedDenoms) {
      writer.uint32(10).string(v!);
    }
    Object.entries(message.numOfAccounts).forEach(([key, value]) => {
      GenesisState_NumOfAccountsEntry.encode(
        {
          key: key as any,
          value,
        },
        writer.uint32(16).fork(),
      ).ldelim();
    });
    Object.entries(message.numOfForwards).forEach(([key, value]) => {
      GenesisState_NumOfForwardsEntry.encode(
        {
          key: key as any,
          value,
        },
        writer.uint32(24).fork(),
      ).ldelim();
    });
    Object.entries(message.totalForwarded).forEach(([key, value]) => {
      GenesisState_TotalForwardedEntry.encode(
        {
          key: key as any,
          value,
        },
        writer.uint32(34).fork(),
      ).ldelim();
    });
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
          message.allowedDenoms.push(reader.string());
          break;
        case 2:
          const entry2 = GenesisState_NumOfAccountsEntry.decode(
            reader,
            reader.uint32(),
          );
          if (entry2.value !== undefined) {
            message.numOfAccounts[entry2.key] = entry2.value;
          }
          break;
        case 3:
          const entry3 = GenesisState_NumOfForwardsEntry.decode(
            reader,
            reader.uint32(),
          );
          if (entry3.value !== undefined) {
            message.numOfForwards[entry3.key] = entry3.value;
          }
          break;
        case 4:
          const entry4 = GenesisState_TotalForwardedEntry.decode(
            reader,
            reader.uint32(),
          );
          if (entry4.value !== undefined) {
            message.totalForwarded[entry4.key] = entry4.value;
          }
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
      allowedDenoms: Array.isArray(object?.allowedDenoms)
        ? object.allowedDenoms.map((e: any) => String(e))
        : [],
      numOfAccounts: isObject(object.numOfAccounts)
        ? Object.entries(object.numOfAccounts).reduce<{
            [key: string]: bigint;
          }>((acc, [key, value]) => {
            acc[key] = BigInt((value as bigint | string).toString());
            return acc;
          }, {})
        : {},
      numOfForwards: isObject(object.numOfForwards)
        ? Object.entries(object.numOfForwards).reduce<{
            [key: string]: bigint;
          }>((acc, [key, value]) => {
            acc[key] = BigInt((value as bigint | string).toString());
            return acc;
          }, {})
        : {},
      totalForwarded: isObject(object.totalForwarded)
        ? Object.entries(object.totalForwarded).reduce<{
            [key: string]: string;
          }>((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {})
        : {},
    };
  },
  toJSON(message: GenesisState): JsonSafe<GenesisState> {
    const obj: any = {};
    if (message.allowedDenoms) {
      obj.allowedDenoms = message.allowedDenoms.map(e => e);
    } else {
      obj.allowedDenoms = [];
    }
    obj.numOfAccounts = {};
    if (message.numOfAccounts) {
      Object.entries(message.numOfAccounts).forEach(([k, v]) => {
        obj.numOfAccounts[k] = v.toString();
      });
    }
    obj.numOfForwards = {};
    if (message.numOfForwards) {
      Object.entries(message.numOfForwards).forEach(([k, v]) => {
        obj.numOfForwards[k] = v.toString();
      });
    }
    obj.totalForwarded = {};
    if (message.totalForwarded) {
      Object.entries(message.totalForwarded).forEach(([k, v]) => {
        obj.totalForwarded[k] = v;
      });
    }
    return obj;
  },
  fromPartial(object: Partial<GenesisState>): GenesisState {
    const message = createBaseGenesisState();
    message.allowedDenoms = object.allowedDenoms?.map(e => e) || [];
    message.numOfAccounts = Object.entries(object.numOfAccounts ?? {}).reduce<{
      [key: string]: bigint;
    }>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = BigInt(value.toString());
      }
      return acc;
    }, {});
    message.numOfForwards = Object.entries(object.numOfForwards ?? {}).reduce<{
      [key: string]: bigint;
    }>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = BigInt(value.toString());
      }
      return acc;
    }, {});
    message.totalForwarded = Object.entries(
      object.totalForwarded ?? {},
    ).reduce<{
      [key: string]: string;
    }>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {});
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
      typeUrl: '/noble.forwarding.v1.GenesisState',
      value: GenesisState.encode(message).finish(),
    };
  },
};
