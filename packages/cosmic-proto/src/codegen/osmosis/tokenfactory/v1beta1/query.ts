//@ts-nocheck
import { Params, ParamsSDKType } from './params.js';
import {
  DenomAuthorityMetadata,
  DenomAuthorityMetadataSDKType,
} from './authorityMetadata.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { JsonSafe } from '../../../json-safe.js';
import { isSet } from '../../../helpers.js';
/** QueryParamsRequest is the request type for the Query/Params RPC method. */
export interface QueryParamsRequest {}
export interface QueryParamsRequestProtoMsg {
  typeUrl: '/osmosis.tokenfactory.v1beta1.QueryParamsRequest';
  value: Uint8Array;
}
/** QueryParamsRequest is the request type for the Query/Params RPC method. */
export interface QueryParamsRequestSDKType {}
/** QueryParamsResponse is the response type for the Query/Params RPC method. */
export interface QueryParamsResponse {
  /** params defines the parameters of the module. */
  params: Params;
}
export interface QueryParamsResponseProtoMsg {
  typeUrl: '/osmosis.tokenfactory.v1beta1.QueryParamsResponse';
  value: Uint8Array;
}
/** QueryParamsResponse is the response type for the Query/Params RPC method. */
export interface QueryParamsResponseSDKType {
  params: ParamsSDKType;
}
/**
 * QueryDenomAuthorityMetadataRequest defines the request structure for the
 * DenomAuthorityMetadata gRPC query.
 */
export interface QueryDenomAuthorityMetadataRequest {
  denom: string;
}
export interface QueryDenomAuthorityMetadataRequestProtoMsg {
  typeUrl: '/osmosis.tokenfactory.v1beta1.QueryDenomAuthorityMetadataRequest';
  value: Uint8Array;
}
/**
 * QueryDenomAuthorityMetadataRequest defines the request structure for the
 * DenomAuthorityMetadata gRPC query.
 */
export interface QueryDenomAuthorityMetadataRequestSDKType {
  denom: string;
}
/**
 * QueryDenomAuthorityMetadataResponse defines the response structure for the
 * DenomAuthorityMetadata gRPC query.
 */
export interface QueryDenomAuthorityMetadataResponse {
  authorityMetadata: DenomAuthorityMetadata;
}
export interface QueryDenomAuthorityMetadataResponseProtoMsg {
  typeUrl: '/osmosis.tokenfactory.v1beta1.QueryDenomAuthorityMetadataResponse';
  value: Uint8Array;
}
/**
 * QueryDenomAuthorityMetadataResponse defines the response structure for the
 * DenomAuthorityMetadata gRPC query.
 */
export interface QueryDenomAuthorityMetadataResponseSDKType {
  authority_metadata: DenomAuthorityMetadataSDKType;
}
/**
 * QueryDenomsFromCreatorRequest defines the request structure for the
 * DenomsFromCreator gRPC query.
 */
export interface QueryDenomsFromCreatorRequest {
  creator: string;
}
export interface QueryDenomsFromCreatorRequestProtoMsg {
  typeUrl: '/osmosis.tokenfactory.v1beta1.QueryDenomsFromCreatorRequest';
  value: Uint8Array;
}
/**
 * QueryDenomsFromCreatorRequest defines the request structure for the
 * DenomsFromCreator gRPC query.
 */
export interface QueryDenomsFromCreatorRequestSDKType {
  creator: string;
}
/**
 * QueryDenomsFromCreatorRequest defines the response structure for the
 * DenomsFromCreator gRPC query.
 */
export interface QueryDenomsFromCreatorResponse {
  denoms: string[];
}
export interface QueryDenomsFromCreatorResponseProtoMsg {
  typeUrl: '/osmosis.tokenfactory.v1beta1.QueryDenomsFromCreatorResponse';
  value: Uint8Array;
}
/**
 * QueryDenomsFromCreatorRequest defines the response structure for the
 * DenomsFromCreator gRPC query.
 */
export interface QueryDenomsFromCreatorResponseSDKType {
  denoms: string[];
}
function createBaseQueryParamsRequest(): QueryParamsRequest {
  return {};
}
export const QueryParamsRequest = {
  typeUrl: '/osmosis.tokenfactory.v1beta1.QueryParamsRequest',
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
      typeUrl: '/osmosis.tokenfactory.v1beta1.QueryParamsRequest',
      value: QueryParamsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryParamsResponse(): QueryParamsResponse {
  return {
    params: Params.fromPartial({}),
  };
}
export const QueryParamsResponse = {
  typeUrl: '/osmosis.tokenfactory.v1beta1.QueryParamsResponse',
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
      typeUrl: '/osmosis.tokenfactory.v1beta1.QueryParamsResponse',
      value: QueryParamsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomAuthorityMetadataRequest(): QueryDenomAuthorityMetadataRequest {
  return {
    denom: '',
  };
}
export const QueryDenomAuthorityMetadataRequest = {
  typeUrl: '/osmosis.tokenfactory.v1beta1.QueryDenomAuthorityMetadataRequest',
  encode(
    message: QueryDenomAuthorityMetadataRequest,
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
  ): QueryDenomAuthorityMetadataRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomAuthorityMetadataRequest();
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
  fromJSON(object: any): QueryDenomAuthorityMetadataRequest {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(
    message: QueryDenomAuthorityMetadataRequest,
  ): JsonSafe<QueryDenomAuthorityMetadataRequest> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<QueryDenomAuthorityMetadataRequest>,
  ): QueryDenomAuthorityMetadataRequest {
    const message = createBaseQueryDenomAuthorityMetadataRequest();
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryDenomAuthorityMetadataRequestProtoMsg,
  ): QueryDenomAuthorityMetadataRequest {
    return QueryDenomAuthorityMetadataRequest.decode(message.value);
  },
  toProto(message: QueryDenomAuthorityMetadataRequest): Uint8Array {
    return QueryDenomAuthorityMetadataRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDenomAuthorityMetadataRequest,
  ): QueryDenomAuthorityMetadataRequestProtoMsg {
    return {
      typeUrl:
        '/osmosis.tokenfactory.v1beta1.QueryDenomAuthorityMetadataRequest',
      value: QueryDenomAuthorityMetadataRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomAuthorityMetadataResponse(): QueryDenomAuthorityMetadataResponse {
  return {
    authorityMetadata: DenomAuthorityMetadata.fromPartial({}),
  };
}
export const QueryDenomAuthorityMetadataResponse = {
  typeUrl: '/osmosis.tokenfactory.v1beta1.QueryDenomAuthorityMetadataResponse',
  encode(
    message: QueryDenomAuthorityMetadataResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.authorityMetadata !== undefined) {
      DenomAuthorityMetadata.encode(
        message.authorityMetadata,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDenomAuthorityMetadataResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomAuthorityMetadataResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.authorityMetadata = DenomAuthorityMetadata.decode(
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
  fromJSON(object: any): QueryDenomAuthorityMetadataResponse {
    return {
      authorityMetadata: isSet(object.authorityMetadata)
        ? DenomAuthorityMetadata.fromJSON(object.authorityMetadata)
        : undefined,
    };
  },
  toJSON(
    message: QueryDenomAuthorityMetadataResponse,
  ): JsonSafe<QueryDenomAuthorityMetadataResponse> {
    const obj: any = {};
    message.authorityMetadata !== undefined &&
      (obj.authorityMetadata = message.authorityMetadata
        ? DenomAuthorityMetadata.toJSON(message.authorityMetadata)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryDenomAuthorityMetadataResponse>,
  ): QueryDenomAuthorityMetadataResponse {
    const message = createBaseQueryDenomAuthorityMetadataResponse();
    message.authorityMetadata =
      object.authorityMetadata !== undefined &&
      object.authorityMetadata !== null
        ? DenomAuthorityMetadata.fromPartial(object.authorityMetadata)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryDenomAuthorityMetadataResponseProtoMsg,
  ): QueryDenomAuthorityMetadataResponse {
    return QueryDenomAuthorityMetadataResponse.decode(message.value);
  },
  toProto(message: QueryDenomAuthorityMetadataResponse): Uint8Array {
    return QueryDenomAuthorityMetadataResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDenomAuthorityMetadataResponse,
  ): QueryDenomAuthorityMetadataResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.tokenfactory.v1beta1.QueryDenomAuthorityMetadataResponse',
      value: QueryDenomAuthorityMetadataResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomsFromCreatorRequest(): QueryDenomsFromCreatorRequest {
  return {
    creator: '',
  };
}
export const QueryDenomsFromCreatorRequest = {
  typeUrl: '/osmosis.tokenfactory.v1beta1.QueryDenomsFromCreatorRequest',
  encode(
    message: QueryDenomsFromCreatorRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.creator !== '') {
      writer.uint32(10).string(message.creator);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDenomsFromCreatorRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomsFromCreatorRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.creator = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDenomsFromCreatorRequest {
    return {
      creator: isSet(object.creator) ? String(object.creator) : '',
    };
  },
  toJSON(
    message: QueryDenomsFromCreatorRequest,
  ): JsonSafe<QueryDenomsFromCreatorRequest> {
    const obj: any = {};
    message.creator !== undefined && (obj.creator = message.creator);
    return obj;
  },
  fromPartial(
    object: Partial<QueryDenomsFromCreatorRequest>,
  ): QueryDenomsFromCreatorRequest {
    const message = createBaseQueryDenomsFromCreatorRequest();
    message.creator = object.creator ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryDenomsFromCreatorRequestProtoMsg,
  ): QueryDenomsFromCreatorRequest {
    return QueryDenomsFromCreatorRequest.decode(message.value);
  },
  toProto(message: QueryDenomsFromCreatorRequest): Uint8Array {
    return QueryDenomsFromCreatorRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDenomsFromCreatorRequest,
  ): QueryDenomsFromCreatorRequestProtoMsg {
    return {
      typeUrl: '/osmosis.tokenfactory.v1beta1.QueryDenomsFromCreatorRequest',
      value: QueryDenomsFromCreatorRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomsFromCreatorResponse(): QueryDenomsFromCreatorResponse {
  return {
    denoms: [],
  };
}
export const QueryDenomsFromCreatorResponse = {
  typeUrl: '/osmosis.tokenfactory.v1beta1.QueryDenomsFromCreatorResponse',
  encode(
    message: QueryDenomsFromCreatorResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.denoms) {
      writer.uint32(10).string(v!);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDenomsFromCreatorResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomsFromCreatorResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.denoms.push(reader.string());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDenomsFromCreatorResponse {
    return {
      denoms: Array.isArray(object?.denoms)
        ? object.denoms.map((e: any) => String(e))
        : [],
    };
  },
  toJSON(
    message: QueryDenomsFromCreatorResponse,
  ): JsonSafe<QueryDenomsFromCreatorResponse> {
    const obj: any = {};
    if (message.denoms) {
      obj.denoms = message.denoms.map(e => e);
    } else {
      obj.denoms = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryDenomsFromCreatorResponse>,
  ): QueryDenomsFromCreatorResponse {
    const message = createBaseQueryDenomsFromCreatorResponse();
    message.denoms = object.denoms?.map(e => e) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryDenomsFromCreatorResponseProtoMsg,
  ): QueryDenomsFromCreatorResponse {
    return QueryDenomsFromCreatorResponse.decode(message.value);
  },
  toProto(message: QueryDenomsFromCreatorResponse): Uint8Array {
    return QueryDenomsFromCreatorResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDenomsFromCreatorResponse,
  ): QueryDenomsFromCreatorResponseProtoMsg {
    return {
      typeUrl: '/osmosis.tokenfactory.v1beta1.QueryDenomsFromCreatorResponse',
      value: QueryDenomsFromCreatorResponse.encode(message).finish(),
    };
  },
};
