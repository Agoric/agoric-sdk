//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * Message format for BurningAndMintingPaused
 * @param paused true if paused, false if not paused
 */
export interface MaxMessageBodySize {
  amount: bigint;
}
export interface MaxMessageBodySizeProtoMsg {
  typeUrl: '/circle.cctp.v1.MaxMessageBodySize';
  value: Uint8Array;
}
/**
 * Message format for BurningAndMintingPaused
 * @param paused true if paused, false if not paused
 */
export interface MaxMessageBodySizeSDKType {
  amount: bigint;
}
function createBaseMaxMessageBodySize(): MaxMessageBodySize {
  return {
    amount: BigInt(0),
  };
}
export const MaxMessageBodySize = {
  typeUrl: '/circle.cctp.v1.MaxMessageBodySize' as const,
  encode(
    message: MaxMessageBodySize,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.amount !== BigInt(0)) {
      writer.uint32(8).uint64(message.amount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MaxMessageBodySize {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMaxMessageBodySize();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.amount = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MaxMessageBodySize {
    return {
      amount: isSet(object.amount)
        ? BigInt(object.amount.toString())
        : BigInt(0),
    };
  },
  toJSON(message: MaxMessageBodySize): JsonSafe<MaxMessageBodySize> {
    const obj: any = {};
    message.amount !== undefined &&
      (obj.amount = (message.amount || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<MaxMessageBodySize>): MaxMessageBodySize {
    const message = createBaseMaxMessageBodySize();
    message.amount =
      object.amount !== undefined && object.amount !== null
        ? BigInt(object.amount.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: MaxMessageBodySizeProtoMsg): MaxMessageBodySize {
    return MaxMessageBodySize.decode(message.value);
  },
  toProto(message: MaxMessageBodySize): Uint8Array {
    return MaxMessageBodySize.encode(message).finish();
  },
  toProtoMsg(message: MaxMessageBodySize): MaxMessageBodySizeProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MaxMessageBodySize',
      value: MaxMessageBodySize.encode(message).finish(),
    };
  },
};
