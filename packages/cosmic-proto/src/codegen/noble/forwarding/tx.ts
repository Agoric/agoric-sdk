//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { type JsonSafe } from '../../json-safe.js';
export interface MsgRegisterAccount {
  signer: string;
  recipient: string;
  channel: string;
  fallback: string;
}
export interface MsgRegisterAccountProtoMsg {
  typeUrl: '/noble.forwarding.v1.MsgRegisterAccount';
  value: Uint8Array;
}
export interface MsgRegisterAccountSDKType {
  signer: string;
  recipient: string;
  channel: string;
  fallback: string;
}
export interface MsgRegisterAccountResponse {
  address: string;
}
export interface MsgRegisterAccountResponseProtoMsg {
  typeUrl: '/noble.forwarding.v1.MsgRegisterAccountResponse';
  value: Uint8Array;
}
export interface MsgRegisterAccountResponseSDKType {
  address: string;
}
export interface MsgClearAccount {
  signer: string;
  address: string;
  fallback: boolean;
}
export interface MsgClearAccountProtoMsg {
  typeUrl: '/noble.forwarding.v1.MsgClearAccount';
  value: Uint8Array;
}
export interface MsgClearAccountSDKType {
  signer: string;
  address: string;
  fallback: boolean;
}
export interface MsgClearAccountResponse {}
export interface MsgClearAccountResponseProtoMsg {
  typeUrl: '/noble.forwarding.v1.MsgClearAccountResponse';
  value: Uint8Array;
}
export interface MsgClearAccountResponseSDKType {}
export interface MsgSetAllowedDenoms {
  signer: string;
  denoms: string[];
}
export interface MsgSetAllowedDenomsProtoMsg {
  typeUrl: '/noble.forwarding.v1.MsgSetAllowedDenoms';
  value: Uint8Array;
}
export interface MsgSetAllowedDenomsSDKType {
  signer: string;
  denoms: string[];
}
export interface MsgSetAllowedDenomsResponse {}
export interface MsgSetAllowedDenomsResponseProtoMsg {
  typeUrl: '/noble.forwarding.v1.MsgSetAllowedDenomsResponse';
  value: Uint8Array;
}
export interface MsgSetAllowedDenomsResponseSDKType {}
function createBaseMsgRegisterAccount(): MsgRegisterAccount {
  return {
    signer: '',
    recipient: '',
    channel: '',
    fallback: '',
  };
}
export const MsgRegisterAccount = {
  typeUrl: '/noble.forwarding.v1.MsgRegisterAccount' as const,
  encode(
    message: MsgRegisterAccount,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.recipient !== '') {
      writer.uint32(18).string(message.recipient);
    }
    if (message.channel !== '') {
      writer.uint32(26).string(message.channel);
    }
    if (message.fallback !== '') {
      writer.uint32(34).string(message.fallback);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRegisterAccount {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRegisterAccount();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.recipient = reader.string();
          break;
        case 3:
          message.channel = reader.string();
          break;
        case 4:
          message.fallback = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRegisterAccount {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
      channel: isSet(object.channel) ? String(object.channel) : '',
      fallback: isSet(object.fallback) ? String(object.fallback) : '',
    };
  },
  toJSON(message: MsgRegisterAccount): JsonSafe<MsgRegisterAccount> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.recipient !== undefined && (obj.recipient = message.recipient);
    message.channel !== undefined && (obj.channel = message.channel);
    message.fallback !== undefined && (obj.fallback = message.fallback);
    return obj;
  },
  fromPartial(object: Partial<MsgRegisterAccount>): MsgRegisterAccount {
    const message = createBaseMsgRegisterAccount();
    message.signer = object.signer ?? '';
    message.recipient = object.recipient ?? '';
    message.channel = object.channel ?? '';
    message.fallback = object.fallback ?? '';
    return message;
  },
  fromProtoMsg(message: MsgRegisterAccountProtoMsg): MsgRegisterAccount {
    return MsgRegisterAccount.decode(message.value);
  },
  toProto(message: MsgRegisterAccount): Uint8Array {
    return MsgRegisterAccount.encode(message).finish();
  },
  toProtoMsg(message: MsgRegisterAccount): MsgRegisterAccountProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.MsgRegisterAccount',
      value: MsgRegisterAccount.encode(message).finish(),
    };
  },
};
function createBaseMsgRegisterAccountResponse(): MsgRegisterAccountResponse {
  return {
    address: '',
  };
}
export const MsgRegisterAccountResponse = {
  typeUrl: '/noble.forwarding.v1.MsgRegisterAccountResponse' as const,
  encode(
    message: MsgRegisterAccountResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.address !== '') {
      writer.uint32(10).string(message.address);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgRegisterAccountResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRegisterAccountResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.address = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRegisterAccountResponse {
    return {
      address: isSet(object.address) ? String(object.address) : '',
    };
  },
  toJSON(
    message: MsgRegisterAccountResponse,
  ): JsonSafe<MsgRegisterAccountResponse> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },
  fromPartial(
    object: Partial<MsgRegisterAccountResponse>,
  ): MsgRegisterAccountResponse {
    const message = createBaseMsgRegisterAccountResponse();
    message.address = object.address ?? '';
    return message;
  },
  fromProtoMsg(
    message: MsgRegisterAccountResponseProtoMsg,
  ): MsgRegisterAccountResponse {
    return MsgRegisterAccountResponse.decode(message.value);
  },
  toProto(message: MsgRegisterAccountResponse): Uint8Array {
    return MsgRegisterAccountResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgRegisterAccountResponse,
  ): MsgRegisterAccountResponseProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.MsgRegisterAccountResponse',
      value: MsgRegisterAccountResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgClearAccount(): MsgClearAccount {
  return {
    signer: '',
    address: '',
    fallback: false,
  };
}
export const MsgClearAccount = {
  typeUrl: '/noble.forwarding.v1.MsgClearAccount' as const,
  encode(
    message: MsgClearAccount,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    if (message.address !== '') {
      writer.uint32(18).string(message.address);
    }
    if (message.fallback === true) {
      writer.uint32(24).bool(message.fallback);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgClearAccount {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgClearAccount();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.address = reader.string();
          break;
        case 3:
          message.fallback = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgClearAccount {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      address: isSet(object.address) ? String(object.address) : '',
      fallback: isSet(object.fallback) ? Boolean(object.fallback) : false,
    };
  },
  toJSON(message: MsgClearAccount): JsonSafe<MsgClearAccount> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    message.address !== undefined && (obj.address = message.address);
    message.fallback !== undefined && (obj.fallback = message.fallback);
    return obj;
  },
  fromPartial(object: Partial<MsgClearAccount>): MsgClearAccount {
    const message = createBaseMsgClearAccount();
    message.signer = object.signer ?? '';
    message.address = object.address ?? '';
    message.fallback = object.fallback ?? false;
    return message;
  },
  fromProtoMsg(message: MsgClearAccountProtoMsg): MsgClearAccount {
    return MsgClearAccount.decode(message.value);
  },
  toProto(message: MsgClearAccount): Uint8Array {
    return MsgClearAccount.encode(message).finish();
  },
  toProtoMsg(message: MsgClearAccount): MsgClearAccountProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.MsgClearAccount',
      value: MsgClearAccount.encode(message).finish(),
    };
  },
};
function createBaseMsgClearAccountResponse(): MsgClearAccountResponse {
  return {};
}
export const MsgClearAccountResponse = {
  typeUrl: '/noble.forwarding.v1.MsgClearAccountResponse' as const,
  encode(
    _: MsgClearAccountResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgClearAccountResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgClearAccountResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgClearAccountResponse {
    return {};
  },
  toJSON(_: MsgClearAccountResponse): JsonSafe<MsgClearAccountResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgClearAccountResponse>): MsgClearAccountResponse {
    const message = createBaseMsgClearAccountResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgClearAccountResponseProtoMsg,
  ): MsgClearAccountResponse {
    return MsgClearAccountResponse.decode(message.value);
  },
  toProto(message: MsgClearAccountResponse): Uint8Array {
    return MsgClearAccountResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgClearAccountResponse,
  ): MsgClearAccountResponseProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.MsgClearAccountResponse',
      value: MsgClearAccountResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgSetAllowedDenoms(): MsgSetAllowedDenoms {
  return {
    signer: '',
    denoms: [],
  };
}
export const MsgSetAllowedDenoms = {
  typeUrl: '/noble.forwarding.v1.MsgSetAllowedDenoms' as const,
  encode(
    message: MsgSetAllowedDenoms,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.signer !== '') {
      writer.uint32(10).string(message.signer);
    }
    for (const v of message.denoms) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetAllowedDenoms {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetAllowedDenoms();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.signer = reader.string();
          break;
        case 2:
          message.denoms.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgSetAllowedDenoms {
    return {
      signer: isSet(object.signer) ? String(object.signer) : '',
      denoms: Array.isArray(object?.denoms)
        ? object.denoms.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: MsgSetAllowedDenoms): JsonSafe<MsgSetAllowedDenoms> {
    const obj: any = {};
    message.signer !== undefined && (obj.signer = message.signer);
    if (message.denoms) {
      obj.denoms = message.denoms.map(e => e);
    } else {
      obj.denoms = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgSetAllowedDenoms>): MsgSetAllowedDenoms {
    const message = createBaseMsgSetAllowedDenoms();
    message.signer = object.signer ?? '';
    message.denoms = object.denoms?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: MsgSetAllowedDenomsProtoMsg): MsgSetAllowedDenoms {
    return MsgSetAllowedDenoms.decode(message.value);
  },
  toProto(message: MsgSetAllowedDenoms): Uint8Array {
    return MsgSetAllowedDenoms.encode(message).finish();
  },
  toProtoMsg(message: MsgSetAllowedDenoms): MsgSetAllowedDenomsProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.MsgSetAllowedDenoms',
      value: MsgSetAllowedDenoms.encode(message).finish(),
    };
  },
};
function createBaseMsgSetAllowedDenomsResponse(): MsgSetAllowedDenomsResponse {
  return {};
}
export const MsgSetAllowedDenomsResponse = {
  typeUrl: '/noble.forwarding.v1.MsgSetAllowedDenomsResponse' as const,
  encode(
    _: MsgSetAllowedDenomsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgSetAllowedDenomsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgSetAllowedDenomsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(_: any): MsgSetAllowedDenomsResponse {
    return {};
  },
  toJSON(
    _: MsgSetAllowedDenomsResponse,
  ): JsonSafe<MsgSetAllowedDenomsResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<MsgSetAllowedDenomsResponse>,
  ): MsgSetAllowedDenomsResponse {
    const message = createBaseMsgSetAllowedDenomsResponse();
    return message;
  },
  fromProtoMsg(
    message: MsgSetAllowedDenomsResponseProtoMsg,
  ): MsgSetAllowedDenomsResponse {
    return MsgSetAllowedDenomsResponse.decode(message.value);
  },
  toProto(message: MsgSetAllowedDenomsResponse): Uint8Array {
    return MsgSetAllowedDenomsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgSetAllowedDenomsResponse,
  ): MsgSetAllowedDenomsResponseProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.MsgSetAllowedDenomsResponse',
      value: MsgSetAllowedDenomsResponse.encode(message).finish(),
    };
  },
};
