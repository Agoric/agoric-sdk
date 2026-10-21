//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgIncreaseCounter defines a count Msg service counter.
 * @name MsgIncreaseCounter
 * @package cosmos.counter.v1
 * @see proto type: cosmos.counter.v1.MsgIncreaseCounter
 */
export interface MsgIncreaseCounter {
  /**
   * signer is the address that controls the module (defaults to x/gov unless overwritten).
   */
  signer: string;
  /**
   * count is the number of times to increment the counter.
   */
  count: bigint;
}
export interface MsgIncreaseCounterProtoMsg {
  typeUrl: '/cosmos.counter.v1.MsgIncreaseCounter';
  value: Uint8Array;
}
/**
 * MsgIncreaseCounter defines a count Msg service counter.
 * @name MsgIncreaseCounterSDKType
 * @package cosmos.counter.v1
 * @see proto type: cosmos.counter.v1.MsgIncreaseCounter
 */
export interface MsgIncreaseCounterSDKType {
  signer: string;
  count: bigint;
}
/**
 * MsgIncreaseCountResponse is the Msg/Counter response type.
 * @name MsgIncreaseCountResponse
 * @package cosmos.counter.v1
 * @see proto type: cosmos.counter.v1.MsgIncreaseCountResponse
 */
export interface MsgIncreaseCountResponse {
  /**
   * new_count is the number of times the counter was incremented.
   */
  newCount: bigint;
}
export interface MsgIncreaseCountResponseProtoMsg {
  typeUrl: '/cosmos.counter.v1.MsgIncreaseCountResponse';
  value: Uint8Array;
}
/**
 * MsgIncreaseCountResponse is the Msg/Counter response type.
 * @name MsgIncreaseCountResponseSDKType
 * @package cosmos.counter.v1
 * @see proto type: cosmos.counter.v1.MsgIncreaseCountResponse
 */
export interface MsgIncreaseCountResponseSDKType {
  new_count: bigint;
}
function createBaseMsgIncreaseCounter(): MsgIncreaseCounter {
  return {
    signer: '',
    count: BigInt(0),
  };
}
/**
 * MsgIncreaseCounter defines a count Msg service counter.
 * @name MsgIncreaseCounter
 * @package cosmos.counter.v1
 * @see proto type: cosmos.counter.v1.MsgIncreaseCounter
 */
export const MsgIncreaseCounter = {
  typeUrl: '/cosmos.counter.v1.MsgIncreaseCounter' as const,
  aminoType: 'cosmos-sdk/increase_counter' as const,
  is(o: any): o is MsgIncreaseCounter {
    return (
      o &&
      (o.$typeUrl === MsgIncreaseCounter.typeUrl ||
        (typeof o.signer === 'string' && typeof o.count === 'bigint'))
    );
  },
  isSDK(o: any): o is MsgIncreaseCounterSDKType {
    return (
      o &&
      (o.$typeUrl === MsgIncreaseCounter.typeUrl ||
        (typeof o.signer === 'string' && typeof o.count === 'bigint'))
    );
  },
  encode(
    message: MsgIncreaseCounter,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.count !== BigInt(0)) {
      writer.uint32(16).int64(message.count);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgIncreaseCounter {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgIncreaseCounter();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.count = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgIncreaseCounter {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      count: isSet(object.count) ? BigInt(object.count.toString()) : BigInt(0),
    };
  },
  toJSON(message: MsgIncreaseCounter): JsonSafe<MsgIncreaseCounter> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.count !== undefined &&
      (obj.count = (message.count || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<MsgIncreaseCounter>): MsgIncreaseCounter {
    const message = createBaseMsgIncreaseCounter();
    message.signer = object.signer ?? '';
    message.count =
      object.count !== undefined && object.count !== null
        ? BigInt(object.count.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: MsgIncreaseCounterProtoMsg): MsgIncreaseCounter {
    return MsgIncreaseCounter.decode(message.value);
  },
  toProto(message: MsgIncreaseCounter): Uint8Array {
    return MsgIncreaseCounter.encode(message).finish();
  },
  toProtoMsg(message: MsgIncreaseCounter): MsgIncreaseCounterProtoMsg {
    return {
      typeUrl: '/cosmos.counter.v1.MsgIncreaseCounter',
      value: MsgIncreaseCounter.encode(message).finish(),
    };
  },
};
function createBaseMsgIncreaseCountResponse(): MsgIncreaseCountResponse {
  return {
    newCount: BigInt(0),
  };
}
/**
 * MsgIncreaseCountResponse is the Msg/Counter response type.
 * @name MsgIncreaseCountResponse
 * @package cosmos.counter.v1
 * @see proto type: cosmos.counter.v1.MsgIncreaseCountResponse
 */
export const MsgIncreaseCountResponse = {
  typeUrl: '/cosmos.counter.v1.MsgIncreaseCountResponse' as const,
  aminoType: 'cosmos-sdk/MsgIncreaseCountResponse' as const,
  is(o: any): o is MsgIncreaseCountResponse {
    return (
      o &&
      (o.$typeUrl === MsgIncreaseCountResponse.typeUrl ||
        typeof o.newCount === 'bigint')
    );
  },
  isSDK(o: any): o is MsgIncreaseCountResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgIncreaseCountResponse.typeUrl ||
        typeof o.new_count === 'bigint')
    );
  },
  encode(
    message: MsgIncreaseCountResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.newCount !== BigInt(0)) {
      writer.uint32(8).int64(message.newCount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgIncreaseCountResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgIncreaseCountResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.newCount = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgIncreaseCountResponse {
    return {
      newCount: isSet(object.newCount)
        ? BigInt(object.newCount.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: MsgIncreaseCountResponse,
  ): JsonSafe<MsgIncreaseCountResponse> {
    const obj: any = {};
    message.newCount !== undefined &&
      (obj.newCount = (message.newCount || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgIncreaseCountResponse>,
  ): MsgIncreaseCountResponse {
    const message = createBaseMsgIncreaseCountResponse();
    message.newCount =
      object.newCount !== undefined && object.newCount !== null
        ? BigInt(object.newCount.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgIncreaseCountResponseProtoMsg,
  ): MsgIncreaseCountResponse {
    return MsgIncreaseCountResponse.decode(message.value);
  },
  toProto(message: MsgIncreaseCountResponse): Uint8Array {
    return MsgIncreaseCountResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgIncreaseCountResponse,
  ): MsgIncreaseCountResponseProtoMsg {
    return {
      typeUrl: '/cosmos.counter.v1.MsgIncreaseCountResponse',
      value: MsgIncreaseCountResponse.encode(message).finish(),
    };
  },
};
