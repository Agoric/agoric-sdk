//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet, bytesFromBase64, base64FromBytes } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
export interface MsgDepositForBurn {
  from: string;
  amount: string;
  destinationDomain: number;
  mintRecipient: Uint8Array;
  burnToken: string;
}
export interface MsgDepositForBurnProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurn';
  value: Uint8Array;
}
export interface MsgDepositForBurnSDKType {
  from: string;
  amount: string;
  destination_domain: number;
  mint_recipient: Uint8Array;
  burn_token: string;
}
export interface MsgDepositForBurnResponse {
  nonce: bigint;
}
export interface MsgDepositForBurnResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurnResponse';
  value: Uint8Array;
}
export interface MsgDepositForBurnResponseSDKType {
  nonce: bigint;
}
export interface MsgDepositForBurnWithCaller {
  from: string;
  amount: string;
  destinationDomain: number;
  mintRecipient: Uint8Array;
  burnToken: string;
  destinationCaller: Uint8Array;
}
export interface MsgDepositForBurnWithCallerProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCaller';
  value: Uint8Array;
}
export interface MsgDepositForBurnWithCallerSDKType {
  from: string;
  amount: string;
  destination_domain: number;
  mint_recipient: Uint8Array;
  burn_token: string;
  destination_caller: Uint8Array;
}
export interface MsgDepositForBurnWithCallerResponse {
  nonce: bigint;
}
export interface MsgDepositForBurnWithCallerResponseProtoMsg {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCallerResponse';
  value: Uint8Array;
}
export interface MsgDepositForBurnWithCallerResponseSDKType {
  nonce: bigint;
}
function createBaseMsgDepositForBurn(): MsgDepositForBurn {
  return {
    from: '',
    amount: '',
    destinationDomain: 0,
    mintRecipient: new Uint8Array(),
    burnToken: '',
  };
}
export const MsgDepositForBurn = {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurn',
  encode(
    message: MsgDepositForBurn,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.amount !== '') {
      writer.uint32(18).string(message.amount);
    }
    if (message.destinationDomain !== 0) {
      writer.uint32(24).uint32(message.destinationDomain);
    }
    if (message.mintRecipient.length !== 0) {
      writer.uint32(34).bytes(message.mintRecipient);
    }
    if (message.burnToken !== '') {
      writer.uint32(42).string(message.burnToken);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgDepositForBurn {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDepositForBurn();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.amount = reader.string();
          break;
        case 3:
          message.destinationDomain = reader.uint32();
          break;
        case 4:
          message.mintRecipient = reader.bytes();
          break;
        case 5:
          message.burnToken = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgDepositForBurn {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      amount: isSet(object.amount) ? String(object.amount) : '',
      destinationDomain: isSet(object.destinationDomain)
        ? Number(object.destinationDomain)
        : 0,
      mintRecipient: isSet(object.mintRecipient)
        ? bytesFromBase64(object.mintRecipient)
        : new Uint8Array(),
      burnToken: isSet(object.burnToken) ? String(object.burnToken) : '',
    };
  },
  toJSON(message: MsgDepositForBurn): JsonSafe<MsgDepositForBurn> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.amount !== undefined && (obj.amount = message.amount);
    message.destinationDomain !== undefined &&
      (obj.destinationDomain = Math.round(message.destinationDomain));
    message.mintRecipient !== undefined &&
      (obj.mintRecipient = base64FromBytes(
        message.mintRecipient !== undefined
          ? message.mintRecipient
          : new Uint8Array(),
      ));
    message.burnToken !== undefined && (obj.burnToken = message.burnToken);
    return obj;
  },
  fromPartial(object: Partial<MsgDepositForBurn>): MsgDepositForBurn {
    const message = createBaseMsgDepositForBurn();
    message.from = object.from ?? '';
    message.amount = object.amount ?? '';
    message.destinationDomain = object.destinationDomain ?? 0;
    message.mintRecipient = object.mintRecipient ?? new Uint8Array();
    message.burnToken = object.burnToken ?? '';
    return message;
  },
  fromProtoMsg(message: MsgDepositForBurnProtoMsg): MsgDepositForBurn {
    return MsgDepositForBurn.decode(message.value);
  },
  toProto(message: MsgDepositForBurn): Uint8Array {
    return MsgDepositForBurn.encode(message).finish();
  },
  toProtoMsg(message: MsgDepositForBurn): MsgDepositForBurnProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgDepositForBurn',
      value: MsgDepositForBurn.encode(message).finish(),
    };
  },
};
function createBaseMsgDepositForBurnResponse(): MsgDepositForBurnResponse {
  return {
    nonce: BigInt(0),
  };
}
export const MsgDepositForBurnResponse = {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurnResponse',
  encode(
    message: MsgDepositForBurnResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nonce !== BigInt(0)) {
      writer.uint32(8).uint64(message.nonce);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgDepositForBurnResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDepositForBurnResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nonce = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgDepositForBurnResponse {
    return {
      nonce: isSet(object.nonce) ? BigInt(object.nonce.toString()) : BigInt(0),
    };
  },
  toJSON(
    message: MsgDepositForBurnResponse,
  ): JsonSafe<MsgDepositForBurnResponse> {
    const obj: any = {};
    message.nonce !== undefined &&
      (obj.nonce = (message.nonce || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgDepositForBurnResponse>,
  ): MsgDepositForBurnResponse {
    const message = createBaseMsgDepositForBurnResponse();
    message.nonce =
      object.nonce !== undefined && object.nonce !== null
        ? BigInt(object.nonce.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgDepositForBurnResponseProtoMsg,
  ): MsgDepositForBurnResponse {
    return MsgDepositForBurnResponse.decode(message.value);
  },
  toProto(message: MsgDepositForBurnResponse): Uint8Array {
    return MsgDepositForBurnResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgDepositForBurnResponse,
  ): MsgDepositForBurnResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgDepositForBurnResponse',
      value: MsgDepositForBurnResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgDepositForBurnWithCaller(): MsgDepositForBurnWithCaller {
  return {
    from: '',
    amount: '',
    destinationDomain: 0,
    mintRecipient: new Uint8Array(),
    burnToken: '',
    destinationCaller: new Uint8Array(),
  };
}
export const MsgDepositForBurnWithCaller = {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCaller',
  encode(
    message: MsgDepositForBurnWithCaller,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.from !== '') {
      writer.uint32(10).string(message.from);
    }
    if (message.amount !== '') {
      writer.uint32(18).string(message.amount);
    }
    if (message.destinationDomain !== 0) {
      writer.uint32(24).uint32(message.destinationDomain);
    }
    if (message.mintRecipient.length !== 0) {
      writer.uint32(34).bytes(message.mintRecipient);
    }
    if (message.burnToken !== '') {
      writer.uint32(42).string(message.burnToken);
    }
    if (message.destinationCaller.length !== 0) {
      writer.uint32(50).bytes(message.destinationCaller);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgDepositForBurnWithCaller {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDepositForBurnWithCaller();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.from = reader.string();
          break;
        case 2:
          message.amount = reader.string();
          break;
        case 3:
          message.destinationDomain = reader.uint32();
          break;
        case 4:
          message.mintRecipient = reader.bytes();
          break;
        case 5:
          message.burnToken = reader.string();
          break;
        case 6:
          message.destinationCaller = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgDepositForBurnWithCaller {
    return {
      from: isSet(object.from) ? String(object.from) : '',
      amount: isSet(object.amount) ? String(object.amount) : '',
      destinationDomain: isSet(object.destinationDomain)
        ? Number(object.destinationDomain)
        : 0,
      mintRecipient: isSet(object.mintRecipient)
        ? bytesFromBase64(object.mintRecipient)
        : new Uint8Array(),
      burnToken: isSet(object.burnToken) ? String(object.burnToken) : '',
      destinationCaller: isSet(object.destinationCaller)
        ? bytesFromBase64(object.destinationCaller)
        : new Uint8Array(),
    };
  },
  toJSON(
    message: MsgDepositForBurnWithCaller,
  ): JsonSafe<MsgDepositForBurnWithCaller> {
    const obj: any = {};
    message.from !== undefined && (obj.from = message.from);
    message.amount !== undefined && (obj.amount = message.amount);
    message.destinationDomain !== undefined &&
      (obj.destinationDomain = Math.round(message.destinationDomain));
    message.mintRecipient !== undefined &&
      (obj.mintRecipient = base64FromBytes(
        message.mintRecipient !== undefined
          ? message.mintRecipient
          : new Uint8Array(),
      ));
    message.burnToken !== undefined && (obj.burnToken = message.burnToken);
    message.destinationCaller !== undefined &&
      (obj.destinationCaller = base64FromBytes(
        message.destinationCaller !== undefined
          ? message.destinationCaller
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(
    object: Partial<MsgDepositForBurnWithCaller>,
  ): MsgDepositForBurnWithCaller {
    const message = createBaseMsgDepositForBurnWithCaller();
    message.from = object.from ?? '';
    message.amount = object.amount ?? '';
    message.destinationDomain = object.destinationDomain ?? 0;
    message.mintRecipient = object.mintRecipient ?? new Uint8Array();
    message.burnToken = object.burnToken ?? '';
    message.destinationCaller = object.destinationCaller ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(
    message: MsgDepositForBurnWithCallerProtoMsg,
  ): MsgDepositForBurnWithCaller {
    return MsgDepositForBurnWithCaller.decode(message.value);
  },
  toProto(message: MsgDepositForBurnWithCaller): Uint8Array {
    return MsgDepositForBurnWithCaller.encode(message).finish();
  },
  toProtoMsg(
    message: MsgDepositForBurnWithCaller,
  ): MsgDepositForBurnWithCallerProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCaller',
      value: MsgDepositForBurnWithCaller.encode(message).finish(),
    };
  },
};
function createBaseMsgDepositForBurnWithCallerResponse(): MsgDepositForBurnWithCallerResponse {
  return {
    nonce: BigInt(0),
  };
}
export const MsgDepositForBurnWithCallerResponse = {
  typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCallerResponse',
  encode(
    message: MsgDepositForBurnWithCallerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.nonce !== BigInt(0)) {
      writer.uint32(8).uint64(message.nonce);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgDepositForBurnWithCallerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgDepositForBurnWithCallerResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.nonce = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgDepositForBurnWithCallerResponse {
    return {
      nonce: isSet(object.nonce) ? BigInt(object.nonce.toString()) : BigInt(0),
    };
  },
  toJSON(
    message: MsgDepositForBurnWithCallerResponse,
  ): JsonSafe<MsgDepositForBurnWithCallerResponse> {
    const obj: any = {};
    message.nonce !== undefined &&
      (obj.nonce = (message.nonce || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<MsgDepositForBurnWithCallerResponse>,
  ): MsgDepositForBurnWithCallerResponse {
    const message = createBaseMsgDepositForBurnWithCallerResponse();
    message.nonce =
      object.nonce !== undefined && object.nonce !== null
        ? BigInt(object.nonce.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: MsgDepositForBurnWithCallerResponseProtoMsg,
  ): MsgDepositForBurnWithCallerResponse {
    return MsgDepositForBurnWithCallerResponse.decode(message.value);
  },
  toProto(message: MsgDepositForBurnWithCallerResponse): Uint8Array {
    return MsgDepositForBurnWithCallerResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgDepositForBurnWithCallerResponse,
  ): MsgDepositForBurnWithCallerResponseProtoMsg {
    return {
      typeUrl: '/circle.cctp.v1.MsgDepositForBurnWithCallerResponse',
      value: MsgDepositForBurnWithCallerResponse.encode(message).finish(),
    };
  },
};
