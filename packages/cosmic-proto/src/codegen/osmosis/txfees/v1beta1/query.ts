//@ts-nocheck
import { FeeToken, FeeTokenSDKType } from './feetoken.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { JsonSafe } from '../../../json-safe.js';
import { isSet } from '../../../helpers.js';
import { Decimal } from '@cosmjs/math';
export interface QueryFeeTokensRequest {}
export interface QueryFeeTokensRequestProtoMsg {
  typeUrl: '/osmosis.txfees.v1beta1.QueryFeeTokensRequest';
  value: Uint8Array;
}
export interface QueryFeeTokensRequestSDKType {}
export interface QueryFeeTokensResponse {
  feeTokens: FeeToken[];
}
export interface QueryFeeTokensResponseProtoMsg {
  typeUrl: '/osmosis.txfees.v1beta1.QueryFeeTokensResponse';
  value: Uint8Array;
}
export interface QueryFeeTokensResponseSDKType {
  fee_tokens: FeeTokenSDKType[];
}
/**
 * QueryDenomSpotPriceRequest defines grpc request structure for querying spot
 * price for the specified tx fee denom
 */
export interface QueryDenomSpotPriceRequest {
  denom: string;
}
export interface QueryDenomSpotPriceRequestProtoMsg {
  typeUrl: '/osmosis.txfees.v1beta1.QueryDenomSpotPriceRequest';
  value: Uint8Array;
}
/**
 * QueryDenomSpotPriceRequest defines grpc request structure for querying spot
 * price for the specified tx fee denom
 */
export interface QueryDenomSpotPriceRequestSDKType {
  denom: string;
}
/**
 * QueryDenomSpotPriceRequest defines grpc response structure for querying spot
 * price for the specified tx fee denom
 */
export interface QueryDenomSpotPriceResponse {
  poolID: bigint;
  spotPrice: string;
}
export interface QueryDenomSpotPriceResponseProtoMsg {
  typeUrl: '/osmosis.txfees.v1beta1.QueryDenomSpotPriceResponse';
  value: Uint8Array;
}
/**
 * QueryDenomSpotPriceRequest defines grpc response structure for querying spot
 * price for the specified tx fee denom
 */
export interface QueryDenomSpotPriceResponseSDKType {
  poolID: bigint;
  spot_price: string;
}
export interface QueryDenomPoolIdRequest {
  denom: string;
}
export interface QueryDenomPoolIdRequestProtoMsg {
  typeUrl: '/osmosis.txfees.v1beta1.QueryDenomPoolIdRequest';
  value: Uint8Array;
}
export interface QueryDenomPoolIdRequestSDKType {
  denom: string;
}
export interface QueryDenomPoolIdResponse {
  poolID: bigint;
}
export interface QueryDenomPoolIdResponseProtoMsg {
  typeUrl: '/osmosis.txfees.v1beta1.QueryDenomPoolIdResponse';
  value: Uint8Array;
}
export interface QueryDenomPoolIdResponseSDKType {
  poolID: bigint;
}
export interface QueryBaseDenomRequest {}
export interface QueryBaseDenomRequestProtoMsg {
  typeUrl: '/osmosis.txfees.v1beta1.QueryBaseDenomRequest';
  value: Uint8Array;
}
export interface QueryBaseDenomRequestSDKType {}
export interface QueryBaseDenomResponse {
  baseDenom: string;
}
export interface QueryBaseDenomResponseProtoMsg {
  typeUrl: '/osmosis.txfees.v1beta1.QueryBaseDenomResponse';
  value: Uint8Array;
}
export interface QueryBaseDenomResponseSDKType {
  base_denom: string;
}
function createBaseQueryFeeTokensRequest(): QueryFeeTokensRequest {
  return {};
}
export const QueryFeeTokensRequest = {
  typeUrl: '/osmosis.txfees.v1beta1.QueryFeeTokensRequest',
  encode(
    _: QueryFeeTokensRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryFeeTokensRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryFeeTokensRequest();
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
  fromJSON(_: any): QueryFeeTokensRequest {
    return {};
  },
  toJSON(_: QueryFeeTokensRequest): JsonSafe<QueryFeeTokensRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryFeeTokensRequest>): QueryFeeTokensRequest {
    const message = createBaseQueryFeeTokensRequest();
    return message;
  },
  fromProtoMsg(message: QueryFeeTokensRequestProtoMsg): QueryFeeTokensRequest {
    return QueryFeeTokensRequest.decode(message.value);
  },
  toProto(message: QueryFeeTokensRequest): Uint8Array {
    return QueryFeeTokensRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryFeeTokensRequest): QueryFeeTokensRequestProtoMsg {
    return {
      typeUrl: '/osmosis.txfees.v1beta1.QueryFeeTokensRequest',
      value: QueryFeeTokensRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryFeeTokensResponse(): QueryFeeTokensResponse {
  return {
    feeTokens: [],
  };
}
export const QueryFeeTokensResponse = {
  typeUrl: '/osmosis.txfees.v1beta1.QueryFeeTokensResponse',
  encode(
    message: QueryFeeTokensResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.feeTokens) {
      FeeToken.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryFeeTokensResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryFeeTokensResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.feeTokens.push(FeeToken.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryFeeTokensResponse {
    return {
      feeTokens: Array.isArray(object?.feeTokens)
        ? object.feeTokens.map((e: any) => FeeToken.fromJSON(e))
        : [],
    };
  },
  toJSON(message: QueryFeeTokensResponse): JsonSafe<QueryFeeTokensResponse> {
    const obj: any = {};
    if (message.feeTokens) {
      obj.feeTokens = message.feeTokens.map(e =>
        e ? FeeToken.toJSON(e) : undefined,
      );
    } else {
      obj.feeTokens = [];
    }
    return obj;
  },
  fromPartial(object: Partial<QueryFeeTokensResponse>): QueryFeeTokensResponse {
    const message = createBaseQueryFeeTokensResponse();
    message.feeTokens =
      object.feeTokens?.map(e => FeeToken.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryFeeTokensResponseProtoMsg,
  ): QueryFeeTokensResponse {
    return QueryFeeTokensResponse.decode(message.value);
  },
  toProto(message: QueryFeeTokensResponse): Uint8Array {
    return QueryFeeTokensResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryFeeTokensResponse): QueryFeeTokensResponseProtoMsg {
    return {
      typeUrl: '/osmosis.txfees.v1beta1.QueryFeeTokensResponse',
      value: QueryFeeTokensResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomSpotPriceRequest(): QueryDenomSpotPriceRequest {
  return {
    denom: '',
  };
}
export const QueryDenomSpotPriceRequest = {
  typeUrl: '/osmosis.txfees.v1beta1.QueryDenomSpotPriceRequest',
  encode(
    message: QueryDenomSpotPriceRequest,
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
  ): QueryDenomSpotPriceRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomSpotPriceRequest();
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
  fromJSON(object: any): QueryDenomSpotPriceRequest {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(
    message: QueryDenomSpotPriceRequest,
  ): JsonSafe<QueryDenomSpotPriceRequest> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<QueryDenomSpotPriceRequest>,
  ): QueryDenomSpotPriceRequest {
    const message = createBaseQueryDenomSpotPriceRequest();
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryDenomSpotPriceRequestProtoMsg,
  ): QueryDenomSpotPriceRequest {
    return QueryDenomSpotPriceRequest.decode(message.value);
  },
  toProto(message: QueryDenomSpotPriceRequest): Uint8Array {
    return QueryDenomSpotPriceRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDenomSpotPriceRequest,
  ): QueryDenomSpotPriceRequestProtoMsg {
    return {
      typeUrl: '/osmosis.txfees.v1beta1.QueryDenomSpotPriceRequest',
      value: QueryDenomSpotPriceRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomSpotPriceResponse(): QueryDenomSpotPriceResponse {
  return {
    poolID: BigInt(0),
    spotPrice: '',
  };
}
export const QueryDenomSpotPriceResponse = {
  typeUrl: '/osmosis.txfees.v1beta1.QueryDenomSpotPriceResponse',
  encode(
    message: QueryDenomSpotPriceResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolID !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolID);
    }
    if (message.spotPrice !== '') {
      writer
        .uint32(18)
        .string(Decimal.fromUserInput(message.spotPrice, 18).atomics);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDenomSpotPriceResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomSpotPriceResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolID = reader.uint64();
          break;
        case 2:
          message.spotPrice = Decimal.fromAtomics(
            reader.string(),
            18,
          ).toString();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDenomSpotPriceResponse {
    return {
      poolID: isSet(object.poolID)
        ? BigInt(object.poolID.toString())
        : BigInt(0),
      spotPrice: isSet(object.spotPrice) ? String(object.spotPrice) : '',
    };
  },
  toJSON(
    message: QueryDenomSpotPriceResponse,
  ): JsonSafe<QueryDenomSpotPriceResponse> {
    const obj: any = {};
    message.poolID !== undefined &&
      (obj.poolID = (message.poolID || BigInt(0)).toString());
    message.spotPrice !== undefined && (obj.spotPrice = message.spotPrice);
    return obj;
  },
  fromPartial(
    object: Partial<QueryDenomSpotPriceResponse>,
  ): QueryDenomSpotPriceResponse {
    const message = createBaseQueryDenomSpotPriceResponse();
    message.poolID =
      object.poolID !== undefined && object.poolID !== null
        ? BigInt(object.poolID.toString())
        : BigInt(0);
    message.spotPrice = object.spotPrice ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryDenomSpotPriceResponseProtoMsg,
  ): QueryDenomSpotPriceResponse {
    return QueryDenomSpotPriceResponse.decode(message.value);
  },
  toProto(message: QueryDenomSpotPriceResponse): Uint8Array {
    return QueryDenomSpotPriceResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDenomSpotPriceResponse,
  ): QueryDenomSpotPriceResponseProtoMsg {
    return {
      typeUrl: '/osmosis.txfees.v1beta1.QueryDenomSpotPriceResponse',
      value: QueryDenomSpotPriceResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomPoolIdRequest(): QueryDenomPoolIdRequest {
  return {
    denom: '',
  };
}
export const QueryDenomPoolIdRequest = {
  typeUrl: '/osmosis.txfees.v1beta1.QueryDenomPoolIdRequest',
  encode(
    message: QueryDenomPoolIdRequest,
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
  ): QueryDenomPoolIdRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomPoolIdRequest();
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
  fromJSON(object: any): QueryDenomPoolIdRequest {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(message: QueryDenomPoolIdRequest): JsonSafe<QueryDenomPoolIdRequest> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<QueryDenomPoolIdRequest>,
  ): QueryDenomPoolIdRequest {
    const message = createBaseQueryDenomPoolIdRequest();
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryDenomPoolIdRequestProtoMsg,
  ): QueryDenomPoolIdRequest {
    return QueryDenomPoolIdRequest.decode(message.value);
  },
  toProto(message: QueryDenomPoolIdRequest): Uint8Array {
    return QueryDenomPoolIdRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDenomPoolIdRequest,
  ): QueryDenomPoolIdRequestProtoMsg {
    return {
      typeUrl: '/osmosis.txfees.v1beta1.QueryDenomPoolIdRequest',
      value: QueryDenomPoolIdRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryDenomPoolIdResponse(): QueryDenomPoolIdResponse {
  return {
    poolID: BigInt(0),
  };
}
export const QueryDenomPoolIdResponse = {
  typeUrl: '/osmosis.txfees.v1beta1.QueryDenomPoolIdResponse',
  encode(
    message: QueryDenomPoolIdResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolID !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolID);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryDenomPoolIdResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryDenomPoolIdResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolID = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryDenomPoolIdResponse {
    return {
      poolID: isSet(object.poolID)
        ? BigInt(object.poolID.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: QueryDenomPoolIdResponse,
  ): JsonSafe<QueryDenomPoolIdResponse> {
    const obj: any = {};
    message.poolID !== undefined &&
      (obj.poolID = (message.poolID || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<QueryDenomPoolIdResponse>,
  ): QueryDenomPoolIdResponse {
    const message = createBaseQueryDenomPoolIdResponse();
    message.poolID =
      object.poolID !== undefined && object.poolID !== null
        ? BigInt(object.poolID.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: QueryDenomPoolIdResponseProtoMsg,
  ): QueryDenomPoolIdResponse {
    return QueryDenomPoolIdResponse.decode(message.value);
  },
  toProto(message: QueryDenomPoolIdResponse): Uint8Array {
    return QueryDenomPoolIdResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryDenomPoolIdResponse,
  ): QueryDenomPoolIdResponseProtoMsg {
    return {
      typeUrl: '/osmosis.txfees.v1beta1.QueryDenomPoolIdResponse',
      value: QueryDenomPoolIdResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryBaseDenomRequest(): QueryBaseDenomRequest {
  return {};
}
export const QueryBaseDenomRequest = {
  typeUrl: '/osmosis.txfees.v1beta1.QueryBaseDenomRequest',
  encode(
    _: QueryBaseDenomRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryBaseDenomRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryBaseDenomRequest();
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
  fromJSON(_: any): QueryBaseDenomRequest {
    return {};
  },
  toJSON(_: QueryBaseDenomRequest): JsonSafe<QueryBaseDenomRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryBaseDenomRequest>): QueryBaseDenomRequest {
    const message = createBaseQueryBaseDenomRequest();
    return message;
  },
  fromProtoMsg(message: QueryBaseDenomRequestProtoMsg): QueryBaseDenomRequest {
    return QueryBaseDenomRequest.decode(message.value);
  },
  toProto(message: QueryBaseDenomRequest): Uint8Array {
    return QueryBaseDenomRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryBaseDenomRequest): QueryBaseDenomRequestProtoMsg {
    return {
      typeUrl: '/osmosis.txfees.v1beta1.QueryBaseDenomRequest',
      value: QueryBaseDenomRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryBaseDenomResponse(): QueryBaseDenomResponse {
  return {
    baseDenom: '',
  };
}
export const QueryBaseDenomResponse = {
  typeUrl: '/osmosis.txfees.v1beta1.QueryBaseDenomResponse',
  encode(
    message: QueryBaseDenomResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.baseDenom !== '') {
      writer.uint32(10).string(message.baseDenom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryBaseDenomResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryBaseDenomResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.baseDenom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryBaseDenomResponse {
    return {
      baseDenom: isSet(object.baseDenom) ? String(object.baseDenom) : '',
    };
  },
  toJSON(message: QueryBaseDenomResponse): JsonSafe<QueryBaseDenomResponse> {
    const obj: any = {};
    message.baseDenom !== undefined && (obj.baseDenom = message.baseDenom);
    return obj;
  },
  fromPartial(object: Partial<QueryBaseDenomResponse>): QueryBaseDenomResponse {
    const message = createBaseQueryBaseDenomResponse();
    message.baseDenom = object.baseDenom ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryBaseDenomResponseProtoMsg,
  ): QueryBaseDenomResponse {
    return QueryBaseDenomResponse.decode(message.value);
  },
  toProto(message: QueryBaseDenomResponse): Uint8Array {
    return QueryBaseDenomResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryBaseDenomResponse): QueryBaseDenomResponseProtoMsg {
    return {
      typeUrl: '/osmosis.txfees.v1beta1.QueryBaseDenomResponse',
      value: QueryBaseDenomResponse.encode(message).finish(),
    };
  },
};
