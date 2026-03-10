//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
import { Decimal } from '../../../decimals.js';
/**
 * Coin defines a token with a denomination and an amount.
 *
 * NOTE: The amount field is an Int which implements the custom method
 * signatures required by gogoproto.
 * @name Coin
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.Coin
 */
export interface Coin {
  denom: string;
  amount: string;
}
export interface CoinProtoMsg {
  typeUrl: '/cosmos.base.v1beta1.Coin';
  value: Uint8Array;
}
/**
 * Coin defines a token with a denomination and an amount.
 *
 * NOTE: The amount field is an Int which implements the custom method
 * signatures required by gogoproto.
 * @name CoinSDKType
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.Coin
 */
export interface CoinSDKType {
  denom: string;
  amount: string;
}
/**
 * DecCoin defines a token with a denomination and a decimal amount.
 *
 * NOTE: The amount field is an Dec which implements the custom method
 * signatures required by gogoproto.
 * @name DecCoin
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.DecCoin
 */
export interface DecCoin {
  denom: string;
  amount: string;
}
export interface DecCoinProtoMsg {
  typeUrl: '/cosmos.base.v1beta1.DecCoin';
  value: Uint8Array;
}
/**
 * DecCoin defines a token with a denomination and a decimal amount.
 *
 * NOTE: The amount field is an Dec which implements the custom method
 * signatures required by gogoproto.
 * @name DecCoinSDKType
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.DecCoin
 */
export interface DecCoinSDKType {
  denom: string;
  amount: string;
}
/**
 * IntProto defines a Protobuf wrapper around an Int object.
 * Deprecated: Prefer to use math.Int directly. It supports binary Marshal and Unmarshal.
 * @name IntProto
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.IntProto
 */
export interface IntProto {
  int: string;
}
export interface IntProtoProtoMsg {
  typeUrl: '/cosmos.base.v1beta1.IntProto';
  value: Uint8Array;
}
/**
 * IntProto defines a Protobuf wrapper around an Int object.
 * Deprecated: Prefer to use math.Int directly. It supports binary Marshal and Unmarshal.
 * @name IntProtoSDKType
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.IntProto
 */
export interface IntProtoSDKType {
  int: string;
}
/**
 * DecProto defines a Protobuf wrapper around a Dec object.
 * Deprecated: Prefer to use math.LegacyDec directly. It supports binary Marshal and Unmarshal.
 * @name DecProto
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.DecProto
 */
export interface DecProto {
  dec: string;
}
export interface DecProtoProtoMsg {
  typeUrl: '/cosmos.base.v1beta1.DecProto';
  value: Uint8Array;
}
/**
 * DecProto defines a Protobuf wrapper around a Dec object.
 * Deprecated: Prefer to use math.LegacyDec directly. It supports binary Marshal and Unmarshal.
 * @name DecProtoSDKType
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.DecProto
 */
export interface DecProtoSDKType {
  dec: string;
}
function createBaseCoin(): Coin {
  return {
    denom: '',
    amount: '',
  };
}
/**
 * Coin defines a token with a denomination and an amount.
 *
 * NOTE: The amount field is an Int which implements the custom method
 * signatures required by gogoproto.
 * @name Coin
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.Coin
 */
export const Coin = {
  typeUrl: '/cosmos.base.v1beta1.Coin' as const,
  aminoType: 'cosmos-sdk/Coin' as const,
  is(o: any): o is Coin {
    return (
      o &&
      (o.$typeUrl === Coin.typeUrl ||
        (typeof o.denom === 'string' && typeof o.amount === 'string'))
    );
  },
  isSDK(o: any): o is CoinSDKType {
    return (
      o &&
      (o.$typeUrl === Coin.typeUrl ||
        (typeof o.denom === 'string' && typeof o.amount === 'string'))
    );
  },
  encode(
    message: Coin,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== '') {
      writer.uint32(10).string(message.denom);
    }
    if (message.amount !== '') {
      writer.uint32(18).string(message.amount);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Coin {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCoin();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
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
  fromJSON(object: any): Coin {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
      amount: isSet(object.amount) ? String(object.amount) : '',
    };
  },
  toJSON(message: Coin): JsonSafe<Coin> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    message.amount !== undefined && (obj.amount = message.amount);
    return obj;
  },
  fromPartial(object: Partial<Coin>): Coin {
    const message = createBaseCoin();
    message.denom = object.denom ?? '';
    message.amount = object.amount ?? '';
    return message;
  },
  fromProtoMsg(message: CoinProtoMsg): Coin {
    return Coin.decode(message.value);
  },
  toProto(message: Coin): Uint8Array {
    return Coin.encode(message).finish();
  },
  toProtoMsg(message: Coin): CoinProtoMsg {
    return {
      typeUrl: '/cosmos.base.v1beta1.Coin',
      value: Coin.encode(message).finish(),
    };
  },
};
function createBaseDecCoin(): DecCoin {
  return {
    denom: '',
    amount: '',
  };
}
/**
 * DecCoin defines a token with a denomination and a decimal amount.
 *
 * NOTE: The amount field is an Dec which implements the custom method
 * signatures required by gogoproto.
 * @name DecCoin
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.DecCoin
 */
export const DecCoin = {
  typeUrl: '/cosmos.base.v1beta1.DecCoin' as const,
  aminoType: 'cosmos-sdk/DecCoin' as const,
  is(o: any): o is DecCoin {
    return (
      o &&
      (o.$typeUrl === DecCoin.typeUrl ||
        (typeof o.denom === 'string' && typeof o.amount === 'string'))
    );
  },
  isSDK(o: any): o is DecCoinSDKType {
    return (
      o &&
      (o.$typeUrl === DecCoin.typeUrl ||
        (typeof o.denom === 'string' && typeof o.amount === 'string'))
    );
  },
  encode(
    message: DecCoin,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== '') {
      writer.uint32(10).string(message.denom);
    }
    if (message.amount !== '') {
      writer
        .uint32(18)
        .string(Decimal.fromUserInput(message.amount, 18).atomics);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): DecCoin {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDecCoin();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
          break;
        case 2:
          message.amount = Decimal.fromAtomics(reader.string(), 18).toString();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DecCoin {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
      amount: isSet(object.amount) ? String(object.amount) : '',
    };
  },
  toJSON(message: DecCoin): JsonSafe<DecCoin> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    message.amount !== undefined && (obj.amount = message.amount);
    return obj;
  },
  fromPartial(object: Partial<DecCoin>): DecCoin {
    const message = createBaseDecCoin();
    message.denom = object.denom ?? '';
    message.amount = object.amount ?? '';
    return message;
  },
  fromProtoMsg(message: DecCoinProtoMsg): DecCoin {
    return DecCoin.decode(message.value);
  },
  toProto(message: DecCoin): Uint8Array {
    return DecCoin.encode(message).finish();
  },
  toProtoMsg(message: DecCoin): DecCoinProtoMsg {
    return {
      typeUrl: '/cosmos.base.v1beta1.DecCoin',
      value: DecCoin.encode(message).finish(),
    };
  },
};
function createBaseIntProto(): IntProto {
  return {
    int: '',
  };
}
/**
 * IntProto defines a Protobuf wrapper around an Int object.
 * Deprecated: Prefer to use math.Int directly. It supports binary Marshal and Unmarshal.
 * @name IntProto
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.IntProto
 */
export const IntProto = {
  typeUrl: '/cosmos.base.v1beta1.IntProto' as const,
  aminoType: 'cosmos-sdk/IntProto' as const,
  is(o: any): o is IntProto {
    return o && (o.$typeUrl === IntProto.typeUrl || typeof o.int === 'string');
  },
  isSDK(o: any): o is IntProtoSDKType {
    return o && (o.$typeUrl === IntProto.typeUrl || typeof o.int === 'string');
  },
  encode(
    message: IntProto,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.int !== '') {
      writer.uint32(10).string(message.int);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): IntProto {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseIntProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.int = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): IntProto {
    return {
      int: isSet(object.int) ? String(object.int) : '',
    };
  },
  toJSON(message: IntProto): JsonSafe<IntProto> {
    const obj: any = {};
    message.int !== undefined && (obj.int = message.int);
    return obj;
  },
  fromPartial(object: Partial<IntProto>): IntProto {
    const message = createBaseIntProto();
    message.int = object.int ?? '';
    return message;
  },
  fromProtoMsg(message: IntProtoProtoMsg): IntProto {
    return IntProto.decode(message.value);
  },
  toProto(message: IntProto): Uint8Array {
    return IntProto.encode(message).finish();
  },
  toProtoMsg(message: IntProto): IntProtoProtoMsg {
    return {
      typeUrl: '/cosmos.base.v1beta1.IntProto',
      value: IntProto.encode(message).finish(),
    };
  },
};
function createBaseDecProto(): DecProto {
  return {
    dec: '',
  };
}
/**
 * DecProto defines a Protobuf wrapper around a Dec object.
 * Deprecated: Prefer to use math.LegacyDec directly. It supports binary Marshal and Unmarshal.
 * @name DecProto
 * @package cosmos.base.v1beta1
 * @see proto type: cosmos.base.v1beta1.DecProto
 */
export const DecProto = {
  typeUrl: '/cosmos.base.v1beta1.DecProto' as const,
  aminoType: 'cosmos-sdk/DecProto' as const,
  is(o: any): o is DecProto {
    return o && (o.$typeUrl === DecProto.typeUrl || typeof o.dec === 'string');
  },
  isSDK(o: any): o is DecProtoSDKType {
    return o && (o.$typeUrl === DecProto.typeUrl || typeof o.dec === 'string');
  },
  encode(
    message: DecProto,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.dec !== '') {
      writer.uint32(10).string(Decimal.fromUserInput(message.dec, 18).atomics);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): DecProto {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDecProto();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.dec = Decimal.fromAtomics(reader.string(), 18).toString();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): DecProto {
    return {
      dec: isSet(object.dec) ? String(object.dec) : '',
    };
  },
  toJSON(message: DecProto): JsonSafe<DecProto> {
    const obj: any = {};
    message.dec !== undefined && (obj.dec = message.dec);
    return obj;
  },
  fromPartial(object: Partial<DecProto>): DecProto {
    const message = createBaseDecProto();
    message.dec = object.dec ?? '';
    return message;
  },
  fromProtoMsg(message: DecProtoProtoMsg): DecProto {
    return DecProto.decode(message.value);
  },
  toProto(message: DecProto): Uint8Array {
    return DecProto.encode(message).finish();
  },
  toProtoMsg(message: DecProto): DecProtoProtoMsg {
    return {
      typeUrl: '/cosmos.base.v1beta1.DecProto',
      value: DecProto.encode(message).finish(),
    };
  },
};
