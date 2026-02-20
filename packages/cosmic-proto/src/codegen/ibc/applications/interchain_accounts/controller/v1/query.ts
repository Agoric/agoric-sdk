//@ts-nocheck
import { Params, type ParamsSDKType } from './controller.js';
import { BinaryReader, BinaryWriter } from '../../../../../binary.js';
import { isSet } from '../../../../../helpers.js';
import { type JsonSafe } from '../../../../../json-safe.js';
/**
 * QueryInterchainAccountRequest is the request type for the Query/InterchainAccount RPC method.
 * @name QueryInterchainAccountRequest
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountRequest
 */
export interface QueryInterchainAccountRequest {
  owner: string;
  connectionId: string;
}
export interface QueryInterchainAccountRequestProtoMsg {
  typeUrl: '/ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountRequest';
  value: Uint8Array;
}
/**
 * QueryInterchainAccountRequest is the request type for the Query/InterchainAccount RPC method.
 * @name QueryInterchainAccountRequestSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountRequest
 */
export interface QueryInterchainAccountRequestSDKType {
  owner: string;
  connection_id: string;
}
/**
 * QueryInterchainAccountResponse the response type for the Query/InterchainAccount RPC method.
 * @name QueryInterchainAccountResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountResponse
 */
export interface QueryInterchainAccountResponse {
  address: string;
}
export interface QueryInterchainAccountResponseProtoMsg {
  typeUrl: '/ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountResponse';
  value: Uint8Array;
}
/**
 * QueryInterchainAccountResponse the response type for the Query/InterchainAccount RPC method.
 * @name QueryInterchainAccountResponseSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountResponse
 */
export interface QueryInterchainAccountResponseSDKType {
  address: string;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryParamsRequest
 */
export interface QueryParamsRequest {}
export interface QueryParamsRequestProtoMsg {
  typeUrl: '/ibc.applications.interchain_accounts.controller.v1.QueryParamsRequest';
  value: Uint8Array;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryParamsResponse
 */
export interface QueryParamsResponse {
  /**
   * params defines the parameters of the module.
   */
  params?: Params;
}
export interface QueryParamsResponseProtoMsg {
  typeUrl: '/ibc.applications.interchain_accounts.controller.v1.QueryParamsResponse';
  value: Uint8Array;
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
  params?: ParamsSDKType;
}
function createBaseQueryInterchainAccountRequest(): QueryInterchainAccountRequest {
  return {
    owner: '',
    connectionId: '',
  };
}
/**
 * QueryInterchainAccountRequest is the request type for the Query/InterchainAccount RPC method.
 * @name QueryInterchainAccountRequest
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountRequest
 */
export const QueryInterchainAccountRequest = {
  typeUrl:
    '/ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountRequest' as const,
  aminoType: 'cosmos-sdk/QueryInterchainAccountRequest' as const,
  is(o: any): o is QueryInterchainAccountRequest {
    return (
      o &&
      (o.$typeUrl === QueryInterchainAccountRequest.typeUrl ||
        (typeof o.owner === 'string' && typeof o.connectionId === 'string'))
    );
  },
  isSDK(o: any): o is QueryInterchainAccountRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryInterchainAccountRequest.typeUrl ||
        (typeof o.owner === 'string' && typeof o.connection_id === 'string'))
    );
  },
  encode(
    message: QueryInterchainAccountRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.owner !== '') {
      writer.uint32(10).string(message.owner);
    }
    if (message.connectionId !== '') {
      writer.uint32(18).string(message.connectionId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryInterchainAccountRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryInterchainAccountRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.owner = reader.string();
          break;
        case 2:
          message.connectionId = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryInterchainAccountRequest {
    return {
      owner: isSet(object.owner) ? String(object.owner) : '',
      connectionId: isSet(object.connectionId)
        ? String(object.connectionId)
        : '',
    };
  },
  toJSON(
    message: QueryInterchainAccountRequest,
  ): JsonSafe<QueryInterchainAccountRequest> {
    const obj: any = {};
    message.owner !== undefined && (obj.owner = message.owner);
    message.connectionId !== undefined &&
      (obj.connectionId = message.connectionId);
    return obj;
  },
  fromPartial(
    object: Partial<QueryInterchainAccountRequest>,
  ): QueryInterchainAccountRequest {
    const message = createBaseQueryInterchainAccountRequest();
    message.owner = object.owner ?? '';
    message.connectionId = object.connectionId ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryInterchainAccountRequestProtoMsg,
  ): QueryInterchainAccountRequest {
    return QueryInterchainAccountRequest.decode(message.value);
  },
  toProto(message: QueryInterchainAccountRequest): Uint8Array {
    return QueryInterchainAccountRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryInterchainAccountRequest,
  ): QueryInterchainAccountRequestProtoMsg {
    return {
      typeUrl:
        '/ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountRequest',
      value: QueryInterchainAccountRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryInterchainAccountResponse(): QueryInterchainAccountResponse {
  return {
    address: '',
  };
}
/**
 * QueryInterchainAccountResponse the response type for the Query/InterchainAccount RPC method.
 * @name QueryInterchainAccountResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountResponse
 */
export const QueryInterchainAccountResponse = {
  typeUrl:
    '/ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountResponse' as const,
  aminoType: 'cosmos-sdk/QueryInterchainAccountResponse' as const,
  is(o: any): o is QueryInterchainAccountResponse {
    return (
      o &&
      (o.$typeUrl === QueryInterchainAccountResponse.typeUrl ||
        typeof o.address === 'string')
    );
  },
  isSDK(o: any): o is QueryInterchainAccountResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryInterchainAccountResponse.typeUrl ||
        typeof o.address === 'string')
    );
  },
  encode(
    message: QueryInterchainAccountResponse,
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
  ): QueryInterchainAccountResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryInterchainAccountResponse();
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
  fromJSON(object: any): QueryInterchainAccountResponse {
    return {
      address: isSet(object.address) ? String(object.address) : '',
    };
  },
  toJSON(
    message: QueryInterchainAccountResponse,
  ): JsonSafe<QueryInterchainAccountResponse> {
    const obj: any = {};
    message.address !== undefined && (obj.address = message.address);
    return obj;
  },
  fromPartial(
    object: Partial<QueryInterchainAccountResponse>,
  ): QueryInterchainAccountResponse {
    const message = createBaseQueryInterchainAccountResponse();
    message.address = object.address ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryInterchainAccountResponseProtoMsg,
  ): QueryInterchainAccountResponse {
    return QueryInterchainAccountResponse.decode(message.value);
  },
  toProto(message: QueryInterchainAccountResponse): Uint8Array {
    return QueryInterchainAccountResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryInterchainAccountResponse,
  ): QueryInterchainAccountResponseProtoMsg {
    return {
      typeUrl:
        '/ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountResponse',
      value: QueryInterchainAccountResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryParamsRequest(): QueryParamsRequest {
  return {};
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryParamsRequest
 */
export const QueryParamsRequest = {
  typeUrl:
    '/ibc.applications.interchain_accounts.controller.v1.QueryParamsRequest' as const,
  aminoType: 'cosmos-sdk/QueryParamsRequest' as const,
  is(o: any): o is QueryParamsRequest {
    return o && o.$typeUrl === QueryParamsRequest.typeUrl;
  },
  isSDK(o: any): o is QueryParamsRequestSDKType {
    return o && o.$typeUrl === QueryParamsRequest.typeUrl;
  },
  encode(
    _: QueryParamsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryParamsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryParamsRequest();
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
  fromJSON(_: any): QueryParamsRequest {
    return {};
  },
  toJSON(_: QueryParamsRequest): JsonSafe<QueryParamsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryParamsRequest>): QueryParamsRequest {
    const message = createBaseQueryParamsRequest();
    return message;
  },
  fromProtoMsg(message: QueryParamsRequestProtoMsg): QueryParamsRequest {
    return QueryParamsRequest.decode(message.value);
  },
  toProto(message: QueryParamsRequest): Uint8Array {
    return QueryParamsRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryParamsRequest): QueryParamsRequestProtoMsg {
    return {
      typeUrl:
        '/ibc.applications.interchain_accounts.controller.v1.QueryParamsRequest',
      value: QueryParamsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryParamsResponse(): QueryParamsResponse {
  return {
    params: undefined,
  };
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryParamsResponse
 */
export const QueryParamsResponse = {
  typeUrl:
    '/ibc.applications.interchain_accounts.controller.v1.QueryParamsResponse' as const,
  aminoType: 'cosmos-sdk/QueryParamsResponse' as const,
  is(o: any): o is QueryParamsResponse {
    return o && o.$typeUrl === QueryParamsResponse.typeUrl;
  },
  isSDK(o: any): o is QueryParamsResponseSDKType {
    return o && o.$typeUrl === QueryParamsResponse.typeUrl;
  },
  encode(
    message: QueryParamsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.params !== undefined) {
      Params.encode(message.params, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryParamsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryParamsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.params = Params.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryParamsResponse {
    return {
      params: isSet(object.params) ? Params.fromJSON(object.params) : undefined,
    };
  },
  toJSON(message: QueryParamsResponse): JsonSafe<QueryParamsResponse> {
    const obj: any = {};
    message.params !== undefined &&
      (obj.params = message.params ? Params.toJSON(message.params) : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryParamsResponse>): QueryParamsResponse {
    const message = createBaseQueryParamsResponse();
    message.params =
      object.params !== undefined && object.params !== null
        ? Params.fromPartial(object.params)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryParamsResponseProtoMsg): QueryParamsResponse {
    return QueryParamsResponse.decode(message.value);
  },
  toProto(message: QueryParamsResponse): Uint8Array {
    return QueryParamsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryParamsResponse): QueryParamsResponseProtoMsg {
    return {
      typeUrl:
        '/ibc.applications.interchain_accounts.controller.v1.QueryParamsResponse',
      value: QueryParamsResponse.encode(message).finish(),
    };
  },
};
