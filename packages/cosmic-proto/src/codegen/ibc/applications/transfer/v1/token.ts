//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * Token defines a struct which represents a token to be transferred.
 * @name Token
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Token
 */
export interface Token {
  /**
   * the token denomination
   */
  denom: Denom;
  /**
   * the token amount to be transferred
   */
  amount: string;
}
export interface TokenProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.Token';
  value: Uint8Array;
}
/**
 * Token defines a struct which represents a token to be transferred.
 * @name TokenSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Token
 */
export interface TokenSDKType {
  denom: DenomSDKType;
  amount: string;
}
/**
 * Denom holds the base denom of a Token and a trace of the chains it was sent through.
 * @name Denom
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Denom
 */
export interface Denom {
  /**
   * the base token denomination
   */
  base: string;
  /**
   * the trace of the token
   */
  trace: Hop[];
}
export interface DenomProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.Denom';
  value: Uint8Array;
}
/**
 * Denom holds the base denom of a Token and a trace of the chains it was sent through.
 * @name DenomSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Denom
 */
export interface DenomSDKType {
  base: string;
  trace: HopSDKType[];
}
/**
 * Hop defines a port ID, channel ID pair specifying a unique "hop" in a trace
 * @name Hop
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Hop
 */
export interface Hop {
  portId: string;
  channelId: string;
}
export interface HopProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.Hop';
  value: Uint8Array;
}
/**
 * Hop defines a port ID, channel ID pair specifying a unique "hop" in a trace
 * @name HopSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Hop
 */
export interface HopSDKType {
  port_id: string;
  channel_id: string;
}
function createBaseToken(): Token {
  return {
    denom: Denom.fromPartial({}),
    amount: '',
  };
}
/**
 * Token defines a struct which represents a token to be transferred.
 * @name Token
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Token
 */
export const Token = {
  typeUrl: '/ibc.applications.transfer.v1.Token' as const,
  aminoType: 'cosmos-sdk/Token' as const,
  is(o: any): o is Token {
    return (
      o &&
      (o.$typeUrl === Token.typeUrl ||
        (Denom.is(o.denom) && typeof o.amount === 'string'))
    );
  },
  isSDK(o: any): o is TokenSDKType {
    return (
      o &&
      (o.$typeUrl === Token.typeUrl ||
        (Denom.isSDK(o.denom) && typeof o.amount === 'string'))
    );
  },
  encode(
    message: Token,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== undefined) {
      Denom.encode(message.denom, writer.uint32(10).fork()).ldelim();
    }
    if (message.amount !== '') {
      writer.uint32(18).string(message.amount);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Token {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseToken();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = Denom.decode(reader, reader.uint32());
          break;
        case 2:
          message.amount = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Token {
    return {
      denom: isSet(object.denom) ? Denom.fromJSON(object.denom) : undefined,
      amount: isSet(object.amount) ? String(object.amount) : '',
    };
  },
  toJSON(message: Token): JsonSafe<Token> {
    const obj: any = {};
    message.denom !== undefined &&
      (obj.denom = message.denom ? Denom.toJSON(message.denom) : undefined);
    message.amount !== undefined && (obj.amount = message.amount);
    return obj;
  },
  fromPartial(object: Partial<Token>): Token {
    const message = createBaseToken();
    message.denom =
      object.denom !== undefined && object.denom !== null
        ? Denom.fromPartial(object.denom)
        : undefined;
    message.amount = object.amount ?? '';
    return message;
  },
  fromProtoMsg(message: TokenProtoMsg): Token {
    return Token.decode(message.value);
  },
  toProto(message: Token): Uint8Array {
    return Token.encode(message).finish();
  },
  toProtoMsg(message: Token): TokenProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.Token',
      value: Token.encode(message).finish(),
    };
  },
};
function createBaseDenom(): Denom {
  return {
    base: '',
    trace: [],
  };
}
/**
 * Denom holds the base denom of a Token and a trace of the chains it was sent through.
 * @name Denom
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Denom
 */
export const Denom = {
  typeUrl: '/ibc.applications.transfer.v1.Denom' as const,
  aminoType: 'cosmos-sdk/Denom' as const,
  is(o: any): o is Denom {
    return (
      o &&
      (o.$typeUrl === Denom.typeUrl ||
        (typeof o.base === 'string' &&
          Array.isArray(o.trace) &&
          (!o.trace.length || Hop.is(o.trace[0]))))
    );
  },
  isSDK(o: any): o is DenomSDKType {
    return (
      o &&
      (o.$typeUrl === Denom.typeUrl ||
        (typeof o.base === 'string' &&
          Array.isArray(o.trace) &&
          (!o.trace.length || Hop.isSDK(o.trace[0]))))
    );
  },
  encode(
    message: Denom,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.base !== '') {
      writer.uint32(10).string(message.base);
    }
    for (const v of message.trace) {
      Hop.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Denom {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDenom();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.base = reader.string();
          break;
        case 3:
          message.trace.push(Hop.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Denom {
    return {
      base: isSet(object.base) ? String(object.base) : '',
      trace: Array.isArray(object?.trace)
        ? object.trace.map((e: any) => Hop.fromJSON(e))
        : [],
    };
  },
  toJSON(message: Denom): JsonSafe<Denom> {
    const obj: any = {};
    message.base !== undefined && (obj.base = message.base);
    if (message.trace) {
      obj.trace = message.trace.map(e => (e ? Hop.toJSON(e) : undefined));
    } else {
      obj.trace = [];
    }
    return obj;
  },
  fromPartial(object: Partial<Denom>): Denom {
    const message = createBaseDenom();
    message.base = object.base ?? '';
    message.trace = object.trace?.map(e => Hop.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: DenomProtoMsg): Denom {
    return Denom.decode(message.value);
  },
  toProto(message: Denom): Uint8Array {
    return Denom.encode(message).finish();
  },
  toProtoMsg(message: Denom): DenomProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.Denom',
      value: Denom.encode(message).finish(),
    };
  },
};
function createBaseHop(): Hop {
  return {
    portId: '',
    channelId: '',
  };
}
/**
 * Hop defines a port ID, channel ID pair specifying a unique "hop" in a trace
 * @name Hop
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.Hop
 */
export const Hop = {
  typeUrl: '/ibc.applications.transfer.v1.Hop' as const,
  aminoType: 'cosmos-sdk/Hop' as const,
  is(o: any): o is Hop {
    return (
      o &&
      (o.$typeUrl === Hop.typeUrl ||
        (typeof o.portId === 'string' && typeof o.channelId === 'string'))
    );
  },
  isSDK(o: any): o is HopSDKType {
    return (
      o &&
      (o.$typeUrl === Hop.typeUrl ||
        (typeof o.port_id === 'string' && typeof o.channel_id === 'string'))
    );
  },
  encode(
    message: Hop,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Hop {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseHop();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.portId = reader.string();
          break;
        case 2:
          message.channelId = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Hop {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
    };
  },
  toJSON(message: Hop): JsonSafe<Hop> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    return obj;
  },
  fromPartial(object: Partial<Hop>): Hop {
    const message = createBaseHop();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    return message;
  },
  fromProtoMsg(message: HopProtoMsg): Hop {
    return Hop.decode(message.value);
  },
  toProto(message: Hop): Uint8Array {
    return Hop.encode(message).finish();
  },
  toProtoMsg(message: Hop): HopProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.Hop',
      value: Hop.encode(message).finish(),
    };
  },
};
