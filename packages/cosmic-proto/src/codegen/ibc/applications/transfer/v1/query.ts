//@ts-nocheck
import {
  PageRequest,
  type PageRequestSDKType,
  PageResponse,
  type PageResponseSDKType,
} from '../../../../cosmos/base/query/v1beta1/pagination.js';
import { Params, type ParamsSDKType } from './transfer.js';
import { Denom, type DenomSDKType } from './token.js';
import {
  Coin,
  type CoinSDKType,
} from '../../../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
import { isSet } from '../../../../helpers.js';
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryParamsRequest
 */
export interface QueryParamsRequest {}
export interface QueryParamsRequestProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.QueryParamsRequest';
  value: Uint8Array;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryParamsResponse
 */
export interface QueryParamsResponse {
  /**
   * params defines the parameters of the module.
   */
  params?: Params;
}
export interface QueryParamsResponseProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.QueryParamsResponse';
  value: Uint8Array;
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
  params?: ParamsSDKType;
}
/**
 * QueryDenomRequest is the request type for the Query/Denom RPC
 * method
 * @name QueryDenomRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomRequest
 */
export interface QueryDenomRequest {
  /**
   * hash (in hex format) or denom (full denom with ibc prefix) of the on chain denomination.
   */
  hash: string;
}
export interface QueryDenomRequestProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.QueryDenomRequest';
  value: Uint8Array;
}
/**
 * QueryDenomRequest is the request type for the Query/Denom RPC
 * method
 * @name QueryDenomRequestSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomRequest
 */
export interface QueryDenomRequestSDKType {
  hash: string;
}
/**
 * QueryDenomResponse is the response type for the Query/Denom RPC
 * method.
 * @name QueryDenomResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomResponse
 */
export interface QueryDenomResponse {
  /**
   * denom returns the requested denomination.
   */
  denom?: Denom;
}
export interface QueryDenomResponseProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.QueryDenomResponse';
  value: Uint8Array;
}
/**
 * QueryDenomResponse is the response type for the Query/Denom RPC
 * method.
 * @name QueryDenomResponseSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomResponse
 */
export interface QueryDenomResponseSDKType {
  denom?: DenomSDKType;
}
/**
 * QueryDenomsRequest is the request type for the Query/Denoms RPC
 * method
 * @name QueryDenomsRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomsRequest
 */
export interface QueryDenomsRequest {
  /**
   * pagination defines an optional pagination for the request.
   */
  pagination?: PageRequest;
}
export interface QueryDenomsRequestProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.QueryDenomsRequest';
  value: Uint8Array;
}
/**
 * QueryDenomsRequest is the request type for the Query/Denoms RPC
 * method
 * @name QueryDenomsRequestSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomsRequest
 */
export interface QueryDenomsRequestSDKType {
  pagination?: PageRequestSDKType;
}
/**
 * QueryDenomsResponse is the response type for the Query/Denoms RPC
 * method.
 * @name QueryDenomsResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomsResponse
 */
export interface QueryDenomsResponse {
  /**
   * denoms returns all denominations.
   */
  denoms: Denom[];
  /**
   * pagination defines the pagination in the response.
   */
  pagination?: PageResponse;
}
export interface QueryDenomsResponseProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.QueryDenomsResponse';
  value: Uint8Array;
}
/**
 * QueryDenomsResponse is the response type for the Query/Denoms RPC
 * method.
 * @name QueryDenomsResponseSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomsResponse
 */
export interface QueryDenomsResponseSDKType {
  denoms: DenomSDKType[];
  pagination?: PageResponseSDKType;
}
/**
 * QueryDenomHashRequest is the request type for the Query/DenomHash RPC
 * method
 * @name QueryDenomHashRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomHashRequest
 */
export interface QueryDenomHashRequest {
  /**
   * The denomination trace ([port_id]/[channel_id])+/[denom]
   */
  trace: string;
}
export interface QueryDenomHashRequestProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.QueryDenomHashRequest';
  value: Uint8Array;
}
/**
 * QueryDenomHashRequest is the request type for the Query/DenomHash RPC
 * method
 * @name QueryDenomHashRequestSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomHashRequest
 */
export interface QueryDenomHashRequestSDKType {
  trace: string;
}
/**
 * QueryDenomHashResponse is the response type for the Query/DenomHash RPC
 * method.
 * @name QueryDenomHashResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomHashResponse
 */
export interface QueryDenomHashResponse {
  /**
   * hash (in hex format) of the denomination trace information.
   */
  hash: string;
}
export interface QueryDenomHashResponseProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.QueryDenomHashResponse';
  value: Uint8Array;
}
/**
 * QueryDenomHashResponse is the response type for the Query/DenomHash RPC
 * method.
 * @name QueryDenomHashResponseSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomHashResponse
 */
export interface QueryDenomHashResponseSDKType {
  hash: string;
}
/**
 * QueryEscrowAddressRequest is the request type for the EscrowAddress RPC method.
 * @name QueryEscrowAddressRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryEscrowAddressRequest
 */
export interface QueryEscrowAddressRequest {
  /**
   * unique port identifier
   */
  portId: string;
  /**
   * unique channel identifier
   */
  channelId: string;
}
export interface QueryEscrowAddressRequestProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.QueryEscrowAddressRequest';
  value: Uint8Array;
}
/**
 * QueryEscrowAddressRequest is the request type for the EscrowAddress RPC method.
 * @name QueryEscrowAddressRequestSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryEscrowAddressRequest
 */
export interface QueryEscrowAddressRequestSDKType {
  port_id: string;
  channel_id: string;
}
/**
 * QueryEscrowAddressResponse is the response type of the EscrowAddress RPC method.
 * @name QueryEscrowAddressResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryEscrowAddressResponse
 */
export interface QueryEscrowAddressResponse {
  /**
   * the escrow account address
   */
  escrowAddress: string;
}
export interface QueryEscrowAddressResponseProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.QueryEscrowAddressResponse';
  value: Uint8Array;
}
/**
 * QueryEscrowAddressResponse is the response type of the EscrowAddress RPC method.
 * @name QueryEscrowAddressResponseSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryEscrowAddressResponse
 */
export interface QueryEscrowAddressResponseSDKType {
  escrow_address: string;
}
/**
 * QueryTotalEscrowForDenomRequest is the request type for TotalEscrowForDenom RPC method.
 * @name QueryTotalEscrowForDenomRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryTotalEscrowForDenomRequest
 */
export interface QueryTotalEscrowForDenomRequest {
  denom: string;
}
export interface QueryTotalEscrowForDenomRequestProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.QueryTotalEscrowForDenomRequest';
  value: Uint8Array;
}
/**
 * QueryTotalEscrowForDenomRequest is the request type for TotalEscrowForDenom RPC method.
 * @name QueryTotalEscrowForDenomRequestSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryTotalEscrowForDenomRequest
 */
export interface QueryTotalEscrowForDenomRequestSDKType {
  denom: string;
}
/**
 * QueryTotalEscrowForDenomResponse is the response type for TotalEscrowForDenom RPC method.
 * @name QueryTotalEscrowForDenomResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryTotalEscrowForDenomResponse
 */
export interface QueryTotalEscrowForDenomResponse {
  amount: Coin;
}
export interface QueryTotalEscrowForDenomResponseProtoMsg {
  typeUrl: '/ibc.applications.transfer.v1.QueryTotalEscrowForDenomResponse';
  value: Uint8Array;
}
/**
 * QueryTotalEscrowForDenomResponse is the response type for TotalEscrowForDenom RPC method.
 * @name QueryTotalEscrowForDenomResponseSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryTotalEscrowForDenomResponse
 */
export interface QueryTotalEscrowForDenomResponseSDKType {
  amount: CoinSDKType;
}
function createBaseQueryParamsRequest(): QueryParamsRequest {
  return {};
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryParamsRequest
 */
export const QueryParamsRequest = {
  typeUrl: '/ibc.applications.transfer.v1.QueryParamsRequest' as const,
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
      typeUrl: '/ibc.applications.transfer.v1.QueryParamsRequest',
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
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryParamsResponse
 */
export const QueryParamsResponse = {
  typeUrl: '/ibc.applications.transfer.v1.QueryParamsResponse' as const,
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
      typeUrl: '/ibc.applications.transfer.v1.QueryParamsResponse',
      value: QueryParamsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomRequest(): QueryDenomRequest {
  return {
    hash: '',
  };
}
/**
 * QueryDenomRequest is the request type for the Query/Denom RPC
 * method
 * @name QueryDenomRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomRequest
 */
export const QueryDenomRequest = {
  typeUrl: '/ibc.applications.transfer.v1.QueryDenomRequest' as const,
  aminoType: 'cosmos-sdk/QueryDenomRequest' as const,
  is(o: any): o is QueryDenomRequest {
    return (
      o &&
      (o.$typeUrl === QueryDenomRequest.typeUrl || typeof o.hash === 'string')
    );
  },
  isSDK(o: any): o is QueryDenomRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryDenomRequest.typeUrl || typeof o.hash === 'string')
    );
  },
  encode(
    message: QueryDenomRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.hash !== '') {
      writer.uint32(10).string(message.hash);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.hash = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDenomRequest {
    return {
      hash: isSet(object.hash) ? String(object.hash) : '',
    };
  },
  toJSON(message: QueryDenomRequest): JsonSafe<QueryDenomRequest> {
    const obj: any = {};
    message.hash !== undefined && (obj.hash = message.hash);
    return obj;
  },
  fromPartial(object: Partial<QueryDenomRequest>): QueryDenomRequest {
    const message = createBaseQueryDenomRequest();
    message.hash = object.hash ?? '';
    return message;
  },
  fromProtoMsg(message: QueryDenomRequestProtoMsg): QueryDenomRequest {
    return QueryDenomRequest.decode(message.value);
  },
  toProto(message: QueryDenomRequest): Uint8Array {
    return QueryDenomRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryDenomRequest): QueryDenomRequestProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.QueryDenomRequest',
      value: QueryDenomRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomResponse(): QueryDenomResponse {
  return {
    denom: undefined,
  };
}
/**
 * QueryDenomResponse is the response type for the Query/Denom RPC
 * method.
 * @name QueryDenomResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomResponse
 */
export const QueryDenomResponse = {
  typeUrl: '/ibc.applications.transfer.v1.QueryDenomResponse' as const,
  aminoType: 'cosmos-sdk/QueryDenomResponse' as const,
  is(o: any): o is QueryDenomResponse {
    return o && o.$typeUrl === QueryDenomResponse.typeUrl;
  },
  isSDK(o: any): o is QueryDenomResponseSDKType {
    return o && o.$typeUrl === QueryDenomResponse.typeUrl;
  },
  encode(
    message: QueryDenomResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== undefined) {
      Denom.encode(message.denom, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDenomResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = Denom.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDenomResponse {
    return {
      denom: isSet(object.denom) ? Denom.fromJSON(object.denom) : undefined,
    };
  },
  toJSON(message: QueryDenomResponse): JsonSafe<QueryDenomResponse> {
    const obj: any = {};
    message.denom !== undefined &&
      (obj.denom = message.denom ? Denom.toJSON(message.denom) : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryDenomResponse>): QueryDenomResponse {
    const message = createBaseQueryDenomResponse();
    message.denom =
      object.denom !== undefined && object.denom !== null
        ? Denom.fromPartial(object.denom)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryDenomResponseProtoMsg): QueryDenomResponse {
    return QueryDenomResponse.decode(message.value);
  },
  toProto(message: QueryDenomResponse): Uint8Array {
    return QueryDenomResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryDenomResponse): QueryDenomResponseProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.QueryDenomResponse',
      value: QueryDenomResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomsRequest(): QueryDenomsRequest {
  return {
    pagination: undefined,
  };
}
/**
 * QueryDenomsRequest is the request type for the Query/Denoms RPC
 * method
 * @name QueryDenomsRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomsRequest
 */
export const QueryDenomsRequest = {
  typeUrl: '/ibc.applications.transfer.v1.QueryDenomsRequest' as const,
  aminoType: 'cosmos-sdk/QueryDenomsRequest' as const,
  is(o: any): o is QueryDenomsRequest {
    return o && o.$typeUrl === QueryDenomsRequest.typeUrl;
  },
  isSDK(o: any): o is QueryDenomsRequestSDKType {
    return o && o.$typeUrl === QueryDenomsRequest.typeUrl;
  },
  encode(
    message: QueryDenomsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDenomsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDenomsRequest {
    return {
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message: QueryDenomsRequest): JsonSafe<QueryDenomsRequest> {
    const obj: any = {};
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryDenomsRequest>): QueryDenomsRequest {
    const message = createBaseQueryDenomsRequest();
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryDenomsRequestProtoMsg): QueryDenomsRequest {
    return QueryDenomsRequest.decode(message.value);
  },
  toProto(message: QueryDenomsRequest): Uint8Array {
    return QueryDenomsRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryDenomsRequest): QueryDenomsRequestProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.QueryDenomsRequest',
      value: QueryDenomsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomsResponse(): QueryDenomsResponse {
  return {
    denoms: [],
    pagination: undefined,
  };
}
/**
 * QueryDenomsResponse is the response type for the Query/Denoms RPC
 * method.
 * @name QueryDenomsResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomsResponse
 */
export const QueryDenomsResponse = {
  typeUrl: '/ibc.applications.transfer.v1.QueryDenomsResponse' as const,
  aminoType: 'cosmos-sdk/QueryDenomsResponse' as const,
  is(o: any): o is QueryDenomsResponse {
    return (
      o &&
      (o.$typeUrl === QueryDenomsResponse.typeUrl ||
        (Array.isArray(o.denoms) &&
          (!o.denoms.length || Denom.is(o.denoms[0]))))
    );
  },
  isSDK(o: any): o is QueryDenomsResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryDenomsResponse.typeUrl ||
        (Array.isArray(o.denoms) &&
          (!o.denoms.length || Denom.isSDK(o.denoms[0]))))
    );
  },
  encode(
    message: QueryDenomsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.denoms) {
      Denom.encode(v!, writer.uint32(10).fork()).ldelim();
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
  ): QueryDenomsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denoms.push(Denom.decode(reader, reader.uint32()));
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
  fromJSON(object: any): QueryDenomsResponse {
    return {
      denoms: Array.isArray(object?.denoms)
        ? object.denoms.map((e: any) => Denom.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message: QueryDenomsResponse): JsonSafe<QueryDenomsResponse> {
    const obj: any = {};
    if (message.denoms) {
      obj.denoms = message.denoms.map(e => (e ? Denom.toJSON(e) : undefined));
    } else {
      obj.denoms = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<QueryDenomsResponse>): QueryDenomsResponse {
    const message = createBaseQueryDenomsResponse();
    message.denoms = object.denoms?.map(e => Denom.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(message: QueryDenomsResponseProtoMsg): QueryDenomsResponse {
    return QueryDenomsResponse.decode(message.value);
  },
  toProto(message: QueryDenomsResponse): Uint8Array {
    return QueryDenomsResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryDenomsResponse): QueryDenomsResponseProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.QueryDenomsResponse',
      value: QueryDenomsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomHashRequest(): QueryDenomHashRequest {
  return {
    trace: '',
  };
}
/**
 * QueryDenomHashRequest is the request type for the Query/DenomHash RPC
 * method
 * @name QueryDenomHashRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomHashRequest
 */
export const QueryDenomHashRequest = {
  typeUrl: '/ibc.applications.transfer.v1.QueryDenomHashRequest' as const,
  aminoType: 'cosmos-sdk/QueryDenomHashRequest' as const,
  is(o: any): o is QueryDenomHashRequest {
    return (
      o &&
      (o.$typeUrl === QueryDenomHashRequest.typeUrl ||
        typeof o.trace === 'string')
    );
  },
  isSDK(o: any): o is QueryDenomHashRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryDenomHashRequest.typeUrl ||
        typeof o.trace === 'string')
    );
  },
  encode(
    message: QueryDenomHashRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.trace !== '') {
      writer.uint32(10).string(message.trace);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDenomHashRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomHashRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.trace = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDenomHashRequest {
    return {
      trace: isSet(object.trace) ? String(object.trace) : '',
    };
  },
  toJSON(message: QueryDenomHashRequest): JsonSafe<QueryDenomHashRequest> {
    const obj: any = {};
    message.trace !== undefined && (obj.trace = message.trace);
    return obj;
  },
  fromPartial(object: Partial<QueryDenomHashRequest>): QueryDenomHashRequest {
    const message = createBaseQueryDenomHashRequest();
    message.trace = object.trace ?? '';
    return message;
  },
  fromProtoMsg(message: QueryDenomHashRequestProtoMsg): QueryDenomHashRequest {
    return QueryDenomHashRequest.decode(message.value);
  },
  toProto(message: QueryDenomHashRequest): Uint8Array {
    return QueryDenomHashRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryDenomHashRequest): QueryDenomHashRequestProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.QueryDenomHashRequest',
      value: QueryDenomHashRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomHashResponse(): QueryDenomHashResponse {
  return {
    hash: '',
  };
}
/**
 * QueryDenomHashResponse is the response type for the Query/DenomHash RPC
 * method.
 * @name QueryDenomHashResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomHashResponse
 */
export const QueryDenomHashResponse = {
  typeUrl: '/ibc.applications.transfer.v1.QueryDenomHashResponse' as const,
  aminoType: 'cosmos-sdk/QueryDenomHashResponse' as const,
  is(o: any): o is QueryDenomHashResponse {
    return (
      o &&
      (o.$typeUrl === QueryDenomHashResponse.typeUrl ||
        typeof o.hash === 'string')
    );
  },
  isSDK(o: any): o is QueryDenomHashResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryDenomHashResponse.typeUrl ||
        typeof o.hash === 'string')
    );
  },
  encode(
    message: QueryDenomHashResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.hash !== '') {
      writer.uint32(10).string(message.hash);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDenomHashResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomHashResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.hash = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDenomHashResponse {
    return {
      hash: isSet(object.hash) ? String(object.hash) : '',
    };
  },
  toJSON(message: QueryDenomHashResponse): JsonSafe<QueryDenomHashResponse> {
    const obj: any = {};
    message.hash !== undefined && (obj.hash = message.hash);
    return obj;
  },
  fromPartial(object: Partial<QueryDenomHashResponse>): QueryDenomHashResponse {
    const message = createBaseQueryDenomHashResponse();
    message.hash = object.hash ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryDenomHashResponseProtoMsg,
  ): QueryDenomHashResponse {
    return QueryDenomHashResponse.decode(message.value);
  },
  toProto(message: QueryDenomHashResponse): Uint8Array {
    return QueryDenomHashResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryDenomHashResponse): QueryDenomHashResponseProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.QueryDenomHashResponse',
      value: QueryDenomHashResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryEscrowAddressRequest(): QueryEscrowAddressRequest {
  return {
    portId: '',
    channelId: '',
  };
}
/**
 * QueryEscrowAddressRequest is the request type for the EscrowAddress RPC method.
 * @name QueryEscrowAddressRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryEscrowAddressRequest
 */
export const QueryEscrowAddressRequest = {
  typeUrl: '/ibc.applications.transfer.v1.QueryEscrowAddressRequest' as const,
  aminoType: 'cosmos-sdk/QueryEscrowAddressRequest' as const,
  is(o: any): o is QueryEscrowAddressRequest {
    return (
      o &&
      (o.$typeUrl === QueryEscrowAddressRequest.typeUrl ||
        (typeof o.portId === 'string' && typeof o.channelId === 'string'))
    );
  },
  isSDK(o: any): o is QueryEscrowAddressRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryEscrowAddressRequest.typeUrl ||
        (typeof o.port_id === 'string' && typeof o.channel_id === 'string'))
    );
  },
  encode(
    message: QueryEscrowAddressRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.portId !== '') {
      writer.uint32(10).string(message.portId);
    }
    if (message.channelId !== '') {
      writer.uint32(18).string(message.channelId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryEscrowAddressRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryEscrowAddressRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.portId = reader.string();
          break;
        case 2:
          message.channelId = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryEscrowAddressRequest {
    return {
      portId: isSet(object.portId) ? String(object.portId) : '',
      channelId: isSet(object.channelId) ? String(object.channelId) : '',
    };
  },
  toJSON(
    message: QueryEscrowAddressRequest,
  ): JsonSafe<QueryEscrowAddressRequest> {
    const obj: any = {};
    message.portId !== undefined && (obj.portId = message.portId);
    message.channelId !== undefined && (obj.channelId = message.channelId);
    return obj;
  },
  fromPartial(
    object: Partial<QueryEscrowAddressRequest>,
  ): QueryEscrowAddressRequest {
    const message = createBaseQueryEscrowAddressRequest();
    message.portId = object.portId ?? '';
    message.channelId = object.channelId ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryEscrowAddressRequestProtoMsg,
  ): QueryEscrowAddressRequest {
    return QueryEscrowAddressRequest.decode(message.value);
  },
  toProto(message: QueryEscrowAddressRequest): Uint8Array {
    return QueryEscrowAddressRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryEscrowAddressRequest,
  ): QueryEscrowAddressRequestProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.QueryEscrowAddressRequest',
      value: QueryEscrowAddressRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryEscrowAddressResponse(): QueryEscrowAddressResponse {
  return {
    escrowAddress: '',
  };
}
/**
 * QueryEscrowAddressResponse is the response type of the EscrowAddress RPC method.
 * @name QueryEscrowAddressResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryEscrowAddressResponse
 */
export const QueryEscrowAddressResponse = {
  typeUrl: '/ibc.applications.transfer.v1.QueryEscrowAddressResponse' as const,
  aminoType: 'cosmos-sdk/QueryEscrowAddressResponse' as const,
  is(o: any): o is QueryEscrowAddressResponse {
    return (
      o &&
      (o.$typeUrl === QueryEscrowAddressResponse.typeUrl ||
        typeof o.escrowAddress === 'string')
    );
  },
  isSDK(o: any): o is QueryEscrowAddressResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryEscrowAddressResponse.typeUrl ||
        typeof o.escrow_address === 'string')
    );
  },
  encode(
    message: QueryEscrowAddressResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.escrowAddress !== '') {
      writer.uint32(10).string(message.escrowAddress);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryEscrowAddressResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryEscrowAddressResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.escrowAddress = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryEscrowAddressResponse {
    return {
      escrowAddress: isSet(object.escrowAddress)
        ? String(object.escrowAddress)
        : '',
    };
  },
  toJSON(
    message: QueryEscrowAddressResponse,
  ): JsonSafe<QueryEscrowAddressResponse> {
    const obj: any = {};
    message.escrowAddress !== undefined &&
      (obj.escrowAddress = message.escrowAddress);
    return obj;
  },
  fromPartial(
    object: Partial<QueryEscrowAddressResponse>,
  ): QueryEscrowAddressResponse {
    const message = createBaseQueryEscrowAddressResponse();
    message.escrowAddress = object.escrowAddress ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryEscrowAddressResponseProtoMsg,
  ): QueryEscrowAddressResponse {
    return QueryEscrowAddressResponse.decode(message.value);
  },
  toProto(message: QueryEscrowAddressResponse): Uint8Array {
    return QueryEscrowAddressResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryEscrowAddressResponse,
  ): QueryEscrowAddressResponseProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.QueryEscrowAddressResponse',
      value: QueryEscrowAddressResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryTotalEscrowForDenomRequest(): QueryTotalEscrowForDenomRequest {
  return {
    denom: '',
  };
}
/**
 * QueryTotalEscrowForDenomRequest is the request type for TotalEscrowForDenom RPC method.
 * @name QueryTotalEscrowForDenomRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryTotalEscrowForDenomRequest
 */
export const QueryTotalEscrowForDenomRequest = {
  typeUrl:
    '/ibc.applications.transfer.v1.QueryTotalEscrowForDenomRequest' as const,
  aminoType: 'cosmos-sdk/QueryTotalEscrowForDenomRequest' as const,
  is(o: any): o is QueryTotalEscrowForDenomRequest {
    return (
      o &&
      (o.$typeUrl === QueryTotalEscrowForDenomRequest.typeUrl ||
        typeof o.denom === 'string')
    );
  },
  isSDK(o: any): o is QueryTotalEscrowForDenomRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryTotalEscrowForDenomRequest.typeUrl ||
        typeof o.denom === 'string')
    );
  },
  encode(
    message: QueryTotalEscrowForDenomRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.denom !== '') {
      writer.uint32(10).string(message.denom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryTotalEscrowForDenomRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryTotalEscrowForDenomRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryTotalEscrowForDenomRequest {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(
    message: QueryTotalEscrowForDenomRequest,
  ): JsonSafe<QueryTotalEscrowForDenomRequest> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<QueryTotalEscrowForDenomRequest>,
  ): QueryTotalEscrowForDenomRequest {
    const message = createBaseQueryTotalEscrowForDenomRequest();
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryTotalEscrowForDenomRequestProtoMsg,
  ): QueryTotalEscrowForDenomRequest {
    return QueryTotalEscrowForDenomRequest.decode(message.value);
  },
  toProto(message: QueryTotalEscrowForDenomRequest): Uint8Array {
    return QueryTotalEscrowForDenomRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryTotalEscrowForDenomRequest,
  ): QueryTotalEscrowForDenomRequestProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.QueryTotalEscrowForDenomRequest',
      value: QueryTotalEscrowForDenomRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryTotalEscrowForDenomResponse(): QueryTotalEscrowForDenomResponse {
  return {
    amount: Coin.fromPartial({}),
  };
}
/**
 * QueryTotalEscrowForDenomResponse is the response type for TotalEscrowForDenom RPC method.
 * @name QueryTotalEscrowForDenomResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryTotalEscrowForDenomResponse
 */
export const QueryTotalEscrowForDenomResponse = {
  typeUrl:
    '/ibc.applications.transfer.v1.QueryTotalEscrowForDenomResponse' as const,
  aminoType: 'cosmos-sdk/QueryTotalEscrowForDenomResponse' as const,
  is(o: any): o is QueryTotalEscrowForDenomResponse {
    return (
      o &&
      (o.$typeUrl === QueryTotalEscrowForDenomResponse.typeUrl ||
        Coin.is(o.amount))
    );
  },
  isSDK(o: any): o is QueryTotalEscrowForDenomResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryTotalEscrowForDenomResponse.typeUrl ||
        Coin.isSDK(o.amount))
    );
  },
  encode(
    message: QueryTotalEscrowForDenomResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.amount !== undefined) {
      Coin.encode(message.amount, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryTotalEscrowForDenomResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryTotalEscrowForDenomResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.amount = Coin.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryTotalEscrowForDenomResponse {
    return {
      amount: isSet(object.amount) ? Coin.fromJSON(object.amount) : undefined,
    };
  },
  toJSON(
    message: QueryTotalEscrowForDenomResponse,
  ): JsonSafe<QueryTotalEscrowForDenomResponse> {
    const obj: any = {};
    message.amount !== undefined &&
      (obj.amount = message.amount ? Coin.toJSON(message.amount) : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryTotalEscrowForDenomResponse>,
  ): QueryTotalEscrowForDenomResponse {
    const message = createBaseQueryTotalEscrowForDenomResponse();
    message.amount =
      object.amount !== undefined && object.amount !== null
        ? Coin.fromPartial(object.amount)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryTotalEscrowForDenomResponseProtoMsg,
  ): QueryTotalEscrowForDenomResponse {
    return QueryTotalEscrowForDenomResponse.decode(message.value);
  },
  toProto(message: QueryTotalEscrowForDenomResponse): Uint8Array {
    return QueryTotalEscrowForDenomResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryTotalEscrowForDenomResponse,
  ): QueryTotalEscrowForDenomResponseProtoMsg {
    return {
      typeUrl: '/ibc.applications.transfer.v1.QueryTotalEscrowForDenomResponse',
      value: QueryTotalEscrowForDenomResponse.encode(message).finish(),
    };
  },
};
