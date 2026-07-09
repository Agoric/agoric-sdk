//@ts-nocheck
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
import { isSet } from '../../../helpers.js';
/**
 * QueryGetCountRequest defines the request type for querying x/mock count.
 * @name QueryGetCountRequest
 * @package cosmos.counter.v1
 * @see proto type: cosmos.counter.v1.QueryGetCountRequest
 */
export interface QueryGetCountRequest {}
export interface QueryGetCountRequestProtoMsg {
  typeUrl: '/cosmos.counter.v1.QueryGetCountRequest';
  value: Uint8Array;
}
/**
 * QueryGetCountRequest defines the request type for querying x/mock count.
 * @name QueryGetCountRequestSDKType
 * @package cosmos.counter.v1
 * @see proto type: cosmos.counter.v1.QueryGetCountRequest
 */
export interface QueryGetCountRequestSDKType {}
/**
 * QueryGetCountResponse defines the response type for querying x/mock count.
 * @name QueryGetCountResponse
 * @package cosmos.counter.v1
 * @see proto type: cosmos.counter.v1.QueryGetCountResponse
 */
export interface QueryGetCountResponse {
  totalCount: bigint;
}
export interface QueryGetCountResponseProtoMsg {
  typeUrl: '/cosmos.counter.v1.QueryGetCountResponse';
  value: Uint8Array;
}
/**
 * QueryGetCountResponse defines the response type for querying x/mock count.
 * @name QueryGetCountResponseSDKType
 * @package cosmos.counter.v1
 * @see proto type: cosmos.counter.v1.QueryGetCountResponse
 */
export interface QueryGetCountResponseSDKType {
  total_count: bigint;
}
function createBaseQueryGetCountRequest(): QueryGetCountRequest {
  return {};
}
/**
 * QueryGetCountRequest defines the request type for querying x/mock count.
 * @name QueryGetCountRequest
 * @package cosmos.counter.v1
 * @see proto type: cosmos.counter.v1.QueryGetCountRequest
 */
export const QueryGetCountRequest = {
  typeUrl: '/cosmos.counter.v1.QueryGetCountRequest' as const,
  aminoType: 'cosmos-sdk/QueryGetCountRequest' as const,
  is(o: any): o is QueryGetCountRequest {
    return o && o.$typeUrl === QueryGetCountRequest.typeUrl;
  },
  isSDK(o: any): o is QueryGetCountRequestSDKType {
    return o && o.$typeUrl === QueryGetCountRequest.typeUrl;
  },
  encode(
    _: QueryGetCountRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetCountRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetCountRequest();
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
  fromJSON(_: any): QueryGetCountRequest {
    return {};
  },
  toJSON(_: QueryGetCountRequest): JsonSafe<QueryGetCountRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryGetCountRequest>): QueryGetCountRequest {
    const message = createBaseQueryGetCountRequest();
    return message;
  },
  fromProtoMsg(message: QueryGetCountRequestProtoMsg): QueryGetCountRequest {
    return QueryGetCountRequest.decode(message.value);
  },
  toProto(message: QueryGetCountRequest): Uint8Array {
    return QueryGetCountRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryGetCountRequest): QueryGetCountRequestProtoMsg {
    return {
      typeUrl: '/cosmos.counter.v1.QueryGetCountRequest',
      value: QueryGetCountRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetCountResponse(): QueryGetCountResponse {
  return {
    totalCount: BigInt(0),
  };
}
/**
 * QueryGetCountResponse defines the response type for querying x/mock count.
 * @name QueryGetCountResponse
 * @package cosmos.counter.v1
 * @see proto type: cosmos.counter.v1.QueryGetCountResponse
 */
export const QueryGetCountResponse = {
  typeUrl: '/cosmos.counter.v1.QueryGetCountResponse' as const,
  aminoType: 'cosmos-sdk/QueryGetCountResponse' as const,
  is(o: any): o is QueryGetCountResponse {
    return (
      o &&
      (o.$typeUrl === QueryGetCountResponse.typeUrl ||
        typeof o.totalCount === 'bigint')
    );
  },
  isSDK(o: any): o is QueryGetCountResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryGetCountResponse.typeUrl ||
        typeof o.total_count === 'bigint')
    );
  },
  encode(
    message: QueryGetCountResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.totalCount !== BigInt(0)) {
      writer.uint32(8).int64(message.totalCount);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetCountResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetCountResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.totalCount = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetCountResponse {
    return {
      totalCount: isSet(object.totalCount)
        ? BigInt(object.totalCount.toString())
        : BigInt(0),
    };
  },
  toJSON(message: QueryGetCountResponse): JsonSafe<QueryGetCountResponse> {
    const obj: any = {};
    message.totalCount !== undefined &&
      (obj.totalCount = (message.totalCount || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<QueryGetCountResponse>): QueryGetCountResponse {
    const message = createBaseQueryGetCountResponse();
    message.totalCount =
      object.totalCount !== undefined && object.totalCount !== null
        ? BigInt(object.totalCount.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: QueryGetCountResponseProtoMsg): QueryGetCountResponse {
    return QueryGetCountResponse.decode(message.value);
  },
  toProto(message: QueryGetCountResponse): Uint8Array {
    return QueryGetCountResponse.encode(message).finish();
  },
  toProtoMsg(message: QueryGetCountResponse): QueryGetCountResponseProtoMsg {
    return {
      typeUrl: '/cosmos.counter.v1.QueryGetCountResponse',
      value: QueryGetCountResponse.encode(message).finish(),
    };
  },
};
