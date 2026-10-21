//@ts-nocheck
import { Op, type OpSDKType } from './benchmark.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * MsgLoadTestOps defines a message containing a sequence of load test operations.
 * @name MsgLoadTest
 * @package cosmos.benchmark.v1
 * @see proto type: cosmos.benchmark.v1.MsgLoadTest
 */
export interface MsgLoadTest {
  caller: Uint8Array;
  ops: Op[];
}
export interface MsgLoadTestProtoMsg {
  typeUrl: '/cosmos.benchmark.v1.MsgLoadTest';
  value: Uint8Array;
}
/**
 * MsgLoadTestOps defines a message containing a sequence of load test operations.
 * @name MsgLoadTestSDKType
 * @package cosmos.benchmark.v1
 * @see proto type: cosmos.benchmark.v1.MsgLoadTest
 */
export interface MsgLoadTestSDKType {
  caller: Uint8Array;
  ops: OpSDKType[];
}
/**
 * MsgLoadTestResponse defines a message containing the results of a load test operation.
 * @name MsgLoadTestResponse
 * @package cosmos.benchmark.v1
 * @see proto type: cosmos.benchmark.v1.MsgLoadTestResponse
 */
export interface MsgLoadTestResponse {
  totalTime: bigint;
  totalErrors: bigint;
}
export interface MsgLoadTestResponseProtoMsg {
  typeUrl: '/cosmos.benchmark.v1.MsgLoadTestResponse';
  value: Uint8Array;
}
/**
 * MsgLoadTestResponse defines a message containing the results of a load test operation.
 * @name MsgLoadTestResponseSDKType
 * @package cosmos.benchmark.v1
 * @see proto type: cosmos.benchmark.v1.MsgLoadTestResponse
 */
export interface MsgLoadTestResponseSDKType {
  total_time: bigint;
  total_errors: bigint;
}
function createBaseMsgLoadTest(): MsgLoadTest {
  return {
    caller: new Uint8Array(),
    ops: [],
  };
}
/**
 * MsgLoadTestOps defines a message containing a sequence of load test operations.
 * @name MsgLoadTest
 * @package cosmos.benchmark.v1
 * @see proto type: cosmos.benchmark.v1.MsgLoadTest
 */
export const MsgLoadTest = {
  typeUrl: '/cosmos.benchmark.v1.MsgLoadTest' as const,
  aminoType: 'cosmos-sdk/tools/benchmark/v1/MsgLoadTest' as const,
  is(o: any): o is MsgLoadTest {
    return (
      o &&
      (o.$typeUrl === MsgLoadTest.typeUrl ||
        ((o.caller instanceof Uint8Array || typeof o.caller === 'string') &&
          Array.isArray(o.ops) &&
          (!o.ops.length || Op.is(o.ops[0]))))
    );
  },
  isSDK(o: any): o is MsgLoadTestSDKType {
    return (
      o &&
      (o.$typeUrl === MsgLoadTest.typeUrl ||
        ((o.caller instanceof Uint8Array || typeof o.caller === 'string') &&
          Array.isArray(o.ops) &&
          (!o.ops.length || Op.isSDK(o.ops[0]))))
    );
  },
  encode(
    message: MsgLoadTest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.caller.length !== 0) {
      writer.uint32(10).bytes(message.caller);
    }
    for (const v of message.ops) {
      Op.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgLoadTest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLoadTest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.caller = reader.bytes();
          break;
        case 2:
          message.ops.push(Op.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgLoadTest {
    return {
      caller: isSet(object.caller)
        ? bytesFromBase64(object.caller)
        : new Uint8Array(),
      ops: Array.isArray(object?.ops)
        ? object.ops.map((e: any) => Op.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgLoadTest): JsonSafe<MsgLoadTest> {
    const obj: any = {};
    message.caller !== undefined &&
      (obj.caller = base64FromBytes(
        message.caller !== undefined ? message.caller : new Uint8Array(),
      ));
    if (message.ops) {
      obj.ops = message.ops.map(e => (e ? Op.toJSON(e) : undefined));
    } else {
      obj.ops = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgLoadTest>): MsgLoadTest {
    const message = createBaseMsgLoadTest();
    message.caller = object.caller ?? new Uint8Array();
    message.ops = object.ops?.map(e => Op.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(message: MsgLoadTestProtoMsg): MsgLoadTest {
    return MsgLoadTest.decode(message.value);
  },
  toProto(message: MsgLoadTest): Uint8Array {
    return MsgLoadTest.encode(message).finish();
  },
  toProtoMsg(message: MsgLoadTest): MsgLoadTestProtoMsg {
    return {
      typeUrl: '/cosmos.benchmark.v1.MsgLoadTest',
      value: MsgLoadTest.encode(message).finish(),
    };
  },
};
function createBaseMsgLoadTestResponse(): MsgLoadTestResponse {
  return {
    totalTime: BigInt(0),
    totalErrors: BigInt(0),
  };
}
/**
 * MsgLoadTestResponse defines a message containing the results of a load test operation.
 * @name MsgLoadTestResponse
 * @package cosmos.benchmark.v1
 * @see proto type: cosmos.benchmark.v1.MsgLoadTestResponse
 */
export const MsgLoadTestResponse = {
  typeUrl: '/cosmos.benchmark.v1.MsgLoadTestResponse' as const,
  aminoType: 'cosmos-sdk/MsgLoadTestResponse' as const,
  is(o: any): o is MsgLoadTestResponse {
    return (
      o &&
      (o.$typeUrl === MsgLoadTestResponse.typeUrl ||
        (typeof o.totalTime === 'bigint' && typeof o.totalErrors === 'bigint'))
    );
  },
  isSDK(o: any): o is MsgLoadTestResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgLoadTestResponse.typeUrl ||
        (typeof o.total_time === 'bigint' &&
          typeof o.total_errors === 'bigint'))
    );
  },
  encode(
    message: MsgLoadTestResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.totalTime !== BigInt(0)) {
      writer.uint32(8).uint64(message.totalTime);
    }
    if (message.totalErrors !== BigInt(0)) {
      writer.uint32(16).uint64(message.totalErrors);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgLoadTestResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgLoadTestResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.totalTime = reader.uint64();
          break;
        case 2:
          message.totalErrors = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgLoadTestResponse {
    return {
      totalTime: isSet(object.totalTime)
        ? BigInt(object.totalTime.toString())
        : BigInt(0),
      totalErrors: isSet(object.totalErrors)
        ? BigInt(object.totalErrors.toString())
        : BigInt(0),
    };
  },
  toJSON(message: MsgLoadTestResponse): JsonSafe<MsgLoadTestResponse> {
    const obj: any = {};
    message.totalTime !== undefined &&
      (obj.totalTime = (message.totalTime || BigInt(0)).toString());
    message.totalErrors !== undefined &&
      (obj.totalErrors = (message.totalErrors || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<MsgLoadTestResponse>): MsgLoadTestResponse {
    const message = createBaseMsgLoadTestResponse();
    message.totalTime =
      object.totalTime !== undefined && object.totalTime !== null
        ? BigInt(object.totalTime.toString())
        : BigInt(0);
    message.totalErrors =
      object.totalErrors !== undefined && object.totalErrors !== null
        ? BigInt(object.totalErrors.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: MsgLoadTestResponseProtoMsg): MsgLoadTestResponse {
    return MsgLoadTestResponse.decode(message.value);
  },
  toProto(message: MsgLoadTestResponse): Uint8Array {
    return MsgLoadTestResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgLoadTestResponse): MsgLoadTestResponseProtoMsg {
    return {
      typeUrl: '/cosmos.benchmark.v1.MsgLoadTestResponse',
      value: MsgLoadTestResponse.encode(message).finish(),
    };
  },
};
