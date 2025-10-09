//@ts-nocheck
import {
  BaseAccount,
  type BaseAccountSDKType,
} from '../../cosmos/auth/v1beta1/auth.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { isSet } from '../../helpers.js';
import { type JsonSafe } from '../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
export interface ForwardingAccount {
  $typeUrl?: '/noble.forwarding.v1.ForwardingAccount';
  baseAccount?: BaseAccount;
  channel: string;
  recipient: string;
  createdAt: bigint;
  fallback: string;
}
export interface ForwardingAccountProtoMsg {
  typeUrl: '/noble.forwarding.v1.ForwardingAccount';
  value: Uint8Array;
}
export interface ForwardingAccountSDKType {
  $typeUrl?: '/noble.forwarding.v1.ForwardingAccount';
  base_account?: BaseAccountSDKType;
  channel: string;
  recipient: string;
  created_at: bigint;
  fallback: string;
}
export interface ForwardingPubKey {
  key: Uint8Array;
}
export interface ForwardingPubKeyProtoMsg {
  typeUrl: '/noble.forwarding.v1.ForwardingPubKey';
  value: Uint8Array;
}
export interface ForwardingPubKeySDKType {
  key: Uint8Array;
}
function createBaseForwardingAccount(): ForwardingAccount {
  return {
    $typeUrl: '/noble.forwarding.v1.ForwardingAccount',
    baseAccount: undefined,
    channel: '',
    recipient: '',
    createdAt: BigInt(0),
    fallback: '',
  };
}
export const ForwardingAccount = {
  typeUrl: '/noble.forwarding.v1.ForwardingAccount' as const,
  encode(
    message: ForwardingAccount,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.baseAccount !== undefined) {
      BaseAccount.encode(
        message.baseAccount,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    if (message.channel !== '') {
      writer.uint32(18).string(message.channel);
    }
    if (message.recipient !== '') {
      writer.uint32(26).string(message.recipient);
    }
    if (message.createdAt !== BigInt(0)) {
      writer.uint32(32).int64(message.createdAt);
    }
    if (message.fallback !== '') {
      writer.uint32(42).string(message.fallback);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ForwardingAccount {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseForwardingAccount();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.baseAccount = BaseAccount.decode(reader, reader.uint32());
          break;
        case 2:
          message.channel = reader.string();
          break;
        case 3:
          message.recipient = reader.string();
          break;
        case 4:
          message.createdAt = reader.int64();
          break;
        case 5:
          message.fallback = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ForwardingAccount {
    return {
      baseAccount: isSet(object.baseAccount)
        ? BaseAccount.fromJSON(object.baseAccount)
        : undefined,
      channel: isSet(object.channel) ? String(object.channel) : '',
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
      createdAt: isSet(object.createdAt)
        ? BigInt(object.createdAt.toString())
        : BigInt(0),
      fallback: isSet(object.fallback) ? String(object.fallback) : '',
    };
  },
  toJSON(message: ForwardingAccount): JsonSafe<ForwardingAccount> {
    const obj: any = {};
    message.baseAccount !== undefined &&
      (obj.baseAccount = message.baseAccount
        ? BaseAccount.toJSON(message.baseAccount)
        : undefined);
    message.channel !== undefined && (obj.channel = message.channel);
    message.recipient !== undefined && (obj.recipient = message.recipient);
    message.createdAt !== undefined &&
      (obj.createdAt = (message.createdAt || BigInt(0)).toString());
    message.fallback !== undefined && (obj.fallback = message.fallback);
    return obj;
  },
  fromPartial(object: Partial<ForwardingAccount>): ForwardingAccount {
    const message = createBaseForwardingAccount();
    message.baseAccount =
      object.baseAccount !== undefined && object.baseAccount !== null
        ? BaseAccount.fromPartial(object.baseAccount)
        : undefined;
    message.channel = object.channel ?? '';
    message.recipient = object.recipient ?? '';
    message.createdAt =
      object.createdAt !== undefined && object.createdAt !== null
        ? BigInt(object.createdAt.toString())
        : BigInt(0);
    message.fallback = object.fallback ?? '';
    return message;
  },
  fromProtoMsg(message: ForwardingAccountProtoMsg): ForwardingAccount {
    return ForwardingAccount.decode(message.value);
  },
  toProto(message: ForwardingAccount): Uint8Array {
    return ForwardingAccount.encode(message).finish();
  },
  toProtoMsg(message: ForwardingAccount): ForwardingAccountProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.ForwardingAccount',
      value: ForwardingAccount.encode(message).finish(),
    };
  },
};
function createBaseForwardingPubKey(): ForwardingPubKey {
  return {
    key: new Uint8Array(),
  };
}
export const ForwardingPubKey = {
  typeUrl: '/noble.forwarding.v1.ForwardingPubKey' as const,
  encode(
    message: ForwardingPubKey,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.key.length !== 0) {
      writer.uint32(10).bytes(message.key);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): ForwardingPubKey {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseForwardingPubKey();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.key = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): ForwardingPubKey {
    return {
      key: isSet(object.key) ? bytesFromBase64(object.key) : new Uint8Array(),
    };
  },
  toJSON(message: ForwardingPubKey): JsonSafe<ForwardingPubKey> {
    const obj: any = {};
    message.key !== undefined &&
      (obj.key = base64FromBytes(
        message.key !== undefined ? message.key : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<ForwardingPubKey>): ForwardingPubKey {
    const message = createBaseForwardingPubKey();
    message.key = object.key ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: ForwardingPubKeyProtoMsg): ForwardingPubKey {
    return ForwardingPubKey.decode(message.value);
  },
  toProto(message: ForwardingPubKey): Uint8Array {
    return ForwardingPubKey.encode(message).finish();
  },
  toProtoMsg(message: ForwardingPubKey): ForwardingPubKeyProtoMsg {
    return {
      typeUrl: '/noble.forwarding.v1.ForwardingPubKey',
      value: ForwardingPubKey.encode(message).finish(),
    };
  },
};
