//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../../binary.js';
import { type JsonSafe } from '../../../../../json-safe.js';
import { isSet } from '../../../../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/** Pairs defines a repeated slice of Pair objects. */
export interface Pairs {
  pairs: Pair[];
}
export interface PairsProtoMsg {
  typeUrl: '/cosmos.store.internal.kv.v1beta1.Pairs';
  value: Uint8Array;
}
/** Pairs defines a repeated slice of Pair objects. */
export interface PairsSDKType {
  pairs: PairSDKType[];
}
/** Pair defines a key/value bytes tuple. */
export interface Pair {
  key: Uint8Array;
  value: Uint8Array;
}
export interface PairProtoMsg {
  typeUrl: '/cosmos.store.internal.kv.v1beta1.Pair';
  value: Uint8Array;
}
/** Pair defines a key/value bytes tuple. */
export interface PairSDKType {
  key: Uint8Array;
  value: Uint8Array;
}
function createBasePairs(): Pairs {
  return {
    pairs: [],
  };
}
export const Pairs = {
  typeUrl: '/cosmos.store.internal.kv.v1beta1.Pairs',
  encode(
    message: Pairs,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.pairs) {
      Pair.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Pairs {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePairs();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pairs.push(Pair.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Pairs {
    return {
      pairs: Array.isArray(object?.pairs)
        ? object.pairs.map((e: any) => Pair.fromJSON(e))
        : [],
    };
  },
  toJSON(message: Pairs): JsonSafe<Pairs> {
    const obj: any = {};
    if (message.pairs) {
      obj.pairs = message.pairs.map(e => (e ? Pair.toJSON(e) : undefined));
    } else {
      obj.pairs = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Pairs>): Pairs {
    const message = createBasePairs();
    message.pairs = object.pairs?.map(e => Pair.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: PairsProtoMsg): Pairs {
    return Pairs.decode(message.value);
  },
  toProto(message: Pairs): Uint8Array {
    return Pairs.encode(message).finish();
  },
  toProtoMsg(message: Pairs): PairsProtoMsg {
    return {
      typeUrl: '/cosmos.store.internal.kv.v1beta1.Pairs',
      value: Pairs.encode(message).finish(),
    };
  },
};
function createBasePair(): Pair {
  return {
    key: new Uint8Array(),
    value: new Uint8Array(),
  };
}
export const Pair = {
  typeUrl: '/cosmos.store.internal.kv.v1beta1.Pair',
  encode(
    message: Pair,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key.length !== 0) {
      writer.uint32(10).bytes(message.key);
    }
    if (message.value.length !== 0) {
      writer.uint32(18).bytes(message.value);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Pair {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePair();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.bytes();
          break;
        case 2:
          message.value = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Pair {
    return {
      key: isSet(object.key) ? bytesFromBase64(object.key) : new Uint8Array(),
      value: isSet(object.value)
        ? bytesFromBase64(object.value)
        : new Uint8Array(),
    };
  },
  toJSON(message: Pair): JsonSafe<Pair> {
    const obj: any = {};
    message.key !== undefined &&
      (obj.key = base64FromBytes(
        message.key !== undefined ? message.key : new Uint8Array(),
      ));
    message.value !== undefined &&
      (obj.value = base64FromBytes(
        message.value !== undefined ? message.value : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<Pair>): Pair {
    const message = createBasePair();
    message.key = object.key ?? new Uint8Array();
    message.value = object.value ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: PairProtoMsg): Pair {
    return Pair.decode(message.value);
  },
  toProto(message: Pair): Uint8Array {
    return Pair.encode(message).finish();
  },
  toProtoMsg(message: Pair): PairProtoMsg {
    return {
      typeUrl: '/cosmos.store.internal.kv.v1beta1.Pair',
      value: Pair.encode(message).finish(),
    };
  },
};
