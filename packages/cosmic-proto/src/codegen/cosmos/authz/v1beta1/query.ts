//@ts-nocheck
import {
  PageRequest,
  type PageRequestSDKType,
  PageResponse,
  type PageResponseSDKType,
} from '../../base/query/v1beta1/pagination.js';
import {
  Grant,
  type GrantSDKType,
  GrantAuthorization,
  type GrantAuthorizationSDKType,
} from './authz.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * QueryGrantsRequest is the request type for the Query/Grants RPC method.
 * @name QueryGrantsRequest
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGrantsRequest
 */
export interface QueryGrantsRequest {
  granter: string;
  grantee: string;
  /**
   * Optional, msg_type_url, when set, will query only grants matching given msg type.
   */
  msgTypeUrl: string;
  /**
   * pagination defines an pagination for the request.
   */
  pagination?: PageRequest;
}
export interface QueryGrantsRequestProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.QueryGrantsRequest';
  value: Uint8Array;
}
/**
 * QueryGrantsRequest is the request type for the Query/Grants RPC method.
 * @name QueryGrantsRequestSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGrantsRequest
 */
export interface QueryGrantsRequestSDKType {
  granter: string;
  grantee: string;
  msg_type_url: string;
  pagination?: PageRequestSDKType;
}
/**
 * QueryGrantsResponse is the response type for the Query/Authorizations RPC method.
 * @name QueryGrantsResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGrantsResponse
 */
export interface QueryGrantsResponse {
  /**
   * authorizations is a list of grants granted for grantee by granter.
   */
  grants: Grant[];
  /**
   * pagination defines an pagination for the response.
   */
  pagination?: PageResponse;
}
export interface QueryGrantsResponseProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.QueryGrantsResponse';
  value: Uint8Array;
}
/**
 * QueryGrantsResponse is the response type for the Query/Authorizations RPC method.
 * @name QueryGrantsResponseSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGrantsResponse
 */
export interface QueryGrantsResponseSDKType {
  grants: GrantSDKType[];
  pagination?: PageResponseSDKType;
}
/**
 * QueryGranterGrantsRequest is the request type for the Query/GranterGrants RPC method.
 * @name QueryGranterGrantsRequest
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGranterGrantsRequest
 */
export interface QueryGranterGrantsRequest {
  granter: string;
  /**
   * pagination defines an pagination for the request.
   */
  pagination?: PageRequest;
}
export interface QueryGranterGrantsRequestProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.QueryGranterGrantsRequest';
  value: Uint8Array;
}
/**
 * QueryGranterGrantsRequest is the request type for the Query/GranterGrants RPC method.
 * @name QueryGranterGrantsRequestSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGranterGrantsRequest
 */
export interface QueryGranterGrantsRequestSDKType {
  granter: string;
  pagination?: PageRequestSDKType;
}
/**
 * QueryGranterGrantsResponse is the response type for the Query/GranterGrants RPC method.
 * @name QueryGranterGrantsResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGranterGrantsResponse
 */
export interface QueryGranterGrantsResponse {
  /**
   * grants is a list of grants granted by the granter.
   */
  grants: GrantAuthorization[];
  /**
   * pagination defines an pagination for the response.
   */
  pagination?: PageResponse;
}
export interface QueryGranterGrantsResponseProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.QueryGranterGrantsResponse';
  value: Uint8Array;
}
/**
 * QueryGranterGrantsResponse is the response type for the Query/GranterGrants RPC method.
 * @name QueryGranterGrantsResponseSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGranterGrantsResponse
 */
export interface QueryGranterGrantsResponseSDKType {
  grants: GrantAuthorizationSDKType[];
  pagination?: PageResponseSDKType;
}
/**
 * QueryGranteeGrantsRequest is the request type for the Query/GranteeGrants RPC method.
 * @name QueryGranteeGrantsRequest
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGranteeGrantsRequest
 */
export interface QueryGranteeGrantsRequest {
  grantee: string;
  /**
   * pagination defines an pagination for the request.
   */
  pagination?: PageRequest;
}
export interface QueryGranteeGrantsRequestProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.QueryGranteeGrantsRequest';
  value: Uint8Array;
}
/**
 * QueryGranteeGrantsRequest is the request type for the Query/GranteeGrants RPC method.
 * @name QueryGranteeGrantsRequestSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGranteeGrantsRequest
 */
export interface QueryGranteeGrantsRequestSDKType {
  grantee: string;
  pagination?: PageRequestSDKType;
}
/**
 * QueryGranteeGrantsResponse is the response type for the Query/GranteeGrants RPC method.
 * @name QueryGranteeGrantsResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGranteeGrantsResponse
 */
export interface QueryGranteeGrantsResponse {
  /**
   * grants is a list of grants granted to the grantee.
   */
  grants: GrantAuthorization[];
  /**
   * pagination defines an pagination for the response.
   */
  pagination?: PageResponse;
}
export interface QueryGranteeGrantsResponseProtoMsg {
  typeUrl: '/cosmos.authz.v1beta1.QueryGranteeGrantsResponse';
  value: Uint8Array;
}
/**
 * QueryGranteeGrantsResponse is the response type for the Query/GranteeGrants RPC method.
 * @name QueryGranteeGrantsResponseSDKType
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGranteeGrantsResponse
 */
export interface QueryGranteeGrantsResponseSDKType {
  grants: GrantAuthorizationSDKType[];
  pagination?: PageResponseSDKType;
}
function createBaseQueryGrantsRequest(): QueryGrantsRequest {
  return {
    granter: '',
    grantee: '',
    msgTypeUrl: '',
    pagination: undefined,
  };
}
/**
 * QueryGrantsRequest is the request type for the Query/Grants RPC method.
 * @name QueryGrantsRequest
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGrantsRequest
 */
export const QueryGrantsRequest = {
  typeUrl: '/cosmos.authz.v1beta1.QueryGrantsRequest' as const,
  aminoType: 'cosmos-sdk/QueryGrantsRequest' as const,
  is(o: any): o is QueryGrantsRequest {
    return (
      o &&
      (o.$typeUrl === QueryGrantsRequest.typeUrl ||
        (typeof o.granter === 'string' &&
          typeof o.grantee === 'string' &&
          typeof o.msgTypeUrl === 'string'))
    );
  },
  isSDK(o: any): o is QueryGrantsRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryGrantsRequest.typeUrl ||
        (typeof o.granter === 'string' &&
          typeof o.grantee === 'string' &&
          typeof o.msg_type_url === 'string'))
    );
  },
  encode(
    message: QueryGrantsRequest,
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
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(34).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGrantsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGrantsRequest();
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
        case 4:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGrantsRequest {
    return {
      granter: isSet(object.granter) ? String(object.granter) : '',
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
      msgTypeUrl: isSet(object.msgTypeUrl) ? String(object.msgTypeUrl) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message: QueryGrantsRequest): JsonSafe<QueryGrantsRequest> {
    const obj: any = {};
    message.granter !== undefined && (obj.granter = message.granter);
    message.grantee !== undefined && (obj.grantee = message.grantee);
    message.msgTypeUrl !== undefined && (obj.msgTypeUrl = message.msgTypeUrl);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryGrantsRequest>): QueryGrantsRequest {
    const message = createBaseQueryGrantsRequest();
    message.granter = object.granter ?? '';
    message.grantee = object.grantee ?? '';
    message.msgTypeUrl = object.msgTypeUrl ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryGrantsRequestProtoMsg): QueryGrantsRequest {
    return QueryGrantsRequest.decode(message.value);
  },
  toProto(message: QueryGrantsRequest): Uint8Array {
    return QueryGrantsRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryGrantsRequest): QueryGrantsRequestProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.QueryGrantsRequest',
      value: QueryGrantsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGrantsResponse(): QueryGrantsResponse {
  return {
    grants: [],
    pagination: undefined,
  };
}
/**
 * QueryGrantsResponse is the response type for the Query/Authorizations RPC method.
 * @name QueryGrantsResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGrantsResponse
 */
export const QueryGrantsResponse = {
  typeUrl: '/cosmos.authz.v1beta1.QueryGrantsResponse' as const,
  aminoType: 'cosmos-sdk/QueryGrantsResponse' as const,
  is(o: any): o is QueryGrantsResponse {
    return (
      o &&
      (o.$typeUrl === QueryGrantsResponse.typeUrl ||
        (Array.isArray(o.grants) &&
          (!o.grants.length || Grant.is(o.grants[0]))))
    );
  },
  isSDK(o: any): o is QueryGrantsResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryGrantsResponse.typeUrl ||
        (Array.isArray(o.grants) &&
          (!o.grants.length || Grant.isSDK(o.grants[0]))))
    );
  },
  encode(
    message: QueryGrantsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.grants) {
      Grant.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGrantsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGrantsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.grants.push(Grant.decode(reader, reader.uint32()));
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGrantsResponse {
    return {
      grants: Array.isArray(object?.grants)
        ? object.grants.map((e: any) => Grant.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message: QueryGrantsResponse): JsonSafe<QueryGrantsResponse> {
    const obj: any = {};
    if (message.grants) {
      obj.grants = message.grants.map(e => (e ? Grant.toJSON(e) : undefined));
    } else {
      obj.grants = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryGrantsResponse>): QueryGrantsResponse {
    const message = createBaseQueryGrantsResponse();
    message.grants = object.grants?.map(e => Grant.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryGrantsResponseProtoMsg): QueryGrantsResponse {
    return QueryGrantsResponse.decode(message.value);
  },
  toProto(message: QueryGrantsResponse): Uint8Array {
    return QueryGrantsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryGrantsResponse): QueryGrantsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.QueryGrantsResponse',
      value: QueryGrantsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGranterGrantsRequest(): QueryGranterGrantsRequest {
  return {
    granter: '',
    pagination: undefined,
  };
}
/**
 * QueryGranterGrantsRequest is the request type for the Query/GranterGrants RPC method.
 * @name QueryGranterGrantsRequest
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGranterGrantsRequest
 */
export const QueryGranterGrantsRequest = {
  typeUrl: '/cosmos.authz.v1beta1.QueryGranterGrantsRequest' as const,
  aminoType: 'cosmos-sdk/QueryGranterGrantsRequest' as const,
  is(o: any): o is QueryGranterGrantsRequest {
    return (
      o &&
      (o.$typeUrl === QueryGranterGrantsRequest.typeUrl ||
        typeof o.granter === 'string')
    );
  },
  isSDK(o: any): o is QueryGranterGrantsRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryGranterGrantsRequest.typeUrl ||
        typeof o.granter === 'string')
    );
  },
  encode(
    message: QueryGranterGrantsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.granter !== '') {
      writer.uint32(10).string(message.granter);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGranterGrantsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGranterGrantsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.granter = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGranterGrantsRequest {
    return {
      granter: isSet(object.granter) ? String(object.granter) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGranterGrantsRequest,
  ): JsonSafe<QueryGranterGrantsRequest> {
    const obj: any = {};
    message.granter !== undefined && (obj.granter = message.granter);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGranterGrantsRequest>,
  ): QueryGranterGrantsRequest {
    const message = createBaseQueryGranterGrantsRequest();
    message.granter = object.granter ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGranterGrantsRequestProtoMsg,
  ): QueryGranterGrantsRequest {
    return QueryGranterGrantsRequest.decode(message.value);
  },
  toProto(message: QueryGranterGrantsRequest): Uint8Array {
    return QueryGranterGrantsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGranterGrantsRequest,
  ): QueryGranterGrantsRequestProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.QueryGranterGrantsRequest',
      value: QueryGranterGrantsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGranterGrantsResponse(): QueryGranterGrantsResponse {
  return {
    grants: [],
    pagination: undefined,
  };
}
/**
 * QueryGranterGrantsResponse is the response type for the Query/GranterGrants RPC method.
 * @name QueryGranterGrantsResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGranterGrantsResponse
 */
export const QueryGranterGrantsResponse = {
  typeUrl: '/cosmos.authz.v1beta1.QueryGranterGrantsResponse' as const,
  aminoType: 'cosmos-sdk/QueryGranterGrantsResponse' as const,
  is(o: any): o is QueryGranterGrantsResponse {
    return (
      o &&
      (o.$typeUrl === QueryGranterGrantsResponse.typeUrl ||
        (Array.isArray(o.grants) &&
          (!o.grants.length || GrantAuthorization.is(o.grants[0]))))
    );
  },
  isSDK(o: any): o is QueryGranterGrantsResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryGranterGrantsResponse.typeUrl ||
        (Array.isArray(o.grants) &&
          (!o.grants.length || GrantAuthorization.isSDK(o.grants[0]))))
    );
  },
  encode(
    message: QueryGranterGrantsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.grants) {
      GrantAuthorization.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGranterGrantsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGranterGrantsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.grants.push(
            GrantAuthorization.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGranterGrantsResponse {
    return {
      grants: Array.isArray(object?.grants)
        ? object.grants.map((e: any) => GrantAuthorization.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGranterGrantsResponse,
  ): JsonSafe<QueryGranterGrantsResponse> {
    const obj: any = {};
    if (message.grants) {
      obj.grants = message.grants.map(e =>
        e ? GrantAuthorization.toJSON(e) : undefined,
      );
    } else {
      obj.grants = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGranterGrantsResponse>,
  ): QueryGranterGrantsResponse {
    const message = createBaseQueryGranterGrantsResponse();
    message.grants =
      object.grants?.map(e => GrantAuthorization.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGranterGrantsResponseProtoMsg,
  ): QueryGranterGrantsResponse {
    return QueryGranterGrantsResponse.decode(message.value);
  },
  toProto(message: QueryGranterGrantsResponse): Uint8Array {
    return QueryGranterGrantsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGranterGrantsResponse,
  ): QueryGranterGrantsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.QueryGranterGrantsResponse',
      value: QueryGranterGrantsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGranteeGrantsRequest(): QueryGranteeGrantsRequest {
  return {
    grantee: '',
    pagination: undefined,
  };
}
/**
 * QueryGranteeGrantsRequest is the request type for the Query/GranteeGrants RPC method.
 * @name QueryGranteeGrantsRequest
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGranteeGrantsRequest
 */
export const QueryGranteeGrantsRequest = {
  typeUrl: '/cosmos.authz.v1beta1.QueryGranteeGrantsRequest' as const,
  aminoType: 'cosmos-sdk/QueryGranteeGrantsRequest' as const,
  is(o: any): o is QueryGranteeGrantsRequest {
    return (
      o &&
      (o.$typeUrl === QueryGranteeGrantsRequest.typeUrl ||
        typeof o.grantee === 'string')
    );
  },
  isSDK(o: any): o is QueryGranteeGrantsRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryGranteeGrantsRequest.typeUrl ||
        typeof o.grantee === 'string')
    );
  },
  encode(
    message: QueryGranteeGrantsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.grantee !== '') {
      writer.uint32(10).string(message.grantee);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGranteeGrantsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGranteeGrantsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.grantee = reader.string();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGranteeGrantsRequest {
    return {
      grantee: isSet(object.grantee) ? String(object.grantee) : '',
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGranteeGrantsRequest,
  ): JsonSafe<QueryGranteeGrantsRequest> {
    const obj: any = {};
    message.grantee !== undefined && (obj.grantee = message.grantee);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGranteeGrantsRequest>,
  ): QueryGranteeGrantsRequest {
    const message = createBaseQueryGranteeGrantsRequest();
    message.grantee = object.grantee ?? '';
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGranteeGrantsRequestProtoMsg,
  ): QueryGranteeGrantsRequest {
    return QueryGranteeGrantsRequest.decode(message.value);
  },
  toProto(message: QueryGranteeGrantsRequest): Uint8Array {
    return QueryGranteeGrantsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGranteeGrantsRequest,
  ): QueryGranteeGrantsRequestProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.QueryGranteeGrantsRequest',
      value: QueryGranteeGrantsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGranteeGrantsResponse(): QueryGranteeGrantsResponse {
  return {
    grants: [],
    pagination: undefined,
  };
}
/**
 * QueryGranteeGrantsResponse is the response type for the Query/GranteeGrants RPC method.
 * @name QueryGranteeGrantsResponse
 * @package cosmos.authz.v1beta1
 * @see proto type: cosmos.authz.v1beta1.QueryGranteeGrantsResponse
 */
export const QueryGranteeGrantsResponse = {
  typeUrl: '/cosmos.authz.v1beta1.QueryGranteeGrantsResponse' as const,
  aminoType: 'cosmos-sdk/QueryGranteeGrantsResponse' as const,
  is(o: any): o is QueryGranteeGrantsResponse {
    return (
      o &&
      (o.$typeUrl === QueryGranteeGrantsResponse.typeUrl ||
        (Array.isArray(o.grants) &&
          (!o.grants.length || GrantAuthorization.is(o.grants[0]))))
    );
  },
  isSDK(o: any): o is QueryGranteeGrantsResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryGranteeGrantsResponse.typeUrl ||
        (Array.isArray(o.grants) &&
          (!o.grants.length || GrantAuthorization.isSDK(o.grants[0]))))
    );
  },
  encode(
    message: QueryGranteeGrantsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.grants) {
      GrantAuthorization.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(18).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGranteeGrantsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGranteeGrantsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.grants.push(
            GrantAuthorization.decode(reader, reader.uint32()),
          );
          break;
        case 2:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGranteeGrantsResponse {
    return {
      grants: Array.isArray(object?.grants)
        ? object.grants.map((e: any) => GrantAuthorization.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(
    message: QueryGranteeGrantsResponse,
  ): JsonSafe<QueryGranteeGrantsResponse> {
    const obj: any = {};
    if (message.grants) {
      obj.grants = message.grants.map(e =>
        e ? GrantAuthorization.toJSON(e) : undefined,
      );
    } else {
      obj.grants = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGranteeGrantsResponse>,
  ): QueryGranteeGrantsResponse {
    const message = createBaseQueryGranteeGrantsResponse();
    message.grants =
      object.grants?.map(e => GrantAuthorization.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGranteeGrantsResponseProtoMsg,
  ): QueryGranteeGrantsResponse {
    return QueryGranteeGrantsResponse.decode(message.value);
  },
  toProto(message: QueryGranteeGrantsResponse): Uint8Array {
    return QueryGranteeGrantsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGranteeGrantsResponse,
  ): QueryGranteeGrantsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.authz.v1beta1.QueryGranteeGrantsResponse',
      value: QueryGranteeGrantsResponse.encode(message).finish(),
    };
  },
};
