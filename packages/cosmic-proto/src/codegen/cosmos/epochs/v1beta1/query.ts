//@ts-nocheck
import { EpochInfo, type EpochInfoSDKType } from './genesis.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
import { isSet } from '../../../helpers.js';
/**
 * QueryEpochInfosRequest defines the gRPC request structure for
 * querying all epoch info.
 * @name QueryEpochInfosRequest
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.QueryEpochInfosRequest
 */
export interface QueryEpochInfosRequest {}
export interface QueryEpochInfosRequestProtoMsg {
  typeUrl: '/cosmos.epochs.v1beta1.QueryEpochInfosRequest';
  value: Uint8Array;
}
/**
 * QueryEpochInfosRequest defines the gRPC request structure for
 * querying all epoch info.
 * @name QueryEpochInfosRequestSDKType
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.QueryEpochInfosRequest
 */
export interface QueryEpochInfosRequestSDKType {}
/**
 * QueryEpochInfosRequest defines the gRPC response structure for
 * querying all epoch info.
 * @name QueryEpochInfosResponse
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.QueryEpochInfosResponse
 */
export interface QueryEpochInfosResponse {
  epochs: EpochInfo[];
}
export interface QueryEpochInfosResponseProtoMsg {
  typeUrl: '/cosmos.epochs.v1beta1.QueryEpochInfosResponse';
  value: Uint8Array;
}
/**
 * QueryEpochInfosRequest defines the gRPC response structure for
 * querying all epoch info.
 * @name QueryEpochInfosResponseSDKType
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.QueryEpochInfosResponse
 */
export interface QueryEpochInfosResponseSDKType {
  epochs: EpochInfoSDKType[];
}
/**
 * QueryCurrentEpochRequest defines the gRPC request structure for
 * querying an epoch by its identifier.
 * @name QueryCurrentEpochRequest
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.QueryCurrentEpochRequest
 */
export interface QueryCurrentEpochRequest {
  identifier: string;
}
export interface QueryCurrentEpochRequestProtoMsg {
  typeUrl: '/cosmos.epochs.v1beta1.QueryCurrentEpochRequest';
  value: Uint8Array;
}
/**
 * QueryCurrentEpochRequest defines the gRPC request structure for
 * querying an epoch by its identifier.
 * @name QueryCurrentEpochRequestSDKType
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.QueryCurrentEpochRequest
 */
export interface QueryCurrentEpochRequestSDKType {
  identifier: string;
}
/**
 * QueryCurrentEpochResponse defines the gRPC response structure for
 * querying an epoch by its identifier.
 * @name QueryCurrentEpochResponse
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.QueryCurrentEpochResponse
 */
export interface QueryCurrentEpochResponse {
  currentEpoch: bigint;
}
export interface QueryCurrentEpochResponseProtoMsg {
  typeUrl: '/cosmos.epochs.v1beta1.QueryCurrentEpochResponse';
  value: Uint8Array;
}
/**
 * QueryCurrentEpochResponse defines the gRPC response structure for
 * querying an epoch by its identifier.
 * @name QueryCurrentEpochResponseSDKType
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.QueryCurrentEpochResponse
 */
export interface QueryCurrentEpochResponseSDKType {
  current_epoch: bigint;
}
function createBaseQueryEpochInfosRequest(): QueryEpochInfosRequest {
  return {};
}
/**
 * QueryEpochInfosRequest defines the gRPC request structure for
 * querying all epoch info.
 * @name QueryEpochInfosRequest
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.QueryEpochInfosRequest
 */
export const QueryEpochInfosRequest = {
  typeUrl: '/cosmos.epochs.v1beta1.QueryEpochInfosRequest' as const,
  aminoType: 'cosmos-sdk/QueryEpochInfosRequest' as const,
  is(o: any): o is QueryEpochInfosRequest {
    return o && o.$typeUrl === QueryEpochInfosRequest.typeUrl;
  },
  isSDK(o: any): o is QueryEpochInfosRequestSDKType {
    return o && o.$typeUrl === QueryEpochInfosRequest.typeUrl;
  },
  encode(
    _: QueryEpochInfosRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryEpochInfosRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryEpochInfosRequest();
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
  fromJSON(_: any): QueryEpochInfosRequest {
    return {};
  },
  toJSON(_: QueryEpochInfosRequest): JsonSafe<QueryEpochInfosRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(_: Partial<QueryEpochInfosRequest>): QueryEpochInfosRequest {
    const message = createBaseQueryEpochInfosRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryEpochInfosRequestProtoMsg,
  ): QueryEpochInfosRequest {
    return QueryEpochInfosRequest.decode(message.value);
  },
  toProto(message: QueryEpochInfosRequest): Uint8Array {
    return QueryEpochInfosRequest.encode(message).finish();
  },
  toProtoMsg(message: QueryEpochInfosRequest): QueryEpochInfosRequestProtoMsg {
    return {
      typeUrl: '/cosmos.epochs.v1beta1.QueryEpochInfosRequest',
      value: QueryEpochInfosRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryEpochInfosResponse(): QueryEpochInfosResponse {
  return {
    epochs: [],
  };
}
/**
 * QueryEpochInfosRequest defines the gRPC response structure for
 * querying all epoch info.
 * @name QueryEpochInfosResponse
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.QueryEpochInfosResponse
 */
export const QueryEpochInfosResponse = {
  typeUrl: '/cosmos.epochs.v1beta1.QueryEpochInfosResponse' as const,
  aminoType: 'cosmos-sdk/QueryEpochInfosResponse' as const,
  is(o: any): o is QueryEpochInfosResponse {
    return (
      o &&
      (o.$typeUrl === QueryEpochInfosResponse.typeUrl ||
        (Array.isArray(o.epochs) &&
          (!o.epochs.length || EpochInfo.is(o.epochs[0]))))
    );
  },
  isSDK(o: any): o is QueryEpochInfosResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryEpochInfosResponse.typeUrl ||
        (Array.isArray(o.epochs) &&
          (!o.epochs.length || EpochInfo.isSDK(o.epochs[0]))))
    );
  },
  encode(
    message: QueryEpochInfosResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.epochs) {
      EpochInfo.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryEpochInfosResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryEpochInfosResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.epochs.push(EpochInfo.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryEpochInfosResponse {
    return {
      epochs: Array.isArray(object?.epochs)
        ? object.epochs.map((e: any) => EpochInfo.fromJSON(e))
        : [],
    };
  },
  toJSON(message: QueryEpochInfosResponse): JsonSafe<QueryEpochInfosResponse> {
    const obj: any = {};
    if (message.epochs) {
      obj.epochs = message.epochs.map(e =>
        e ? EpochInfo.toJSON(e) : undefined,
      );
    } else {
      obj.epochs = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryEpochInfosResponse>,
  ): QueryEpochInfosResponse {
    const message = createBaseQueryEpochInfosResponse();
    message.epochs = object.epochs?.map(e => EpochInfo.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryEpochInfosResponseProtoMsg,
  ): QueryEpochInfosResponse {
    return QueryEpochInfosResponse.decode(message.value);
  },
  toProto(message: QueryEpochInfosResponse): Uint8Array {
    return QueryEpochInfosResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryEpochInfosResponse,
  ): QueryEpochInfosResponseProtoMsg {
    return {
      typeUrl: '/cosmos.epochs.v1beta1.QueryEpochInfosResponse',
      value: QueryEpochInfosResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryCurrentEpochRequest(): QueryCurrentEpochRequest {
  return {
    identifier: '',
  };
}
/**
 * QueryCurrentEpochRequest defines the gRPC request structure for
 * querying an epoch by its identifier.
 * @name QueryCurrentEpochRequest
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.QueryCurrentEpochRequest
 */
export const QueryCurrentEpochRequest = {
  typeUrl: '/cosmos.epochs.v1beta1.QueryCurrentEpochRequest' as const,
  aminoType: 'cosmos-sdk/QueryCurrentEpochRequest' as const,
  is(o: any): o is QueryCurrentEpochRequest {
    return (
      o &&
      (o.$typeUrl === QueryCurrentEpochRequest.typeUrl ||
        typeof o.identifier === 'string')
    );
  },
  isSDK(o: any): o is QueryCurrentEpochRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryCurrentEpochRequest.typeUrl ||
        typeof o.identifier === 'string')
    );
  },
  encode(
    message: QueryCurrentEpochRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.identifier !== '') {
      writer.uint32(10).string(message.identifier);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryCurrentEpochRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCurrentEpochRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.identifier = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryCurrentEpochRequest {
    return {
      identifier: isSet(object.identifier) ? String(object.identifier) : '',
    };
  },
  toJSON(
    message: QueryCurrentEpochRequest,
  ): JsonSafe<QueryCurrentEpochRequest> {
    const obj: any = {};
    message.identifier !== undefined && (obj.identifier = message.identifier);
    return obj;
  },
  fromPartial(
    object: Partial<QueryCurrentEpochRequest>,
  ): QueryCurrentEpochRequest {
    const message = createBaseQueryCurrentEpochRequest();
    message.identifier = object.identifier ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryCurrentEpochRequestProtoMsg,
  ): QueryCurrentEpochRequest {
    return QueryCurrentEpochRequest.decode(message.value);
  },
  toProto(message: QueryCurrentEpochRequest): Uint8Array {
    return QueryCurrentEpochRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryCurrentEpochRequest,
  ): QueryCurrentEpochRequestProtoMsg {
    return {
      typeUrl: '/cosmos.epochs.v1beta1.QueryCurrentEpochRequest',
      value: QueryCurrentEpochRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryCurrentEpochResponse(): QueryCurrentEpochResponse {
  return {
    currentEpoch: BigInt(0),
  };
}
/**
 * QueryCurrentEpochResponse defines the gRPC response structure for
 * querying an epoch by its identifier.
 * @name QueryCurrentEpochResponse
 * @package cosmos.epochs.v1beta1
 * @see proto type: cosmos.epochs.v1beta1.QueryCurrentEpochResponse
 */
export const QueryCurrentEpochResponse = {
  typeUrl: '/cosmos.epochs.v1beta1.QueryCurrentEpochResponse' as const,
  aminoType: 'cosmos-sdk/QueryCurrentEpochResponse' as const,
  is(o: any): o is QueryCurrentEpochResponse {
    return (
      o &&
      (o.$typeUrl === QueryCurrentEpochResponse.typeUrl ||
        typeof o.currentEpoch === 'bigint')
    );
  },
  isSDK(o: any): o is QueryCurrentEpochResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryCurrentEpochResponse.typeUrl ||
        typeof o.current_epoch === 'bigint')
    );
  },
  encode(
    message: QueryCurrentEpochResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.currentEpoch !== BigInt(0)) {
      writer.uint32(8).int64(message.currentEpoch);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryCurrentEpochResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCurrentEpochResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.currentEpoch = reader.int64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryCurrentEpochResponse {
    return {
      currentEpoch: isSet(object.currentEpoch)
        ? BigInt(object.currentEpoch.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: QueryCurrentEpochResponse,
  ): JsonSafe<QueryCurrentEpochResponse> {
    const obj: any = {};
    message.currentEpoch !== undefined &&
      (obj.currentEpoch = (message.currentEpoch || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<QueryCurrentEpochResponse>,
  ): QueryCurrentEpochResponse {
    const message = createBaseQueryCurrentEpochResponse();
    message.currentEpoch =
      object.currentEpoch !== undefined && object.currentEpoch !== null
        ? BigInt(object.currentEpoch.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: QueryCurrentEpochResponseProtoMsg,
  ): QueryCurrentEpochResponse {
    return QueryCurrentEpochResponse.decode(message.value);
  },
  toProto(message: QueryCurrentEpochResponse): Uint8Array {
    return QueryCurrentEpochResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryCurrentEpochResponse,
  ): QueryCurrentEpochResponseProtoMsg {
    return {
      typeUrl: '/cosmos.epochs.v1beta1.QueryCurrentEpochResponse',
      value: QueryCurrentEpochResponse.encode(message).finish(),
    };
  },
};
