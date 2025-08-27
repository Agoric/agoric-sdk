//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * Message format for BurnMessages
 * @param version the message body version
 * @param burn_token the burn token address on source domain as bytes32
 * @param mint_recipient the mint recipient address as bytes32
 * @param amount the burn amount
 * @param message_sender the message sender
 */
export interface BurnMessage {
  version: number;
  burnToken: Uint8Array;
  mintRecipient: Uint8Array;
  amount: string;
  messageSender: Uint8Array;
}
export interface BurnMessageProtoMsg {
  typeUrl: '/circle.cctp.v1.BurnMessage';
  value: Uint8Array;
}
/**
 * Message format for BurnMessages
 * @param version the message body version
 * @param burn_token the burn token address on source domain as bytes32
 * @param mint_recipient the mint recipient address as bytes32
 * @param amount the burn amount
 * @param message_sender the message sender
 */
export interface BurnMessageSDKType {
  version: number;
  burn_token: Uint8Array;
  mint_recipient: Uint8Array;
  amount: string;
  message_sender: Uint8Array;
}
function createBaseBurnMessage(): BurnMessage {
  return {
    version: 0,
    burnToken: new Uint8Array(),
    mintRecipient: new Uint8Array(),
    amount: '',
    messageSender: new Uint8Array(),
  };
}
export const BurnMessage = {
  typeUrl: '/circle.cctp.v1.BurnMessage' as const,
  encode(
    message: BurnMessage,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.version !== 0) {
      writer.uint32(8).uint32(message.version);
    }
    if (message.burnToken.length !== 0) {
      writer.uint32(18).bytes(message.burnToken);
    }
    if (message.mintRecipient.length !== 0) {
      writer.uint32(26).bytes(message.mintRecipient);
    }
    if (message.amount !== '') {
      writer.uint32(34).string(message.amount);
    }
    if (message.messageSender.length !== 0) {
      writer.uint32(42).bytes(message.messageSender);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): BurnMessage {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBurnMessage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.version = reader.uint32();
          break;
        case 2:
          message.burnToken = reader.bytes();
          break;
        case 3:
          message.mintRecipient = reader.bytes();
          break;
        case 4:
          message.amount = reader.string();
          break;
        case 5:
          message.messageSender = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): BurnMessage {
    return {
      version: isSet(object.version) ? Number(object.version) : 0,
      burnToken: isSet(object.burnToken)
        ? bytesFromBase64(object.burnToken)
        : new Uint8Array(),
      mintRecipient: isSet(object.mintRecipient)
        ? bytesFromBase64(object.mintRecipient)
        : new Uint8Array(),
      amount: isSet(object.amount) ? String(object.amount) : '',
      messageSender: isSet(object.messageSender)
        ? bytesFromBase64(object.messageSender)
        : new Uint8Array(),
    };
  },
  toJSON(message: BurnMessage): JsonSafe<BurnMessage> {
    const obj: any = {};
    message.version !== undefined &&
      (obj.version = Math.round(message.version));
    message.burnToken !== undefined &&
      (obj.burnToken = base64FromBytes(
        message.burnToken !== undefined ? message.burnToken : new Uint8Array(),
      ));
    message.mintRecipient !== undefined &&
      (obj.mintRecipient = base64FromBytes(
        message.mintRecipient !== undefined
          ? message.mintRecipient
          : new Uint8Array(),
      ));
    message.amount !== undefined && (obj.amount = message.amount);
    message.messageSender !== undefined &&
      (obj.messageSender = base64FromBytes(
        message.messageSender !== undefined
          ? message.messageSender
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<BurnMessage>): BurnMessage {
    const message = createBaseBurnMessage();
    message.version = object.version ?? 0;
    message.burnToken = object.burnToken ?? new Uint8Array();
    message.mintRecipient = object.mintRecipient ?? new Uint8Array();
    message.amount = object.amount ?? '';
    message.messageSender = object.messageSender ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: BurnMessageProtoMsg): BurnMessage {
    return BurnMessage.decode(message.value);
  },
  toProto(message: BurnMessage): Uint8Array {
    return BurnMessage.encode(message).finish();
  },
  toProtoMsg(message: BurnMessage): BurnMessageProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.BurnMessage',
      value: BurnMessage.encode(message).finish(),
    };
  },
};
