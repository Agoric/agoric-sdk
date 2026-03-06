//@ts-nocheck
import {
  CounterpartyInfo,
  type CounterpartyInfoSDKType,
} from './counterparty.js';
import { Config, type ConfigSDKType } from './config.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { isSet } from '../../../../helpers.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * QueryCounterpartyInfoRequest is the request type for the Query/CounterpartyInfo RPC
 * method
 * @name QueryCounterpartyInfoRequest
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.QueryCounterpartyInfoRequest
 */
export interface QueryCounterpartyInfoRequest {
  /**
   * client state unique identifier
   */
  clientId: string;
}
export interface QueryCounterpartyInfoRequestProtoMsg {
  typeUrl: '/ibc.core.client.v2.QueryCounterpartyInfoRequest';
  value: Uint8Array;
}
/**
 * QueryCounterpartyInfoRequest is the request type for the Query/CounterpartyInfo RPC
 * method
 * @name QueryCounterpartyInfoRequestSDKType
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.QueryCounterpartyInfoRequest
 */
export interface QueryCounterpartyInfoRequestSDKType {
  client_id: string;
}
/**
 * QueryCounterpartyInfoResponse is the response type for the
 * Query/CounterpartyInfo RPC method.
 * @name QueryCounterpartyInfoResponse
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.QueryCounterpartyInfoResponse
 */
export interface QueryCounterpartyInfoResponse {
  counterpartyInfo?: CounterpartyInfo;
}
export interface QueryCounterpartyInfoResponseProtoMsg {
  typeUrl: '/ibc.core.client.v2.QueryCounterpartyInfoResponse';
  value: Uint8Array;
}
/**
 * QueryCounterpartyInfoResponse is the response type for the
 * Query/CounterpartyInfo RPC method.
 * @name QueryCounterpartyInfoResponseSDKType
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.QueryCounterpartyInfoResponse
 */
export interface QueryCounterpartyInfoResponseSDKType {
  counterparty_info?: CounterpartyInfoSDKType;
}
/**
 * QueryConfigRequest is the request type for the Query/Config RPC method
 * @name QueryConfigRequest
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.QueryConfigRequest
 */
export interface QueryConfigRequest {
  /**
   * client state unique identifier
   */
  clientId: string;
}
export interface QueryConfigRequestProtoMsg {
  typeUrl: '/ibc.core.client.v2.QueryConfigRequest';
  value: Uint8Array;
}
/**
 * QueryConfigRequest is the request type for the Query/Config RPC method
 * @name QueryConfigRequestSDKType
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.QueryConfigRequest
 */
export interface QueryConfigRequestSDKType {
  client_id: string;
}
/**
 * QueryConfigResponse is the response type for the Query/Config RPC method
 * @name QueryConfigResponse
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.QueryConfigResponse
 */
export interface QueryConfigResponse {
  config?: Config;
}
export interface QueryConfigResponseProtoMsg {
  typeUrl: '/ibc.core.client.v2.QueryConfigResponse';
  value: Uint8Array;
}
/**
 * QueryConfigResponse is the response type for the Query/Config RPC method
 * @name QueryConfigResponseSDKType
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.QueryConfigResponse
 */
export interface QueryConfigResponseSDKType {
  config?: ConfigSDKType;
}
function createBaseQueryCounterpartyInfoRequest(): QueryCounterpartyInfoRequest {
  return {
    clientId: '',
  };
}
/**
 * QueryCounterpartyInfoRequest is the request type for the Query/CounterpartyInfo RPC
 * method
 * @name QueryCounterpartyInfoRequest
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.QueryCounterpartyInfoRequest
 */
export const QueryCounterpartyInfoRequest = {
  typeUrl: '/ibc.core.client.v2.QueryCounterpartyInfoRequest' as const,
  aminoType: 'cosmos-sdk/QueryCounterpartyInfoRequest' as const,
  is(o: any): o is QueryCounterpartyInfoRequest {
    return (
      o &&
      (o.$typeUrl === QueryCounterpartyInfoRequest.typeUrl ||
        typeof o.clientId === 'string')
    );
  },
  isSDK(o: any): o is QueryCounterpartyInfoRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryCounterpartyInfoRequest.typeUrl ||
        typeof o.client_id === 'string')
    );
  },
  encode(
    message: QueryCounterpartyInfoRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryCounterpartyInfoRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCounterpartyInfoRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryCounterpartyInfoRequest {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
    };
  },
  toJSON(
    message: QueryCounterpartyInfoRequest,
  ): JsonSafe<QueryCounterpartyInfoRequest> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    return obj;
  },
  fromPartial(
    object: Partial<QueryCounterpartyInfoRequest>,
  ): QueryCounterpartyInfoRequest {
    const message = createBaseQueryCounterpartyInfoRequest();
    message.clientId = object.clientId ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryCounterpartyInfoRequestProtoMsg,
  ): QueryCounterpartyInfoRequest {
    return QueryCounterpartyInfoRequest.decode(message.value);
  },
  toProto(message: QueryCounterpartyInfoRequest): Uint8Array {
    return QueryCounterpartyInfoRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryCounterpartyInfoRequest,
  ): QueryCounterpartyInfoRequestProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v2.QueryCounterpartyInfoRequest',
      value: QueryCounterpartyInfoRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryCounterpartyInfoResponse(): QueryCounterpartyInfoResponse {
  return {
    counterpartyInfo: undefined,
  };
}
/**
 * QueryCounterpartyInfoResponse is the response type for the
 * Query/CounterpartyInfo RPC method.
 * @name QueryCounterpartyInfoResponse
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.QueryCounterpartyInfoResponse
 */
export const QueryCounterpartyInfoResponse = {
  typeUrl: '/ibc.core.client.v2.QueryCounterpartyInfoResponse' as const,
  aminoType: 'cosmos-sdk/QueryCounterpartyInfoResponse' as const,
  is(o: any): o is QueryCounterpartyInfoResponse {
    return o && o.$typeUrl === QueryCounterpartyInfoResponse.typeUrl;
  },
  isSDK(o: any): o is QueryCounterpartyInfoResponseSDKType {
    return o && o.$typeUrl === QueryCounterpartyInfoResponse.typeUrl;
  },
  encode(
    message: QueryCounterpartyInfoResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.counterpartyInfo !== undefined) {
      CounterpartyInfo.encode(
        message.counterpartyInfo,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryCounterpartyInfoResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCounterpartyInfoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.counterpartyInfo = CounterpartyInfo.decode(
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
  fromJSON(object: any): QueryCounterpartyInfoResponse {
    return {
      counterpartyInfo: isSet(object.counterpartyInfo)
        ? CounterpartyInfo.fromJSON(object.counterpartyInfo)
        : undefined,
    };
  },
  toJSON(
    message: QueryCounterpartyInfoResponse,
  ): JsonSafe<QueryCounterpartyInfoResponse> {
    const obj: any = {};
    message.counterpartyInfo !== undefined &&
      (obj.counterpartyInfo = message.counterpartyInfo
        ? CounterpartyInfo.toJSON(message.counterpartyInfo)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryCounterpartyInfoResponse>,
  ): QueryCounterpartyInfoResponse {
    const message = createBaseQueryCounterpartyInfoResponse();
    message.counterpartyInfo =
      object.counterpartyInfo !== undefined && object.counterpartyInfo !== null
        ? CounterpartyInfo.fromPartial(object.counterpartyInfo)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryCounterpartyInfoResponseProtoMsg,
  ): QueryCounterpartyInfoResponse {
    return QueryCounterpartyInfoResponse.decode(message.value);
  },
  toProto(message: QueryCounterpartyInfoResponse): Uint8Array {
    return QueryCounterpartyInfoResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryCounterpartyInfoResponse,
  ): QueryCounterpartyInfoResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v2.QueryCounterpartyInfoResponse',
      value: QueryCounterpartyInfoResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryConfigRequest(): QueryConfigRequest {
  return {
    clientId: '',
  };
}
/**
 * QueryConfigRequest is the request type for the Query/Config RPC method
 * @name QueryConfigRequest
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.QueryConfigRequest
 */
export const QueryConfigRequest = {
  typeUrl: '/ibc.core.client.v2.QueryConfigRequest' as const,
  aminoType: 'cosmos-sdk/QueryConfigRequest' as const,
  is(o: any): o is QueryConfigRequest {
    return (
      o &&
      (o.$typeUrl === QueryConfigRequest.typeUrl ||
        typeof o.clientId === 'string')
    );
  },
  isSDK(o: any): o is QueryConfigRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryConfigRequest.typeUrl ||
        typeof o.client_id === 'string')
    );
  },
  encode(
    message: QueryConfigRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.clientId !== '') {
      writer.uint32(10).string(message.clientId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryConfigRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryConfigRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.clientId = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryConfigRequest {
    return {
      clientId: isSet(object.clientId) ? String(object.clientId) : '',
    };
  },
  toJSON(message: QueryConfigRequest): JsonSafe<QueryConfigRequest> {
    const obj: any = {};
    message.clientId !== undefined && (obj.clientId = message.clientId);
    return obj;
  },
  fromPartial(object: Partial<QueryConfigRequest>): QueryConfigRequest {
    const message = createBaseQueryConfigRequest();
    message.clientId = object.clientId ?? '';
    return message;
  },
  fromProtoMsg(message: QueryConfigRequestProtoMsg): QueryConfigRequest {
    return QueryConfigRequest.decode(message.value);
  },
  toProto(message: QueryConfigRequest): Uint8Array {
    return QueryConfigRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryConfigRequest): QueryConfigRequestProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v2.QueryConfigRequest',
      value: QueryConfigRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryConfigResponse(): QueryConfigResponse {
  return {
    config: undefined,
  };
}
/**
 * QueryConfigResponse is the response type for the Query/Config RPC method
 * @name QueryConfigResponse
 * @package ibc.core.client.v2
 * @see proto type: ibc.core.client.v2.QueryConfigResponse
 */
export const QueryConfigResponse = {
  typeUrl: '/ibc.core.client.v2.QueryConfigResponse' as const,
  aminoType: 'cosmos-sdk/QueryConfigResponse' as const,
  is(o: any): o is QueryConfigResponse {
    return o && o.$typeUrl === QueryConfigResponse.typeUrl;
  },
  isSDK(o: any): o is QueryConfigResponseSDKType {
    return o && o.$typeUrl === QueryConfigResponse.typeUrl;
  },
  encode(
    message: QueryConfigResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.config !== undefined) {
      Config.encode(message.config, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryConfigResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryConfigResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.config = Config.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryConfigResponse {
    return {
      config: isSet(object.config) ? Config.fromJSON(object.config) : undefined,
    };
  },
  toJSON(message: QueryConfigResponse): JsonSafe<QueryConfigResponse> {
    const obj: any = {};
    message.config !== undefined &&
      (obj.config = message.config ? Config.toJSON(message.config) : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryConfigResponse>): QueryConfigResponse {
    const message = createBaseQueryConfigResponse();
    message.config =
      object.config !== undefined && object.config !== null
        ? Config.fromPartial(object.config)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryConfigResponseProtoMsg): QueryConfigResponse {
    return QueryConfigResponse.decode(message.value);
  },
  toProto(message: QueryConfigResponse): Uint8Array {
    return QueryConfigResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryConfigResponse): QueryConfigResponseProtoMsg {
    return {
      typeUrl: '/ibc.core.client.v2.QueryConfigResponse',
      value: QueryConfigResponse.encode(message).finish(),
    };
  },
};
