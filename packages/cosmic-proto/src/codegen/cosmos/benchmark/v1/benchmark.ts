//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * Op is a message describing a benchmark operation.
 * @name Op
 * @package cosmos.benchmark.v1
 * @see proto type: cosmos.benchmark.v1.Op
 */
export interface Op {
  seed: bigint;
  actor: string;
  keyLength: bigint;
  valueLength: bigint;
  iterations: number;
  delete: boolean;
  exists: boolean;
}
export interface OpProtoMsg {
  typeUrl: '/cosmos.benchmark.v1.Op';
  value: Uint8Array;
}
/**
 * Op is a message describing a benchmark operation.
 * @name OpSDKType
 * @package cosmos.benchmark.v1
 * @see proto type: cosmos.benchmark.v1.Op
 */
export interface OpSDKType {
  seed: bigint;
  actor: string;
  key_length: bigint;
  value_length: bigint;
  iterations: number;
  delete: boolean;
  exists: boolean;
}
function createBaseOp(): Op {
  return {
    seed: BigInt(0),
    actor: '',
    keyLength: BigInt(0),
    valueLength: BigInt(0),
    iterations: 0,
    delete: false,
    exists: false,
  };
}
/**
 * Op is a message describing a benchmark operation.
 * @name Op
 * @package cosmos.benchmark.v1
 * @see proto type: cosmos.benchmark.v1.Op
 */
export const Op = {
  typeUrl: '/cosmos.benchmark.v1.Op' as const,
  aminoType: 'cosmos-sdk/Op' as const,
  is(o: any): o is Op {
    return (
      o &&
      (o.$typeUrl === Op.typeUrl ||
        (typeof o.seed === 'bigint' &&
          typeof o.actor === 'string' &&
          typeof o.keyLength === 'bigint' &&
          typeof o.valueLength === 'bigint' &&
          typeof o.iterations === 'number' &&
          typeof o.delete === 'boolean' &&
          typeof o.exists === 'boolean'))
    );
  },
  isSDK(o: any): o is OpSDKType {
    return (
      o &&
      (o.$typeUrl === Op.typeUrl ||
        (typeof o.seed === 'bigint' &&
          typeof o.actor === 'string' &&
          typeof o.key_length === 'bigint' &&
          typeof o.value_length === 'bigint' &&
          typeof o.iterations === 'number' &&
          typeof o.delete === 'boolean' &&
          typeof o.exists === 'boolean'))
    );
  },
  encode(
    message: Op,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.seed !== BigInt(0)) {
      writer.uint32(8).uint64(message.seed);
    }
    if (message.actor !== '') {
      writer.uint32(18).string(message.actor);
    }
    if (message.keyLength !== BigInt(0)) {
      writer.uint32(24).uint64(message.keyLength);
    }
    if (message.valueLength !== BigInt(0)) {
      writer.uint32(32).uint64(message.valueLength);
    }
    if (message.iterations !== 0) {
      writer.uint32(40).uint32(message.iterations);
    }
    if (message.delete === true) {
      writer.uint32(48).bool(message.delete);
    }
    if (message.exists === true) {
      writer.uint32(56).bool(message.exists);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Op {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseOp();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.seed = reader.uint64();
          break;
        case 2:
          message.actor = reader.string();
          break;
        case 3:
          message.keyLength = reader.uint64();
          break;
        case 4:
          message.valueLength = reader.uint64();
          break;
        case 5:
          message.iterations = reader.uint32();
          break;
        case 6:
          message.delete = reader.bool();
          break;
        case 7:
          message.exists = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Op {
    return {
      seed: isSet(object.seed) ? BigInt(object.seed.toString()) : BigInt(0),
      actor: isSet(object.actor) ? String(object.actor) : '',
      keyLength: isSet(object.keyLength)
        ? BigInt(object.keyLength.toString())
        : BigInt(0),
      valueLength: isSet(object.valueLength)
        ? BigInt(object.valueLength.toString())
        : BigInt(0),
      iterations: isSet(object.iterations) ? Number(object.iterations) : 0,
      delete: isSet(object.delete) ? Boolean(object.delete) : false,
      exists: isSet(object.exists) ? Boolean(object.exists) : false,
    };
  },
  toJSON(message: Op): JsonSafe<Op> {
    const obj: any = {};
    message.seed !== undefined &&
      (obj.seed = (message.seed || BigInt(0)).toString());
    message.actor !== undefined && (obj.actor = message.actor);
    message.keyLength !== undefined &&
      (obj.keyLength = (message.keyLength || BigInt(0)).toString());
    message.valueLength !== undefined &&
      (obj.valueLength = (message.valueLength || BigInt(0)).toString());
    message.iterations !== undefined &&
      (obj.iterations = Math.round(message.iterations));
    message.delete !== undefined && (obj.delete = message.delete);
    message.exists !== undefined && (obj.exists = message.exists);
    return obj;
  },
  fromPartial(object: Partial<Op>): Op {
    const message = createBaseOp();
    message.seed =
      object.seed !== undefined && object.seed !== null
        ? BigInt(object.seed.toString())
        : BigInt(0);
    message.actor = object.actor ?? '';
    message.keyLength =
      object.keyLength !== undefined && object.keyLength !== null
        ? BigInt(object.keyLength.toString())
        : BigInt(0);
    message.valueLength =
      object.valueLength !== undefined && object.valueLength !== null
        ? BigInt(object.valueLength.toString())
        : BigInt(0);
    message.iterations = object.iterations ?? 0;
    message.delete = object.delete ?? false;
    message.exists = object.exists ?? false;
    return message;
  },
  fromProtoMsg(message: OpProtoMsg): Op {
    return Op.decode(message.value);
  },
  toProto(message: Op): Uint8Array {
    return Op.encode(message).finish();
  },
  toProtoMsg(message: Op): OpProtoMsg {
    return {
      typeUrl: '/cosmos.benchmark.v1.Op',
      value: Op.encode(message).finish(),
    };
  },
};
