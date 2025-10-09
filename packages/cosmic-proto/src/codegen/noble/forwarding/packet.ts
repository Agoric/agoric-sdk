//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { type JsonSafe } from '../../json-safe.js';
export interface RegisterAccountData {
  recipient: string;
  channel: string;
  fallback: string;
}
export interface RegisterAccountDataProtoMsg {
  typeUrl: '/noble.forwarding.v1.RegisterAccountData';
  value: Uint8Array;
}
export interface RegisterAccountDataSDKType {
  recipient: string;
  channel: string;
  fallback: string;
}
export interface RegisterAccountMemo {
  noble?: RegisterAccountMemo_RegisterAccountDataWrapper;
}
export interface RegisterAccountMemoProtoMsg {
  typeUrl: '/noble.forwarding.v1.RegisterAccountMemo';
  value: Uint8Array;
}
export interface RegisterAccountMemoSDKType {
  noble?: RegisterAccountMemo_RegisterAccountDataWrapperSDKType;
}
export interface RegisterAccountMemo_RegisterAccountDataWrapper {
  forwarding?: RegisterAccountData;
}
export interface RegisterAccountMemo_RegisterAccountDataWrapperProtoMsg {
  typeUrl: '/noble.forwarding.v1.RegisterAccountDataWrapper';
  value: Uint8Array;
}
export interface RegisterAccountMemo_RegisterAccountDataWrapperSDKType {
  forwarding?: RegisterAccountDataSDKType;
}
function createBaseRegisterAccountData(): RegisterAccountData {
  return {
    recipient: '',
    channel: '',
    fallback: '',
  };
}
export const RegisterAccountData = {
  typeUrl: '/noble.forwarding.v1.RegisterAccountData' as const,
  encode(
    message: RegisterAccountData,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.recipient !== '') {
      writer.uint32(10).string(message.recipient);
    }
    if (message.channel !== '') {
      writer.uint32(18).string(message.channel);
    }
    if (message.fallback !== '') {
      writer.uint32(26).string(message.fallback);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RegisterAccountData {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegisterAccountData();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.recipient = reader.string();
          break;
        case 2:
          message.channel = reader.string();
          break;
        case 3:
          message.fallback = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RegisterAccountData {
    return {
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
      channel: isSet(object.channel) ? String(object.channel) : '',
      fallback: isSet(object.fallback) ? String(object.fallback) : '',
    };
  },
  toJSON(message: RegisterAccountData): JsonSafe<RegisterAccountData> {
    const obj: any = {};
    message.recipient !== undefined && (obj.recipient = message.recipient);
    message.channel !== undefined && (obj.channel = message.channel);
    message.fallback !== undefined && (obj.fallback = message.fallback);
    return obj;
  },
  fromPartial(object: Partial<RegisterAccountData>): RegisterAccountData {
    const message = createBaseRegisterAccountData();
    message.recipient = object.recipient ?? '';
    message.channel = object.channel ?? '';
    message.fallback = object.fallback ?? '';
    return message;
  },
  fromProtoMsg(message: RegisterAccountDataProtoMsg): RegisterAccountData {
    return RegisterAccountData.decode(message.value);
  },
  toProto(message: RegisterAccountData): Uint8Array {
    return RegisterAccountData.encode(message).finish();
  },
  toProtoMsg(message: RegisterAccountData): RegisterAccountDataProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.RegisterAccountData',
      value: RegisterAccountData.encode(message).finish(),
    };
  },
};
function createBaseRegisterAccountMemo(): RegisterAccountMemo {
  return {
    noble: undefined,
  };
}
export const RegisterAccountMemo = {
  typeUrl: '/noble.forwarding.v1.RegisterAccountMemo' as const,
  encode(
    message: RegisterAccountMemo,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.noble !== undefined) {
      RegisterAccountMemo_RegisterAccountDataWrapper.encode(
        message.noble,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RegisterAccountMemo {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegisterAccountMemo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.noble = RegisterAccountMemo_RegisterAccountDataWrapper.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RegisterAccountMemo {
    return {
      noble: isSet(object.noble)
        ? RegisterAccountMemo_RegisterAccountDataWrapper.fromJSON(object.noble)
        : undefined,
    };
  },
  toJSON(message: RegisterAccountMemo): JsonSafe<RegisterAccountMemo> {
    const obj: any = {};
    message.noble !== undefined &&
      (obj.noble = message.noble
        ? RegisterAccountMemo_RegisterAccountDataWrapper.toJSON(message.noble)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<RegisterAccountMemo>): RegisterAccountMemo {
    const message = createBaseRegisterAccountMemo();
    message.noble =
      object.noble !== undefined && object.noble !== null
        ? RegisterAccountMemo_RegisterAccountDataWrapper.fromPartial(
            object.noble,
          )
        : undefined;
    return message;
  },
  fromProtoMsg(message: RegisterAccountMemoProtoMsg): RegisterAccountMemo {
    return RegisterAccountMemo.decode(message.value);
  },
  toProto(message: RegisterAccountMemo): Uint8Array {
    return RegisterAccountMemo.encode(message).finish();
  },
  toProtoMsg(message: RegisterAccountMemo): RegisterAccountMemoProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.RegisterAccountMemo',
      value: RegisterAccountMemo.encode(message).finish(),
    };
  },
};
function createBaseRegisterAccountMemo_RegisterAccountDataWrapper(): RegisterAccountMemo_RegisterAccountDataWrapper {
  return {
    forwarding: undefined,
  };
}
export const RegisterAccountMemo_RegisterAccountDataWrapper = {
  typeUrl: '/noble.forwarding.v1.RegisterAccountDataWrapper' as const,
  encode(
    message: RegisterAccountMemo_RegisterAccountDataWrapper,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.forwarding !== undefined) {
      RegisterAccountData.encode(
        message.forwarding,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): RegisterAccountMemo_RegisterAccountDataWrapper {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRegisterAccountMemo_RegisterAccountDataWrapper();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.forwarding = RegisterAccountData.decode(
            reader,
            reader.uint32(),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): RegisterAccountMemo_RegisterAccountDataWrapper {
    return {
      forwarding: isSet(object.forwarding)
        ? RegisterAccountData.fromJSON(object.forwarding)
        : undefined,
    };
  },
  toJSON(
    message: RegisterAccountMemo_RegisterAccountDataWrapper,
  ): JsonSafe<RegisterAccountMemo_RegisterAccountDataWrapper> {
    const obj: any = {};
    message.forwarding !== undefined &&
      (obj.forwarding = message.forwarding
        ? RegisterAccountData.toJSON(message.forwarding)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<RegisterAccountMemo_RegisterAccountDataWrapper>,
  ): RegisterAccountMemo_RegisterAccountDataWrapper {
    const message = createBaseRegisterAccountMemo_RegisterAccountDataWrapper();
    message.forwarding =
      object.forwarding !== undefined && object.forwarding !== null
        ? RegisterAccountData.fromPartial(object.forwarding)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: RegisterAccountMemo_RegisterAccountDataWrapperProtoMsg,
  ): RegisterAccountMemo_RegisterAccountDataWrapper {
    return RegisterAccountMemo_RegisterAccountDataWrapper.decode(message.value);
  },
  toProto(message: RegisterAccountMemo_RegisterAccountDataWrapper): Uint8Array {
    return RegisterAccountMemo_RegisterAccountDataWrapper.encode(
      message,
    ).finish();
  },
  toProtoMsg(
    message: RegisterAccountMemo_RegisterAccountDataWrapper,
  ): RegisterAccountMemo_RegisterAccountDataWrapperProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.RegisterAccountDataWrapper',
      value:
        RegisterAccountMemo_RegisterAccountDataWrapper.encode(message).finish(),
    };
  },
};
