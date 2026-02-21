//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * The Nonce type functions both to mark receipt of received messages and a
 * counter for sending messages
 * @param source_domain the domain id, used to mark used nonces for received
 * messages
 * @param nonce the nonce number
 */
export interface Nonce {
  sourceDomain: number;
  nonce: bigint;
}
export interface NonceProtoMsg {
  typeUrl: '/circle.cctp.v1.Nonce';
  value: Uint8Array;
}
/**
 * The Nonce type functions both to mark receipt of received messages and a
 * counter for sending messages
 * @param source_domain the domain id, used to mark used nonces for received
 * messages
 * @param nonce the nonce number
 */
export interface NonceSDKType {
  source_domain: number;
  nonce: bigint;
}
function createBaseNonce(): Nonce {
  return {
    sourceDomain: 0,
    nonce: BigInt(0),
  };
}
export const Nonce = {
  typeUrl: '/circle.cctp.v1.Nonce' as const,
  encode(
    message: Nonce,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.sourceDomain !== 0) {
      writer.uint32(8).uint32(message.sourceDomain);
    }
    if (message.nonce !== BigInt(0)) {
      writer.uint32(16).uint64(message.nonce);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): Nonce {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseNonce();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.sourceDomain = reader.uint32();
          break;
        case 2:
          message.nonce = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): Nonce {
    return {
      sourceDomain: isSet(object.sourceDomain)
        ? Number(object.sourceDomain)
        : 0,
      nonce: isSet(object.nonce) ? BigInt(object.nonce.toString()) : BigInt(0),
    };
  },
  toJSON(message: Nonce): JsonSafe<Nonce> {
    const obj: any = {};
    message.sourceDomain !== undefined &&
      (obj.sourceDomain = Math.round(message.sourceDomain));
    message.nonce !== undefined &&
      (obj.nonce = (message.nonce || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<Nonce>): Nonce {
    const message = createBaseNonce();
    message.sourceDomain = object.sourceDomain ?? 0;
    message.nonce =
      object.nonce !== undefined && object.nonce !== null
        ? BigInt(object.nonce.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: NonceProtoMsg): Nonce {
    return Nonce.decode(message.value);
  },
  toProto(message: Nonce): Uint8Array {
    return Nonce.encode(message).finish();
  },
  toProtoMsg(message: Nonce): NonceProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.Nonce',
      value: Nonce.encode(message).finish(),
    };
  },
};
