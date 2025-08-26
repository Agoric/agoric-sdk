//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * Message format for SendingAndReceivingMessagesPaused
 * @param paused true if paused, false if not paused
 */
export interface SendingAndReceivingMessagesPaused {
  paused: boolean;
}
export interface SendingAndReceivingMessagesPausedProtoMsg {
  typeUrl: '/circle.cctp.v1.SendingAndReceivingMessagesPaused';
  value: Uint8Array;
}
/**
 * Message format for SendingAndReceivingMessagesPaused
 * @param paused true if paused, false if not paused
 */
export interface SendingAndReceivingMessagesPausedSDKType {
  paused: boolean;
}
function createBaseSendingAndReceivingMessagesPaused(): SendingAndReceivingMessagesPaused {
  return {
    paused: false,
  };
}
export const SendingAndReceivingMessagesPaused = {
  typeUrl: '/circle.cctp.v1.SendingAndReceivingMessagesPaused' as const,
  encode(
    message: SendingAndReceivingMessagesPaused,
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
  ): SendingAndReceivingMessagesPaused {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSendingAndReceivingMessagesPaused();
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
  fromJSON(object: any): SendingAndReceivingMessagesPaused {
    return {
      paused: isSet(object.paused) ? Boolean(object.paused) : false,
    };
  },
  toJSON(
    message: SendingAndReceivingMessagesPaused,
  ): JsonSafe<SendingAndReceivingMessagesPaused> {
    const obj: any = {};
    message.paused !== undefined && (obj.paused = message.paused);
    return obj;
  },
  fromPartial(
    object: Partial<SendingAndReceivingMessagesPaused>,
  ): SendingAndReceivingMessagesPaused {
    const message = createBaseSendingAndReceivingMessagesPaused();
    message.paused = object.paused ?? false;
    return message;
  },
  fromProtoMsg(
    message: SendingAndReceivingMessagesPausedProtoMsg,
  ): SendingAndReceivingMessagesPaused {
    return SendingAndReceivingMessagesPaused.decode(message.value);
  },
  toProto(message: SendingAndReceivingMessagesPaused): Uint8Array {
    return SendingAndReceivingMessagesPaused.encode(message).finish();
  },
  toProtoMsg(
    message: SendingAndReceivingMessagesPaused,
  ): SendingAndReceivingMessagesPausedProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.SendingAndReceivingMessagesPaused',
      value: SendingAndReceivingMessagesPaused.encode(message).finish(),
    };
  },
};
