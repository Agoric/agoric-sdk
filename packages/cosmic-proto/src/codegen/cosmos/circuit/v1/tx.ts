//@ts-nocheck
import { Permissions, type PermissionsSDKType } from './types.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/** MsgAuthorizeCircuitBreaker defines the Msg/AuthorizeCircuitBreaker request type. */
export interface MsgAuthorizeCircuitBreaker {
  /**
   * granter is the granter of the circuit breaker permissions and must have
   * LEVEL_SUPER_ADMIN.
   */
  granter: string;
  /** grantee is the account authorized with the provided permissions. */
  grantee: string;
  /**
   * permissions are the circuit breaker permissions that the grantee receives.
   * These will overwrite any existing permissions. LEVEL_NONE_UNSPECIFIED can
   * be specified to revoke all permissions.
   */
  permissions?: Permissions;
}
export interface MsgAuthorizeCircuitBreakerProtoMsg {
  typeUrl: '/cosmos.circuit.v1.MsgAuthorizeCircuitBreaker';
  value: Uint8Array;
}
/** MsgAuthorizeCircuitBreaker defines the Msg/AuthorizeCircuitBreaker request type. */
export interface MsgAuthorizeCircuitBreakerSDKType {
  granter: string;
  grantee: string;
  permissions?: PermissionsSDKType;
}
/** MsgAuthorizeCircuitBreakerResponse defines the Msg/AuthorizeCircuitBreaker response type. */
export interface MsgAuthorizeCircuitBreakerResponse {
  success: boolean;
}
export interface MsgAuthorizeCircuitBreakerResponseProtoMsg {
  typeUrl: '/cosmos.circuit.v1.MsgAuthorizeCircuitBreakerResponse';
  value: Uint8Array;
}
/** MsgAuthorizeCircuitBreakerResponse defines the Msg/AuthorizeCircuitBreaker response type. */
export interface MsgAuthorizeCircuitBreakerResponseSDKType {
  success: boolean;
}
/** MsgTripCircuitBreaker defines the Msg/TripCircuitBreaker request type. */
export interface MsgTripCircuitBreaker {
  /** authority is the account authorized to trip the circuit breaker. */
  authority: string;
  /**
   * msg_type_urls specifies a list of type URLs to immediately stop processing.
   * IF IT IS LEFT EMPTY, ALL MSG PROCESSING WILL STOP IMMEDIATELY.
   * This value is validated against the authority's permissions and if the
   * authority does not have permissions to trip the specified msg type URLs
   * (or all URLs), the operation will fail.
   */
  msgTypeUrls: string[];
}
export interface MsgTripCircuitBreakerProtoMsg {
  typeUrl: '/cosmos.circuit.v1.MsgTripCircuitBreaker';
  value: Uint8Array;
}
/** MsgTripCircuitBreaker defines the Msg/TripCircuitBreaker request type. */
export interface MsgTripCircuitBreakerSDKType {
  authority: string;
  msg_type_urls: string[];
}
/** MsgTripCircuitBreakerResponse defines the Msg/TripCircuitBreaker response type. */
export interface MsgTripCircuitBreakerResponse {
  success: boolean;
}
export interface MsgTripCircuitBreakerResponseProtoMsg {
  typeUrl: '/cosmos.circuit.v1.MsgTripCircuitBreakerResponse';
  value: Uint8Array;
}
/** MsgTripCircuitBreakerResponse defines the Msg/TripCircuitBreaker response type. */
export interface MsgTripCircuitBreakerResponseSDKType {
  success: boolean;
}
/** MsgResetCircuitBreaker defines the Msg/ResetCircuitBreaker request type. */
export interface MsgResetCircuitBreaker {
  /** authority is the account authorized to trip or reset the circuit breaker. */
  authority: string;
  /**
   * msg_type_urls specifies a list of Msg type URLs to resume processing. If
   * it is left empty all Msg processing for type URLs that the account is
   * authorized to trip will resume.
   */
  msgTypeUrls: string[];
}
export interface MsgResetCircuitBreakerProtoMsg {
  typeUrl: '/cosmos.circuit.v1.MsgResetCircuitBreaker';
  value: Uint8Array;
}
/** MsgResetCircuitBreaker defines the Msg/ResetCircuitBreaker request type. */
export interface MsgResetCircuitBreakerSDKType {
  authority: string;
  msg_type_urls: string[];
}
/** MsgResetCircuitBreakerResponse defines the Msg/ResetCircuitBreaker response type. */
export interface MsgResetCircuitBreakerResponse {
  success: boolean;
}
export interface MsgResetCircuitBreakerResponseProtoMsg {
  typeUrl: '/cosmos.circuit.v1.MsgResetCircuitBreakerResponse';
  value: Uint8Array;
}
/** MsgResetCircuitBreakerResponse defines the Msg/ResetCircuitBreaker response type. */
export interface MsgResetCircuitBreakerResponseSDKType {
  success: boolean;
}
function createBaseMsgAuthorizeCircuitBreaker(): MsgAuthorizeCircuitBreaker {
  return {
    granter: '',
    grantee: '',
    permissions: undefined,
  };
}
export const MsgAuthorizeCircuitBreaker = {
  typeUrl: '/cosmos.circuit.v1.MsgAuthorizeCircuitBreaker',
  encode(
    message: MsgAuthorizeCircuitBreaker,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.granter !== '') {
      writer.uint32(10).string(message.granter);
    }
    if (message.grantee !== '') {
      writer.uint32(18).string(message.grantee);
    }
    if (message.permissions !== undefined) {
      Permissions.encode(
        message.permissions,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgAuthorizeCircuitBreaker {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAuthorizeCircuitBreaker();
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
          message.permissions = Permissions.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgAuthorizeCircuitBreaker {
    return {
      granter: isSet(object.granter) ? String(object.granter) : '',
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
      permissions: isSet(object.permissions)
        ? Permissions.fromJSON(object.permissions)
        : undefined,
    };
  },
  toJSON(
    message: MsgAuthorizeCircuitBreaker,
  ): JsonSafe<MsgAuthorizeCircuitBreaker> {
    const obj: any = {};
    message.granter !== undefined && (obj.granter = message.granter);
    message.grantee !== undefined && (obj.grantee = message.grantee);
    message.permissions !== undefined &&
      (obj.permissions = message.permissions
        ? Permissions.toJSON(message.permissions)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<MsgAuthorizeCircuitBreaker>,
  ): MsgAuthorizeCircuitBreaker {
    const message = createBaseMsgAuthorizeCircuitBreaker();
    message.granter = object.granter ?? '';
    message.grantee = object.grantee ?? '';
    message.permissions =
      object.permissions !== undefined && object.permissions !== null
        ? Permissions.fromPartial(object.permissions)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: MsgAuthorizeCircuitBreakerProtoMsg,
  ): MsgAuthorizeCircuitBreaker {
    return MsgAuthorizeCircuitBreaker.decode(message.value);
  },
  toProto(message: MsgAuthorizeCircuitBreaker): Uint8Array {
    return MsgAuthorizeCircuitBreaker.encode(message).finish();
  },
  toProtoMsg(
    message: MsgAuthorizeCircuitBreaker,
  ): MsgAuthorizeCircuitBreakerProtoMsg {
    return {
      typeUrl: '/cosmos.circuit.v1.MsgAuthorizeCircuitBreaker',
      value: MsgAuthorizeCircuitBreaker.encode(message).finish(),
    };
  },
};
function createBaseMsgAuthorizeCircuitBreakerResponse(): MsgAuthorizeCircuitBreakerResponse {
  return {
    success: false,
  };
}
export const MsgAuthorizeCircuitBreakerResponse = {
  typeUrl: '/cosmos.circuit.v1.MsgAuthorizeCircuitBreakerResponse',
  encode(
    message: MsgAuthorizeCircuitBreakerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.success === true) {
      writer.uint32(8).bool(message.success);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgAuthorizeCircuitBreakerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgAuthorizeCircuitBreakerResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.success = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgAuthorizeCircuitBreakerResponse {
    return {
      success: isSet(object.success) ? Boolean(object.success) : false,
    };
  },
  toJSON(
    message: MsgAuthorizeCircuitBreakerResponse,
  ): JsonSafe<MsgAuthorizeCircuitBreakerResponse> {
    const obj: any = {};
    message.success !== undefined && (obj.success = message.success);
    return obj;
  },
  fromPartial(
    object: Partial<MsgAuthorizeCircuitBreakerResponse>,
  ): MsgAuthorizeCircuitBreakerResponse {
    const message = createBaseMsgAuthorizeCircuitBreakerResponse();
    message.success = object.success ?? false;
    return message;
  },
  fromProtoMsg(
    message: MsgAuthorizeCircuitBreakerResponseProtoMsg,
  ): MsgAuthorizeCircuitBreakerResponse {
    return MsgAuthorizeCircuitBreakerResponse.decode(message.value);
  },
  toProto(message: MsgAuthorizeCircuitBreakerResponse): Uint8Array {
    return MsgAuthorizeCircuitBreakerResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgAuthorizeCircuitBreakerResponse,
  ): MsgAuthorizeCircuitBreakerResponseProtoMsg {
    return {
      typeUrl: '/cosmos.circuit.v1.MsgAuthorizeCircuitBreakerResponse',
      value: MsgAuthorizeCircuitBreakerResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgTripCircuitBreaker(): MsgTripCircuitBreaker {
  return {
    authority: '',
    msgTypeUrls: [],
  };
}
export const MsgTripCircuitBreaker = {
  typeUrl: '/cosmos.circuit.v1.MsgTripCircuitBreaker',
  encode(
    message: MsgTripCircuitBreaker,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
    }
    for (const v of message.msgTypeUrls) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgTripCircuitBreaker {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgTripCircuitBreaker();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 2:
          message.msgTypeUrls.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgTripCircuitBreaker {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
      msgTypeUrls: Array.isArray(object?.msgTypeUrls)
        ? object.msgTypeUrls.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: MsgTripCircuitBreaker): JsonSafe<MsgTripCircuitBreaker> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    if (message.msgTypeUrls) {
      obj.msgTypeUrls = message.msgTypeUrls.map(e => e);
    } else {
      obj.msgTypeUrls = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgTripCircuitBreaker>): MsgTripCircuitBreaker {
    const message = createBaseMsgTripCircuitBreaker();
    message.authority = object.authority ?? '';
    message.msgTypeUrls = object.msgTypeUrls?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(message: MsgTripCircuitBreakerProtoMsg): MsgTripCircuitBreaker {
    return MsgTripCircuitBreaker.decode(message.value);
  },
  toProto(message: MsgTripCircuitBreaker): Uint8Array {
    return MsgTripCircuitBreaker.encode(message).finish();
  },
  toProtoMsg(message: MsgTripCircuitBreaker): MsgTripCircuitBreakerProtoMsg {
    return {
      typeUrl: '/cosmos.circuit.v1.MsgTripCircuitBreaker',
      value: MsgTripCircuitBreaker.encode(message).finish(),
    };
  },
};
function createBaseMsgTripCircuitBreakerResponse(): MsgTripCircuitBreakerResponse {
  return {
    success: false,
  };
}
export const MsgTripCircuitBreakerResponse = {
  typeUrl: '/cosmos.circuit.v1.MsgTripCircuitBreakerResponse',
  encode(
    message: MsgTripCircuitBreakerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.success === true) {
      writer.uint32(8).bool(message.success);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgTripCircuitBreakerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgTripCircuitBreakerResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.success = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgTripCircuitBreakerResponse {
    return {
      success: isSet(object.success) ? Boolean(object.success) : false,
    };
  },
  toJSON(
    message: MsgTripCircuitBreakerResponse,
  ): JsonSafe<MsgTripCircuitBreakerResponse> {
    const obj: any = {};
    message.success !== undefined && (obj.success = message.success);
    return obj;
  },
  fromPartial(
    object: Partial<MsgTripCircuitBreakerResponse>,
  ): MsgTripCircuitBreakerResponse {
    const message = createBaseMsgTripCircuitBreakerResponse();
    message.success = object.success ?? false;
    return message;
  },
  fromProtoMsg(
    message: MsgTripCircuitBreakerResponseProtoMsg,
  ): MsgTripCircuitBreakerResponse {
    return MsgTripCircuitBreakerResponse.decode(message.value);
  },
  toProto(message: MsgTripCircuitBreakerResponse): Uint8Array {
    return MsgTripCircuitBreakerResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgTripCircuitBreakerResponse,
  ): MsgTripCircuitBreakerResponseProtoMsg {
    return {
      typeUrl: '/cosmos.circuit.v1.MsgTripCircuitBreakerResponse',
      value: MsgTripCircuitBreakerResponse.encode(message).finish(),
    };
  },
};
function createBaseMsgResetCircuitBreaker(): MsgResetCircuitBreaker {
  return {
    authority: '',
    msgTypeUrls: [],
  };
}
export const MsgResetCircuitBreaker = {
  typeUrl: '/cosmos.circuit.v1.MsgResetCircuitBreaker',
  encode(
    message: MsgResetCircuitBreaker,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authority !== '') {
      writer.uint32(10).string(message.authority);
    }
    for (const v of message.msgTypeUrls) {
      writer.uint32(26).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgResetCircuitBreaker {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgResetCircuitBreaker();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authority = reader.string();
          break;
        case 3:
          message.msgTypeUrls.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgResetCircuitBreaker {
    return {
      authority: isSet(object.authority) ? String(object.authority) : '',
      msgTypeUrls: Array.isArray(object?.msgTypeUrls)
        ? object.msgTypeUrls.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(message: MsgResetCircuitBreaker): JsonSafe<MsgResetCircuitBreaker> {
    const obj: any = {};
    message.authority !== undefined && (obj.authority = message.authority);
    if (message.msgTypeUrls) {
      obj.msgTypeUrls = message.msgTypeUrls.map(e => e);
    } else {
      obj.msgTypeUrls = [];
    }
    return obj;
  },
  fromPartial(object: Partial<MsgResetCircuitBreaker>): MsgResetCircuitBreaker {
    const message = createBaseMsgResetCircuitBreaker();
    message.authority = object.authority ?? '';
    message.msgTypeUrls = object.msgTypeUrls?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(
    message: MsgResetCircuitBreakerProtoMsg,
  ): MsgResetCircuitBreaker {
    return MsgResetCircuitBreaker.decode(message.value);
  },
  toProto(message: MsgResetCircuitBreaker): Uint8Array {
    return MsgResetCircuitBreaker.encode(message).finish();
  },
  toProtoMsg(message: MsgResetCircuitBreaker): MsgResetCircuitBreakerProtoMsg {
    return {
      typeUrl: '/cosmos.circuit.v1.MsgResetCircuitBreaker',
      value: MsgResetCircuitBreaker.encode(message).finish(),
    };
  },
};
function createBaseMsgResetCircuitBreakerResponse(): MsgResetCircuitBreakerResponse {
  return {
    success: false,
  };
}
export const MsgResetCircuitBreakerResponse = {
  typeUrl: '/cosmos.circuit.v1.MsgResetCircuitBreakerResponse',
  encode(
    message: MsgResetCircuitBreakerResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.success === true) {
      writer.uint32(8).bool(message.success);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): MsgResetCircuitBreakerResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgResetCircuitBreakerResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.success = reader.bool();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): MsgResetCircuitBreakerResponse {
    return {
      success: isSet(object.success) ? Boolean(object.success) : false,
    };
  },
  toJSON(
    message: MsgResetCircuitBreakerResponse,
  ): JsonSafe<MsgResetCircuitBreakerResponse> {
    const obj: any = {};
    message.success !== undefined && (obj.success = message.success);
    return obj;
  },
  fromPartial(
    object: Partial<MsgResetCircuitBreakerResponse>,
  ): MsgResetCircuitBreakerResponse {
    const message = createBaseMsgResetCircuitBreakerResponse();
    message.success = object.success ?? false;
    return message;
  },
  fromProtoMsg(
    message: MsgResetCircuitBreakerResponseProtoMsg,
  ): MsgResetCircuitBreakerResponse {
    return MsgResetCircuitBreakerResponse.decode(message.value);
  },
  toProto(message: MsgResetCircuitBreakerResponse): Uint8Array {
    return MsgResetCircuitBreakerResponse.encode(message).finish();
  },
  toProtoMsg(
    message: MsgResetCircuitBreakerResponse,
  ): MsgResetCircuitBreakerResponseProtoMsg {
    return {
      typeUrl: '/cosmos.circuit.v1.MsgResetCircuitBreakerResponse',
      value: MsgResetCircuitBreakerResponse.encode(message).finish(),
    };
  },
};
