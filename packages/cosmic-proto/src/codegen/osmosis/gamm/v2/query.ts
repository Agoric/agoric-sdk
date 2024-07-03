//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { JsonSafe } from '../../../json-safe.js';
/**
 * QuerySpotPriceRequest defines the gRPC request structure for a SpotPrice
 * query.
 */
export interface QuerySpotPriceRequest {
  poolId: bigint;
  baseAssetDenom: string;
  quoteAssetDenom: string;
}
export interface QuerySpotPriceRequestProtoMsg {
  typeUrl: '/osmosis.gamm.v2.QuerySpotPriceRequest';
  value: Uint8Array;
}
/**
 * QuerySpotPriceRequest defines the gRPC request structure for a SpotPrice
 * query.
 */
export interface QuerySpotPriceRequestSDKType {
  pool_id: bigint;
  base_asset_denom: string;
  quote_asset_denom: string;
}
/**
 * QuerySpotPriceResponse defines the gRPC response structure for a SpotPrice
 * query.
 */
export interface QuerySpotPriceResponse {
  /** String of the Dec. Ex) 10.203uatom */
  spotPrice: string;
}
export interface QuerySpotPriceResponseProtoMsg {
  typeUrl: '/osmosis.gamm.v2.QuerySpotPriceResponse';
  value: Uint8Array;
}
/**
 * QuerySpotPriceResponse defines the gRPC response structure for a SpotPrice
 * query.
 */
export interface QuerySpotPriceResponseSDKType {
  spot_price: string;
}
function createBaseQuerySpotPriceRequest(): QuerySpotPriceRequest {
  return {
    poolId: BigInt(0),
    baseAssetDenom: '',
    quoteAssetDenom: '',
  };
}
export const QuerySpotPriceRequest = {
  typeUrl: '/osmosis.gamm.v2.QuerySpotPriceRequest',
  encode(
    message: QuerySpotPriceRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolId !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolId);
    }
    if (message.baseAssetDenom !== '') {
      writer.uint32(18).string(message.baseAssetDenom);
    }
    if (message.quoteAssetDenom !== '') {
      writer.uint32(26).string(message.quoteAssetDenom);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QuerySpotPriceRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQuerySpotPriceRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolId = reader.uint64();
          break;
        case 2:
          message.baseAssetDenom = reader.string();
          break;
        case 3:
          message.quoteAssetDenom = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QuerySpotPriceRequest {
    return {
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
      baseAssetDenom: isSet(object.baseAssetDenom)
        ? String(object.baseAssetDenom)
        : '',
      quoteAssetDenom: isSet(object.quoteAssetDenom)
        ? String(object.quoteAssetDenom)
        : '',
    };
  },
  toJSON(message: QuerySpotPriceRequest): JsonSafe<QuerySpotPriceRequest> {
    const obj: any = {};
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    message.baseAssetDenom !== undefined &&
      (obj.baseAssetDenom = message.baseAssetDenom);
    message.quoteAssetDenom !== undefined &&
      (obj.quoteAssetDenom = message.quoteAssetDenom);
    return obj;
  },
  fromPartial(object: Partial<QuerySpotPriceRequest>): QuerySpotPriceRequest {
    const message = createBaseQuerySpotPriceRequest();
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    message.baseAssetDenom = object.baseAssetDenom ?? '';
    message.quoteAssetDenom = object.quoteAssetDenom ?? '';
    return message;
  },
  fromProtoMsg(message: QuerySpotPriceRequestProtoMsg): QuerySpotPriceRequest {
    return QuerySpotPriceRequest.decode(message.value);
  },
  toProto(message: QuerySpotPriceRequest): Uint8Array {
    return QuerySpotPriceRequest.encode(message).finish();
  },
  toProtoMsg(message: QuerySpotPriceRequest): QuerySpotPriceRequestProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v2.QuerySpotPriceRequest',
      value: QuerySpotPriceRequest.encode(message).finish(),
    };
  },
};
function createBaseQuerySpotPriceResponse(): QuerySpotPriceResponse {
  return {
    spotPrice: '',
  };
}
export const QuerySpotPriceResponse = {
  typeUrl: '/osmosis.gamm.v2.QuerySpotPriceResponse',
  encode(
    message: QuerySpotPriceResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.spotPrice !== '') {
      writer.uint32(10).string(message.spotPrice);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QuerySpotPriceResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQuerySpotPriceResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.spotPrice = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QuerySpotPriceResponse {
    return {
      spotPrice: isSet(object.spotPrice) ? String(object.spotPrice) : '',
    };
  },
  toJSON(message: QuerySpotPriceResponse): JsonSafe<QuerySpotPriceResponse> {
    const obj: any = {};
    message.spotPrice !== undefined && (obj.spotPrice = message.spotPrice);
    return obj;
  },
  fromPartial(object: Partial<QuerySpotPriceResponse>): QuerySpotPriceResponse {
    const message = createBaseQuerySpotPriceResponse();
    message.spotPrice = object.spotPrice ?? '';
    return message;
  },
  fromProtoMsg(
    message: QuerySpotPriceResponseProtoMsg,
  ): QuerySpotPriceResponse {
    return QuerySpotPriceResponse.decode(message.value);
  },
  toProto(message: QuerySpotPriceResponse): Uint8Array {
    return QuerySpotPriceResponse.encode(message).finish();
  },
  toProtoMsg(message: QuerySpotPriceResponse): QuerySpotPriceResponseProtoMsg {
    return {
      typeUrl: '/osmosis.gamm.v2.QuerySpotPriceResponse',
      value: QuerySpotPriceResponse.encode(message).finish(),
    };
  },
};
