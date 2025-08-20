//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * Message format for BurningAndMintingPaused
 * @param paused true if paused, false if not paused
 */
export interface BurningAndMintingPaused {
  paused: boolean;
}
export interface BurningAndMintingPausedProtoMsg {
  typeUrl: '/circle.cctp.v1.BurningAndMintingPaused';
  value: Uint8Array;
}
/**
 * Message format for BurningAndMintingPaused
 * @param paused true if paused, false if not paused
 */
export interface BurningAndMintingPausedSDKType {
  paused: boolean;
}
function createBaseBurningAndMintingPaused(): BurningAndMintingPaused {
  return {
    paused: false,
  };
}
export const BurningAndMintingPaused = {
  typeUrl: '/circle.cctp.v1.BurningAndMintingPaused',
  encode(
    message: BurningAndMintingPaused,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.paused === true) {
      writer.uint32(8).bool(message.paused);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): BurningAndMintingPaused {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBurningAndMintingPaused();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.paused = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): BurningAndMintingPaused {
    return {
      paused: isSet(object.paused) ? Boolean(object.paused) : false,
    };
  },
  toJSON(message: BurningAndMintingPaused): JsonSafe<BurningAndMintingPaused> {
    const obj: any = {};
    message.paused !== undefined && (obj.paused = message.paused);
    return obj;
  },
  fromPartial(
    object: Partial<BurningAndMintingPaused>,
  ): BurningAndMintingPaused {
    const message = createBaseBurningAndMintingPaused();
    message.paused = object.paused ?? false;
    return message;
  },
  fromProtoMsg(
    message: BurningAndMintingPausedProtoMsg,
  ): BurningAndMintingPaused {
    return BurningAndMintingPaused.decode(message.value);
  },
  toProto(message: BurningAndMintingPaused): Uint8Array {
    return BurningAndMintingPaused.encode(message).finish();
  },
  toProtoMsg(
    message: BurningAndMintingPaused,
  ): BurningAndMintingPausedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.BurningAndMintingPaused',
      value: BurningAndMintingPaused.encode(message).finish(),
    };
  },
};
