//@ts-nocheck
import { Grant, type GrantSDKType } from './authz.js';
import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { GlobalDecoderRegistry } from '../../../registry.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/**
 * MsgGrant is a request type for Grant method. It declares authorization to the grantee
 * on behalf of the granter with the provided expiration time.
 * @name MsgGrant
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgGrant
 */
export interface MsgGrant {
  granter: string;
  grantee: string;
  grant: Grant;
}
export interface MsgGrantProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.MsgGrant';
  value: Uint8Array;
}
/**
 * MsgGrant is a request type for Grant method. It declares authorization to the grantee
 * on behalf of the granter with the provided expiration time.
 * @name MsgGrantSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgGrant
 */
export interface MsgGrantSDKType {
  granter: string;
  grantee: string;
  grant: GrantSDKType;
}
/**
 * MsgGrantResponse defines the Msg/MsgGrant response type.
 * @name MsgGrantResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgGrantResponse
 */
export interface MsgGrantResponse {}
export interface MsgGrantResponseProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.MsgGrantResponse';
  value: Uint8Array;
}
/**
 * MsgGrantResponse defines the Msg/MsgGrant response type.
 * @name MsgGrantResponseSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgGrantResponse
 */
export interface MsgGrantResponseSDKType {}
/**
 * MsgExec attempts to execute the provided messages using
 * authorizations granted to the grantee. Each message should have only
 * one signer corresponding to the granter of the authorization.
 * @name MsgExec
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgExec
 */
export interface MsgExec {
  grantee: string;
  /**
   * Execute Msg.
   * The x/authz will try to find a grant matching (msg.signers[0], grantee, MsgTypeURL(msg))
   * triple and validate it.
   */
  msgs: Any[] | Any[];
}
export interface MsgExecProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.MsgExec';
  value: Uint8Array;
}
/**
 * MsgExec attempts to execute the provided messages using
 * authorizations granted to the grantee. Each message should have only
 * one signer corresponding to the granter of the authorization.
 * @name MsgExecSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgExec
 */
export interface MsgExecSDKType {
  grantee: string;
  msgs: AnySDKType[];
}
/**
 * MsgExecResponse defines the Msg/MsgExecResponse response type.
 * @name MsgExecResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgExecResponse
 */
export interface MsgExecResponse {
  results: Uint8Array[];
}
export interface MsgExecResponseProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.MsgExecResponse';
  value: Uint8Array;
}
/**
 * MsgExecResponse defines the Msg/MsgExecResponse response type.
 * @name MsgExecResponseSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgExecResponse
 */
export interface MsgExecResponseSDKType {
  results: Uint8Array[];
}
/**
 * MsgRevoke revokes any authorization with the provided sdk.Msg type on the
 * granter's account with that has been granted to the grantee.
 * @name MsgRevoke
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgRevoke
 */
export interface MsgRevoke {
  granter: string;
  grantee: string;
  msgTypeUrl: string;
}
export interface MsgRevokeProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.MsgRevoke';
  value: Uint8Array;
}
/**
 * MsgRevoke revokes any authorization with the provided sdk.Msg type on the
 * granter's account with that has been granted to the grantee.
 * @name MsgRevokeSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgRevoke
 */
export interface MsgRevokeSDKType {
  granter: string;
  grantee: string;
  msg_type_url: string;
}
/**
 * MsgRevokeResponse defines the Msg/MsgRevokeResponse response type.
 * @name MsgRevokeResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgRevokeResponse
 */
export interface MsgRevokeResponse {}
export interface MsgRevokeResponseProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.MsgRevokeResponse';
  value: Uint8Array;
}
/**
 * MsgRevokeResponse defines the Msg/MsgRevokeResponse response type.
 * @name MsgRevokeResponseSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgRevokeResponse
 */
export interface MsgRevokeResponseSDKType {}
function createBaseMsgGrant(): MsgGrant {
  return {
    granter: '',
    grantee: '',
    grant: Grant.fromPartial({}),
  };
}
/**
 * MsgGrant is a request type for Grant method. It declares authorization to the grantee
 * on behalf of the granter with the provided expiration time.
 * @name MsgGrant
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgGrant
 */
export const MsgGrant = {
  typeUrl: '/cosmos.authz.v1beta1.MsgGrant' as const,
  aminoType: 'cosmos-sdk/MsgGrant' as const,
  is(o: any): o is MsgGrant {
    return (
      o &&
      (o.$typeUrl === MsgGrant.typeUrl ||
        (typeof o.granter === 'string' &&
          typeof o.grantee === 'string' &&
          Grant.is(o.grant)))
    );
  },
  isSDK(o: any): o is MsgGrantSDKType {
    return (
      o &&
      (o.$typeUrl === MsgGrant.typeUrl ||
        (typeof o.granter === 'string' &&
          typeof o.grantee === 'string' &&
          Grant.isSDK(o.grant)))
    );
  },
  encode(
    message: MsgGrant,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.granter !== '') {
      writer.uint32(10).string(message.granter);
    }
    if (message.grantee !== '') {
      writer.uint32(18).string(message.grantee);
    }
    if (message.grant !== undefined) {
      Grant.encode(message.grant, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgGrant {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgGrant();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.granter = reader.string();
          break;
        case 2:
          message.grantee = reader.string();
          break;
        case 3:
          message.grant = Grant.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgGrant {
    return {
      granter: isSet(object.granter) ? String(object.granter) : '',
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
      grant: isSet(object.grant) ? Grant.fromJSON(object.grant) : undefined,
    };
  },
  toJSON(message: MsgGrant): JsonSafe<MsgGrant> {
    const obj: any = {};
    message.granter !== undefined && (obj.granter = message.granter);
    message.grantee !== undefined && (obj.grantee = message.grantee);
    message.grant !== undefined &&
      (obj.grant = message.grant ? Grant.toJSON(message.grant) : undefined);
    return obj;
  },
  fromPartial(object: Partial<MsgGrant>): MsgGrant {
    const message = createBaseMsgGrant();
    message.granter = object.granter ?? '';
    message.grantee = object.grantee ?? '';
    message.grant =
      object.grant !== undefined && object.grant !== null
        ? Grant.fromPartial(object.grant)
        : undefined;
    return message;
  },
  fromProtoMsg(message: MsgGrantProtoMsg): MsgGrant {
    return MsgGrant.decode(message.value);
  },
  toProto(message: MsgGrant): Uint8Array {
    return MsgGrant.encode(message).finish();
  },
  toProtoMsg(message: MsgGrant): MsgGrantProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.MsgGrant',
      value: MsgGrant.encode(message).finish(),
    };
  },
};
function createBaseMsgGrantResponse(): MsgGrantResponse {
  return {};
}
/**
 * MsgGrantResponse defines the Msg/MsgGrant response type.
 * @name MsgGrantResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgGrantResponse
 */
export const MsgGrantResponse = {
  typeUrl: '/cosmos.authz.v1beta1.MsgGrantResponse' as const,
  aminoType: 'cosmos-sdk/MsgGrantResponse' as const,
  is(o: any): o is MsgGrantResponse {
    return o && o.$typeUrl === MsgGrantResponse.typeUrl;
  },
  isSDK(o: any): o is MsgGrantResponseSDKType {
    return o && o.$typeUrl === MsgGrantResponse.typeUrl;
  },
  encode(
    _: MsgGrantResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgGrantResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgGrantResponse();
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
  fromJSON(_: any): MsgGrantResponse {
    return {};
  },
  toJSON(_: MsgGrantResponse): JsonSafe<MsgGrantResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgGrantResponse>): MsgGrantResponse {
    const message = createBaseMsgGrantResponse();
    return message;
  },
  fromProtoMsg(message: MsgGrantResponseProtoMsg): MsgGrantResponse {
    return MsgGrantResponse.decode(message.value);
  },
  toProto(message: MsgGrantResponse): Uint8Array {
    return MsgGrantResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgGrantResponse): MsgGrantResponseProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.MsgGrantResponse',
      value: MsgGrantResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgExec(): MsgExec {
  return {
    grantee: '',
    msgs: [],
  };
}
/**
 * MsgExec attempts to execute the provided messages using
 * authorizations granted to the grantee. Each message should have only
 * one signer corresponding to the granter of the authorization.
 * @name MsgExec
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgExec
 */
export const MsgExec = {
  typeUrl: '/cosmos.authz.v1beta1.MsgExec' as const,
  aminoType: 'cosmos-sdk/MsgExec' as const,
  is(o: any): o is MsgExec {
    return (
      o &&
      (o.$typeUrl === MsgExec.typeUrl ||
        (typeof o.grantee === 'string' &&
          Array.isArray(o.msgs) &&
          (!o.msgs.length || Any.is(o.msgs[0]))))
    );
  },
  isSDK(o: any): o is MsgExecSDKType {
    return (
      o &&
      (o.$typeUrl === MsgExec.typeUrl ||
        (typeof o.grantee === 'string' &&
          Array.isArray(o.msgs) &&
          (!o.msgs.length || Any.isSDK(o.msgs[0]))))
    );
  },
  encode(
    message: MsgExec,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.grantee !== '') {
      writer.uint32(10).string(message.grantee);
    }
    for (const v of message.msgs) {
      Any.encode(
        GlobalDecoderRegistry.wrapAny(v!),
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgExec {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExec();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.grantee = reader.string();
          break;
        case 2:
          message.msgs.push(GlobalDecoderRegistry.unwrapAny(reader));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgExec {
    return {
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
      msgs: Array.isArray(object?.msgs)
        ? object.msgs.map((e: any) => GlobalDecoderRegistry.fromJSON(e))
        : [],
    };
  },
  toJSON(message: MsgExec): JsonSafe<MsgExec> {
    const obj: any = {};
    message.grantee !== undefined && (obj.grantee = message.grantee);
    if (message.msgs) {
      obj.msgs = message.msgs.map(e =>
        e ? GlobalDecoderRegistry.toJSON(e) : undefined,
      );
    } else {
      obj.msgs = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgExec>): MsgExec {
    const message = createBaseMsgExec();
    message.grantee = object.grantee ?? '';
    message.msgs =
      object.msgs?.map(e => GlobalDecoderRegistry.fromPartial(e) as any) || [];
    return message;
  },
  fromProtoMsg(message: MsgExecProtoMsg): MsgExec {
    return MsgExec.decode(message.value);
  },
  toProto(message: MsgExec): Uint8Array {
    return MsgExec.encode(message).finish();
  },
  toProtoMsg(message: MsgExec): MsgExecProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.MsgExec',
      value: MsgExec.encode(message).finish(),
    };
  },
};
function createBaseMsgExecResponse(): MsgExecResponse {
  return {
    results: [],
  };
}
/**
 * MsgExecResponse defines the Msg/MsgExecResponse response type.
 * @name MsgExecResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgExecResponse
 */
export const MsgExecResponse = {
  typeUrl: '/cosmos.authz.v1beta1.MsgExecResponse' as const,
  aminoType: 'cosmos-sdk/MsgExecResponse' as const,
  is(o: any): o is MsgExecResponse {
    return (
      o &&
      (o.$typeUrl === MsgExecResponse.typeUrl ||
        (Array.isArray(o.results) &&
          (!o.results.length ||
            o.results[0] instanceof Uint8Array ||
            typeof o.results[0] === 'string')))
    );
  },
  isSDK(o: any): o is MsgExecResponseSDKType {
    return (
      o &&
      (o.$typeUrl === MsgExecResponse.typeUrl ||
        (Array.isArray(o.results) &&
          (!o.results.length ||
            o.results[0] instanceof Uint8Array ||
            typeof o.results[0] === 'string')))
    );
  },
  encode(
    message: MsgExecResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.results) {
      writer.uint32(10).bytes(v!);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgExecResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgExecResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.results.push(reader.bytes());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgExecResponse {
    return {
      results: Array.isArray(object?.results)
        ? object.results.map((e: any) => bytesFromBase64(e))
        : [],
    };
  },
  toJSON(message: MsgExecResponse): JsonSafe<MsgExecResponse> {
    const obj: any = {};
    if (message.results) {
      obj.results = message.results.map(e =>
        base64FromBytes(e !== undefined ? e : new Uint8Array()),
      );
    } else {
      obj.results = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgExecResponse>): MsgExecResponse {
    const message = createBaseMsgExecResponse();
    message.results = object.results?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: MsgExecResponseProtoMsg): MsgExecResponse {
    return MsgExecResponse.decode(message.value);
  },
  toProto(message: MsgExecResponse): Uint8Array {
    return MsgExecResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgExecResponse): MsgExecResponseProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.MsgExecResponse',
      value: MsgExecResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgRevoke(): MsgRevoke {
  return {
    granter: '',
    grantee: '',
    msgTypeUrl: '',
  };
}
/**
 * MsgRevoke revokes any authorization with the provided sdk.Msg type on the
 * granter's account with that has been granted to the grantee.
 * @name MsgRevoke
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgRevoke
 */
export const MsgRevoke = {
  typeUrl: '/cosmos.authz.v1beta1.MsgRevoke' as const,
  aminoType: 'cosmos-sdk/MsgRevoke' as const,
  is(o: any): o is MsgRevoke {
    return (
      o &&
      (o.$typeUrl === MsgRevoke.typeUrl ||
        (typeof o.granter === 'string' &&
          typeof o.grantee === 'string' &&
          typeof o.msgTypeUrl === 'string'))
    );
  },
  isSDK(o: any): o is MsgRevokeSDKType {
    return (
      o &&
      (o.$typeUrl === MsgRevoke.typeUrl ||
        (typeof o.granter === 'string' &&
          typeof o.grantee === 'string' &&
          typeof o.msg_type_url === 'string'))
    );
  },
  encode(
    message: MsgRevoke,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.granter !== '') {
      writer.uint32(10).string(message.granter);
    }
    if (message.grantee !== '') {
      writer.uint32(18).string(message.grantee);
    }
    if (message.msgTypeUrl !== '') {
      writer.uint32(26).string(message.msgTypeUrl);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgRevoke {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRevoke();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.granter = reader.string();
          break;
        case 2:
          message.grantee = reader.string();
          break;
        case 3:
          message.msgTypeUrl = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgRevoke {
    return {
      granter: isSet(object.granter) ? String(object.granter) : '',
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
      msgTypeUrl: isSet(object.msgTypeUrl) ? String(object.msgTypeUrl) : '',
    };
  },
  toJSON(message: MsgRevoke): JsonSafe<MsgRevoke> {
    const obj: any = {};
    message.granter !== undefined && (obj.granter = message.granter);
    message.grantee !== undefined && (obj.grantee = message.grantee);
    message.msgTypeUrl !== undefined && (obj.msgTypeUrl = message.msgTypeUrl);
    return obj;
  },
  fromPartial(object: Partial<MsgRevoke>): MsgRevoke {
    const message = createBaseMsgRevoke();
    message.granter = object.granter ?? '';
    message.grantee = object.grantee ?? '';
    message.msgTypeUrl = object.msgTypeUrl ?? '';
    return message;
  },
  fromProtoMsg(message: MsgRevokeProtoMsg): MsgRevoke {
    return MsgRevoke.decode(message.value);
  },
  toProto(message: MsgRevoke): Uint8Array {
    return MsgRevoke.encode(message).finish();
  },
  toProtoMsg(message: MsgRevoke): MsgRevokeProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.MsgRevoke',
      value: MsgRevoke.encode(message).finish(),
    };
  },
};
function createBaseMsgRevokeResponse(): MsgRevokeResponse {
  return {};
}
/**
 * MsgRevokeResponse defines the Msg/MsgRevokeResponse response type.
 * @name MsgRevokeResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.MsgRevokeResponse
 */
export const MsgRevokeResponse = {
  typeUrl: '/cosmos.authz.v1beta1.MsgRevokeResponse' as const,
  aminoType: 'cosmos-sdk/MsgRevokeResponse' as const,
  is(o: any): o is MsgRevokeResponse {
    return o && o.$typeUrl === MsgRevokeResponse.typeUrl;
  },
  isSDK(o: any): o is MsgRevokeResponseSDKType {
    return o && o.$typeUrl === MsgRevokeResponse.typeUrl;
  },
  encode(
    _: MsgRevokeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): MsgRevokeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgRevokeResponse();
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
  fromJSON(_: any): MsgRevokeResponse {
    return {};
  },
  toJSON(_: MsgRevokeResponse): JsonSafe<MsgRevokeResponse> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<MsgRevokeResponse>): MsgRevokeResponse {
    const message = createBaseMsgRevokeResponse();
    return message;
  },
  fromProtoMsg(message: MsgRevokeResponseProtoMsg): MsgRevokeResponse {
    return MsgRevokeResponse.decode(message.value);
  },
  toProto(message: MsgRevokeResponse): Uint8Array {
    return MsgRevokeResponse.encode(message).finish();
  },
  toProtoMsg(message: MsgRevokeResponse): MsgRevokeResponseProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.MsgRevokeResponse',
      value: MsgRevokeResponse.encode(message).finish(),
    };
  },
};
