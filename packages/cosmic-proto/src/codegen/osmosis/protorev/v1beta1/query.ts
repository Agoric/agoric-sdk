//@ts-nocheck
import { Params, ParamsSDKType } from './params.js';
import { Coin, CoinSDKType } from '../../../cosmos/base/v1beta1/coin.js';
import {
  PoolStatistics,
  PoolStatisticsSDKType,
  TokenPairArbRoutes,
  TokenPairArbRoutesSDKType,
} from './protorev.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { JsonSafe } from '../../../json-safe.js';
import { isSet } from '../../../helpers.js';
/** QueryParamsRequest is request type for the Query/Params RPC method. */
export interface QueryParamsRequest {}
export interface QueryParamsRequestProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryParamsRequest';
  value: Uint8Array;
}
/** QueryParamsRequest is request type for the Query/Params RPC method. */
export interface QueryParamsRequestSDKType {}
/** QueryParamsResponse is response type for the Query/Params RPC method. */
export interface QueryParamsResponse {
  /** params holds all the parameters of this module. */
  params: Params;
}
export interface QueryParamsResponseProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryParamsResponse';
  value: Uint8Array;
}
/** QueryParamsResponse is response type for the Query/Params RPC method. */
export interface QueryParamsResponseSDKType {
  params: ParamsSDKType;
}
/**
 * QueryGetProtoRevNumberOfTradesRequest is request type for the
 * Query/GetProtoRevNumberOfTrades RPC method.
 */
export interface QueryGetProtoRevNumberOfTradesRequest {}
export interface QueryGetProtoRevNumberOfTradesRequestProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevNumberOfTradesRequest';
  value: Uint8Array;
}
/**
 * QueryGetProtoRevNumberOfTradesRequest is request type for the
 * Query/GetProtoRevNumberOfTrades RPC method.
 */
export interface QueryGetProtoRevNumberOfTradesRequestSDKType {}
/**
 * QueryGetProtoRevNumberOfTradesResponse is response type for the
 * Query/GetProtoRevNumberOfTrades RPC method.
 */
export interface QueryGetProtoRevNumberOfTradesResponse {
  /** number_of_trades is the number of trades the module has executed */
  numberOfTrades: string;
}
export interface QueryGetProtoRevNumberOfTradesResponseProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevNumberOfTradesResponse';
  value: Uint8Array;
}
/**
 * QueryGetProtoRevNumberOfTradesResponse is response type for the
 * Query/GetProtoRevNumberOfTrades RPC method.
 */
export interface QueryGetProtoRevNumberOfTradesResponseSDKType {
  number_of_trades: string;
}
/**
 * QueryGetProtoRevProfitsByDenomRequest is request type for the
 * Query/GetProtoRevProfitsByDenom RPC method.
 */
export interface QueryGetProtoRevProfitsByDenomRequest {
  /** denom is the denom to query profits by */
  denom: string;
}
export interface QueryGetProtoRevProfitsByDenomRequestProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevProfitsByDenomRequest';
  value: Uint8Array;
}
/**
 * QueryGetProtoRevProfitsByDenomRequest is request type for the
 * Query/GetProtoRevProfitsByDenom RPC method.
 */
export interface QueryGetProtoRevProfitsByDenomRequestSDKType {
  denom: string;
}
/**
 * QueryGetProtoRevProfitsByDenomResponse is response type for the
 * Query/GetProtoRevProfitsByDenom RPC method.
 */
export interface QueryGetProtoRevProfitsByDenomResponse {
  /** profit is the profits of the module by the selected denom */
  profit?: Coin;
}
export interface QueryGetProtoRevProfitsByDenomResponseProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevProfitsByDenomResponse';
  value: Uint8Array;
}
/**
 * QueryGetProtoRevProfitsByDenomResponse is response type for the
 * Query/GetProtoRevProfitsByDenom RPC method.
 */
export interface QueryGetProtoRevProfitsByDenomResponseSDKType {
  profit?: CoinSDKType;
}
/**
 * QueryGetProtoRevAllProfitsRequest is request type for the
 * Query/GetProtoRevAllProfits RPC method.
 */
export interface QueryGetProtoRevAllProfitsRequest {}
export interface QueryGetProtoRevAllProfitsRequestProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevAllProfitsRequest';
  value: Uint8Array;
}
/**
 * QueryGetProtoRevAllProfitsRequest is request type for the
 * Query/GetProtoRevAllProfits RPC method.
 */
export interface QueryGetProtoRevAllProfitsRequestSDKType {}
/**
 * QueryGetProtoRevAllProfitsResponse is response type for the
 * Query/GetProtoRevAllProfits RPC method.
 */
export interface QueryGetProtoRevAllProfitsResponse {
  /** profits is a list of all of the profits from the module */
  profits: Coin[];
}
export interface QueryGetProtoRevAllProfitsResponseProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevAllProfitsResponse';
  value: Uint8Array;
}
/**
 * QueryGetProtoRevAllProfitsResponse is response type for the
 * Query/GetProtoRevAllProfits RPC method.
 */
export interface QueryGetProtoRevAllProfitsResponseSDKType {
  profits: CoinSDKType[];
}
/**
 * QueryGetProtoRevStatisticsByPoolRequest is request type for the
 * Query/GetProtoRevStatisticsByPool RPC method.
 */
export interface QueryGetProtoRevStatisticsByPoolRequest {
  /** pool_id is the pool id to query statistics by */
  poolId: bigint;
}
export interface QueryGetProtoRevStatisticsByPoolRequestProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevStatisticsByPoolRequest';
  value: Uint8Array;
}
/**
 * QueryGetProtoRevStatisticsByPoolRequest is request type for the
 * Query/GetProtoRevStatisticsByPool RPC method.
 */
export interface QueryGetProtoRevStatisticsByPoolRequestSDKType {
  pool_id: bigint;
}
/**
 * QueryGetProtoRevStatisticsByPoolResponse is response type for the
 * Query/GetProtoRevStatisticsByPool RPC method.
 */
export interface QueryGetProtoRevStatisticsByPoolResponse {
  /**
   * statistics contains the number of trades the module has executed after a
   * swap on a given pool and the profits from the trades
   */
  statistics?: PoolStatistics;
}
export interface QueryGetProtoRevStatisticsByPoolResponseProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevStatisticsByPoolResponse';
  value: Uint8Array;
}
/**
 * QueryGetProtoRevStatisticsByPoolResponse is response type for the
 * Query/GetProtoRevStatisticsByPool RPC method.
 */
export interface QueryGetProtoRevStatisticsByPoolResponseSDKType {
  statistics?: PoolStatisticsSDKType;
}
/**
 * QueryGetProtoRevAllStatisticsRequest is request type for the
 * Query/GetProtoRevAllStatistics RPC method.
 */
export interface QueryGetProtoRevAllStatisticsRequest {}
export interface QueryGetProtoRevAllStatisticsRequestProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevAllStatisticsRequest';
  value: Uint8Array;
}
/**
 * QueryGetProtoRevAllStatisticsRequest is request type for the
 * Query/GetProtoRevAllStatistics RPC method.
 */
export interface QueryGetProtoRevAllStatisticsRequestSDKType {}
/**
 * QueryGetProtoRevAllStatisticsResponse is response type for the
 * Query/GetProtoRevAllStatistics RPC method.
 */
export interface QueryGetProtoRevAllStatisticsResponse {
  /**
   * statistics contains the number of trades the module has executed after a
   * swap on a given pool and the profits from the trades for all pools
   */
  statistics: PoolStatistics[];
}
export interface QueryGetProtoRevAllStatisticsResponseProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevAllStatisticsResponse';
  value: Uint8Array;
}
/**
 * QueryGetProtoRevAllStatisticsResponse is response type for the
 * Query/GetProtoRevAllStatistics RPC method.
 */
export interface QueryGetProtoRevAllStatisticsResponseSDKType {
  statistics: PoolStatisticsSDKType[];
}
/**
 * QueryGetProtoRevTokenPairArbRoutesRequest is request type for the
 * Query/GetProtoRevTokenPairArbRoutes RPC method.
 */
export interface QueryGetProtoRevTokenPairArbRoutesRequest {}
export interface QueryGetProtoRevTokenPairArbRoutesRequestProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevTokenPairArbRoutesRequest';
  value: Uint8Array;
}
/**
 * QueryGetProtoRevTokenPairArbRoutesRequest is request type for the
 * Query/GetProtoRevTokenPairArbRoutes RPC method.
 */
export interface QueryGetProtoRevTokenPairArbRoutesRequestSDKType {}
/**
 * QueryGetProtoRevTokenPairArbRoutesResponse is response type for the
 * Query/GetProtoRevTokenPairArbRoutes RPC method.
 */
export interface QueryGetProtoRevTokenPairArbRoutesResponse {
  /**
   * routes is a list of all of the hot routes that the module is currently
   * arbitraging
   */
  routes: TokenPairArbRoutes[];
}
export interface QueryGetProtoRevTokenPairArbRoutesResponseProtoMsg {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevTokenPairArbRoutesResponse';
  value: Uint8Array;
}
/**
 * QueryGetProtoRevTokenPairArbRoutesResponse is response type for the
 * Query/GetProtoRevTokenPairArbRoutes RPC method.
 */
export interface QueryGetProtoRevTokenPairArbRoutesResponseSDKType {
  routes: TokenPairArbRoutesSDKType[];
}
function createBaseQueryParamsRequest(): QueryParamsRequest {
  return {};
}
export const QueryParamsRequest = {
  typeUrl: '/osmosis.protorev.v1beta1.QueryParamsRequest',
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
      typeUrl: '/osmosis.protorev.v1beta1.QueryParamsRequest',
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
  typeUrl: '/osmosis.protorev.v1beta1.QueryParamsResponse',
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
      typeUrl: '/osmosis.protorev.v1beta1.QueryParamsResponse',
      value: QueryParamsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetProtoRevNumberOfTradesRequest(): QueryGetProtoRevNumberOfTradesRequest {
  return {};
}
export const QueryGetProtoRevNumberOfTradesRequest = {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevNumberOfTradesRequest',
  encode(
    _: QueryGetProtoRevNumberOfTradesRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetProtoRevNumberOfTradesRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetProtoRevNumberOfTradesRequest();
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
  fromJSON(_: any): QueryGetProtoRevNumberOfTradesRequest {
    return {};
  },
  toJSON(
    _: QueryGetProtoRevNumberOfTradesRequest,
  ): JsonSafe<QueryGetProtoRevNumberOfTradesRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryGetProtoRevNumberOfTradesRequest>,
  ): QueryGetProtoRevNumberOfTradesRequest {
    const message = createBaseQueryGetProtoRevNumberOfTradesRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryGetProtoRevNumberOfTradesRequestProtoMsg,
  ): QueryGetProtoRevNumberOfTradesRequest {
    return QueryGetProtoRevNumberOfTradesRequest.decode(message.value);
  },
  toProto(message: QueryGetProtoRevNumberOfTradesRequest): Uint8Array {
    return QueryGetProtoRevNumberOfTradesRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetProtoRevNumberOfTradesRequest,
  ): QueryGetProtoRevNumberOfTradesRequestProtoMsg {
    return {
      typeUrl:
        '/osmosis.protorev.v1beta1.QueryGetProtoRevNumberOfTradesRequest',
      value: QueryGetProtoRevNumberOfTradesRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetProtoRevNumberOfTradesResponse(): QueryGetProtoRevNumberOfTradesResponse {
  return {
    numberOfTrades: '',
  };
}
export const QueryGetProtoRevNumberOfTradesResponse = {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevNumberOfTradesResponse',
  encode(
    message: QueryGetProtoRevNumberOfTradesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.numberOfTrades !== '') {
      writer.uint32(10).string(message.numberOfTrades);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetProtoRevNumberOfTradesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetProtoRevNumberOfTradesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.numberOfTrades = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetProtoRevNumberOfTradesResponse {
    return {
      numberOfTrades: isSet(object.numberOfTrades)
        ? String(object.numberOfTrades)
        : '',
    };
  },
  toJSON(
    message: QueryGetProtoRevNumberOfTradesResponse,
  ): JsonSafe<QueryGetProtoRevNumberOfTradesResponse> {
    const obj: any = {};
    message.numberOfTrades !== undefined &&
      (obj.numberOfTrades = message.numberOfTrades);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetProtoRevNumberOfTradesResponse>,
  ): QueryGetProtoRevNumberOfTradesResponse {
    const message = createBaseQueryGetProtoRevNumberOfTradesResponse();
    message.numberOfTrades = object.numberOfTrades ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryGetProtoRevNumberOfTradesResponseProtoMsg,
  ): QueryGetProtoRevNumberOfTradesResponse {
    return QueryGetProtoRevNumberOfTradesResponse.decode(message.value);
  },
  toProto(message: QueryGetProtoRevNumberOfTradesResponse): Uint8Array {
    return QueryGetProtoRevNumberOfTradesResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetProtoRevNumberOfTradesResponse,
  ): QueryGetProtoRevNumberOfTradesResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.protorev.v1beta1.QueryGetProtoRevNumberOfTradesResponse',
      value: QueryGetProtoRevNumberOfTradesResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetProtoRevProfitsByDenomRequest(): QueryGetProtoRevProfitsByDenomRequest {
  return {
    denom: '',
  };
}
export const QueryGetProtoRevProfitsByDenomRequest = {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevProfitsByDenomRequest',
  encode(
    message: QueryGetProtoRevProfitsByDenomRequest,
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
  ): QueryGetProtoRevProfitsByDenomRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetProtoRevProfitsByDenomRequest();
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
  fromJSON(object: any): QueryGetProtoRevProfitsByDenomRequest {
    return {
      denom: isSet(object.denom) ? String(object.denom) : '',
    };
  },
  toJSON(
    message: QueryGetProtoRevProfitsByDenomRequest,
  ): JsonSafe<QueryGetProtoRevProfitsByDenomRequest> {
    const obj: any = {};
    message.denom !== undefined && (obj.denom = message.denom);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetProtoRevProfitsByDenomRequest>,
  ): QueryGetProtoRevProfitsByDenomRequest {
    const message = createBaseQueryGetProtoRevProfitsByDenomRequest();
    message.denom = object.denom ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryGetProtoRevProfitsByDenomRequestProtoMsg,
  ): QueryGetProtoRevProfitsByDenomRequest {
    return QueryGetProtoRevProfitsByDenomRequest.decode(message.value);
  },
  toProto(message: QueryGetProtoRevProfitsByDenomRequest): Uint8Array {
    return QueryGetProtoRevProfitsByDenomRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetProtoRevProfitsByDenomRequest,
  ): QueryGetProtoRevProfitsByDenomRequestProtoMsg {
    return {
      typeUrl:
        '/osmosis.protorev.v1beta1.QueryGetProtoRevProfitsByDenomRequest',
      value: QueryGetProtoRevProfitsByDenomRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetProtoRevProfitsByDenomResponse(): QueryGetProtoRevProfitsByDenomResponse {
  return {
    profit: undefined,
  };
}
export const QueryGetProtoRevProfitsByDenomResponse = {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevProfitsByDenomResponse',
  encode(
    message: QueryGetProtoRevProfitsByDenomResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.profit !== undefined) {
      Coin.encode(message.profit, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetProtoRevProfitsByDenomResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetProtoRevProfitsByDenomResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.profit = Coin.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetProtoRevProfitsByDenomResponse {
    return {
      profit: isSet(object.profit) ? Coin.fromJSON(object.profit) : undefined,
    };
  },
  toJSON(
    message: QueryGetProtoRevProfitsByDenomResponse,
  ): JsonSafe<QueryGetProtoRevProfitsByDenomResponse> {
    const obj: any = {};
    message.profit !== undefined &&
      (obj.profit = message.profit ? Coin.toJSON(message.profit) : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetProtoRevProfitsByDenomResponse>,
  ): QueryGetProtoRevProfitsByDenomResponse {
    const message = createBaseQueryGetProtoRevProfitsByDenomResponse();
    message.profit =
      object.profit !== undefined && object.profit !== null
        ? Coin.fromPartial(object.profit)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGetProtoRevProfitsByDenomResponseProtoMsg,
  ): QueryGetProtoRevProfitsByDenomResponse {
    return QueryGetProtoRevProfitsByDenomResponse.decode(message.value);
  },
  toProto(message: QueryGetProtoRevProfitsByDenomResponse): Uint8Array {
    return QueryGetProtoRevProfitsByDenomResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetProtoRevProfitsByDenomResponse,
  ): QueryGetProtoRevProfitsByDenomResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.protorev.v1beta1.QueryGetProtoRevProfitsByDenomResponse',
      value: QueryGetProtoRevProfitsByDenomResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetProtoRevAllProfitsRequest(): QueryGetProtoRevAllProfitsRequest {
  return {};
}
export const QueryGetProtoRevAllProfitsRequest = {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevAllProfitsRequest',
  encode(
    _: QueryGetProtoRevAllProfitsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetProtoRevAllProfitsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetProtoRevAllProfitsRequest();
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
  fromJSON(_: any): QueryGetProtoRevAllProfitsRequest {
    return {};
  },
  toJSON(
    _: QueryGetProtoRevAllProfitsRequest,
  ): JsonSafe<QueryGetProtoRevAllProfitsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryGetProtoRevAllProfitsRequest>,
  ): QueryGetProtoRevAllProfitsRequest {
    const message = createBaseQueryGetProtoRevAllProfitsRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryGetProtoRevAllProfitsRequestProtoMsg,
  ): QueryGetProtoRevAllProfitsRequest {
    return QueryGetProtoRevAllProfitsRequest.decode(message.value);
  },
  toProto(message: QueryGetProtoRevAllProfitsRequest): Uint8Array {
    return QueryGetProtoRevAllProfitsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetProtoRevAllProfitsRequest,
  ): QueryGetProtoRevAllProfitsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevAllProfitsRequest',
      value: QueryGetProtoRevAllProfitsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetProtoRevAllProfitsResponse(): QueryGetProtoRevAllProfitsResponse {
  return {
    profits: [],
  };
}
export const QueryGetProtoRevAllProfitsResponse = {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevAllProfitsResponse',
  encode(
    message: QueryGetProtoRevAllProfitsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.profits) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetProtoRevAllProfitsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetProtoRevAllProfitsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.profits.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetProtoRevAllProfitsResponse {
    return {
      profits: Array.isArray(object?.profits)
        ? object.profits.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryGetProtoRevAllProfitsResponse,
  ): JsonSafe<QueryGetProtoRevAllProfitsResponse> {
    const obj: any = {};
    if (message.profits) {
      obj.profits = message.profits.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.profits = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetProtoRevAllProfitsResponse>,
  ): QueryGetProtoRevAllProfitsResponse {
    const message = createBaseQueryGetProtoRevAllProfitsResponse();
    message.profits = object.profits?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryGetProtoRevAllProfitsResponseProtoMsg,
  ): QueryGetProtoRevAllProfitsResponse {
    return QueryGetProtoRevAllProfitsResponse.decode(message.value);
  },
  toProto(message: QueryGetProtoRevAllProfitsResponse): Uint8Array {
    return QueryGetProtoRevAllProfitsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetProtoRevAllProfitsResponse,
  ): QueryGetProtoRevAllProfitsResponseProtoMsg {
    return {
      typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevAllProfitsResponse',
      value: QueryGetProtoRevAllProfitsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetProtoRevStatisticsByPoolRequest(): QueryGetProtoRevStatisticsByPoolRequest {
  return {
    poolId: BigInt(0),
  };
}
export const QueryGetProtoRevStatisticsByPoolRequest = {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevStatisticsByPoolRequest',
  encode(
    message: QueryGetProtoRevStatisticsByPoolRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.poolId !== BigInt(0)) {
      writer.uint32(8).uint64(message.poolId);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetProtoRevStatisticsByPoolRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetProtoRevStatisticsByPoolRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.poolId = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetProtoRevStatisticsByPoolRequest {
    return {
      poolId: isSet(object.poolId)
        ? BigInt(object.poolId.toString())
        : BigInt(0),
    };
  },
  toJSON(
    message: QueryGetProtoRevStatisticsByPoolRequest,
  ): JsonSafe<QueryGetProtoRevStatisticsByPoolRequest> {
    const obj: any = {};
    message.poolId !== undefined &&
      (obj.poolId = (message.poolId || BigInt(0)).toString());
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetProtoRevStatisticsByPoolRequest>,
  ): QueryGetProtoRevStatisticsByPoolRequest {
    const message = createBaseQueryGetProtoRevStatisticsByPoolRequest();
    message.poolId =
      object.poolId !== undefined && object.poolId !== null
        ? BigInt(object.poolId.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(
    message: QueryGetProtoRevStatisticsByPoolRequestProtoMsg,
  ): QueryGetProtoRevStatisticsByPoolRequest {
    return QueryGetProtoRevStatisticsByPoolRequest.decode(message.value);
  },
  toProto(message: QueryGetProtoRevStatisticsByPoolRequest): Uint8Array {
    return QueryGetProtoRevStatisticsByPoolRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetProtoRevStatisticsByPoolRequest,
  ): QueryGetProtoRevStatisticsByPoolRequestProtoMsg {
    return {
      typeUrl:
        '/osmosis.protorev.v1beta1.QueryGetProtoRevStatisticsByPoolRequest',
      value: QueryGetProtoRevStatisticsByPoolRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetProtoRevStatisticsByPoolResponse(): QueryGetProtoRevStatisticsByPoolResponse {
  return {
    statistics: undefined,
  };
}
export const QueryGetProtoRevStatisticsByPoolResponse = {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevStatisticsByPoolResponse',
  encode(
    message: QueryGetProtoRevStatisticsByPoolResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.statistics !== undefined) {
      PoolStatistics.encode(
        message.statistics,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetProtoRevStatisticsByPoolResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetProtoRevStatisticsByPoolResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.statistics = PoolStatistics.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetProtoRevStatisticsByPoolResponse {
    return {
      statistics: isSet(object.statistics)
        ? PoolStatistics.fromJSON(object.statistics)
        : undefined,
    };
  },
  toJSON(
    message: QueryGetProtoRevStatisticsByPoolResponse,
  ): JsonSafe<QueryGetProtoRevStatisticsByPoolResponse> {
    const obj: any = {};
    message.statistics !== undefined &&
      (obj.statistics = message.statistics
        ? PoolStatistics.toJSON(message.statistics)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetProtoRevStatisticsByPoolResponse>,
  ): QueryGetProtoRevStatisticsByPoolResponse {
    const message = createBaseQueryGetProtoRevStatisticsByPoolResponse();
    message.statistics =
      object.statistics !== undefined && object.statistics !== null
        ? PoolStatistics.fromPartial(object.statistics)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryGetProtoRevStatisticsByPoolResponseProtoMsg,
  ): QueryGetProtoRevStatisticsByPoolResponse {
    return QueryGetProtoRevStatisticsByPoolResponse.decode(message.value);
  },
  toProto(message: QueryGetProtoRevStatisticsByPoolResponse): Uint8Array {
    return QueryGetProtoRevStatisticsByPoolResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetProtoRevStatisticsByPoolResponse,
  ): QueryGetProtoRevStatisticsByPoolResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.protorev.v1beta1.QueryGetProtoRevStatisticsByPoolResponse',
      value: QueryGetProtoRevStatisticsByPoolResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetProtoRevAllStatisticsRequest(): QueryGetProtoRevAllStatisticsRequest {
  return {};
}
export const QueryGetProtoRevAllStatisticsRequest = {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevAllStatisticsRequest',
  encode(
    _: QueryGetProtoRevAllStatisticsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetProtoRevAllStatisticsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetProtoRevAllStatisticsRequest();
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
  fromJSON(_: any): QueryGetProtoRevAllStatisticsRequest {
    return {};
  },
  toJSON(
    _: QueryGetProtoRevAllStatisticsRequest,
  ): JsonSafe<QueryGetProtoRevAllStatisticsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryGetProtoRevAllStatisticsRequest>,
  ): QueryGetProtoRevAllStatisticsRequest {
    const message = createBaseQueryGetProtoRevAllStatisticsRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryGetProtoRevAllStatisticsRequestProtoMsg,
  ): QueryGetProtoRevAllStatisticsRequest {
    return QueryGetProtoRevAllStatisticsRequest.decode(message.value);
  },
  toProto(message: QueryGetProtoRevAllStatisticsRequest): Uint8Array {
    return QueryGetProtoRevAllStatisticsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetProtoRevAllStatisticsRequest,
  ): QueryGetProtoRevAllStatisticsRequestProtoMsg {
    return {
      typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevAllStatisticsRequest',
      value: QueryGetProtoRevAllStatisticsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetProtoRevAllStatisticsResponse(): QueryGetProtoRevAllStatisticsResponse {
  return {
    statistics: [],
  };
}
export const QueryGetProtoRevAllStatisticsResponse = {
  typeUrl: '/osmosis.protorev.v1beta1.QueryGetProtoRevAllStatisticsResponse',
  encode(
    message: QueryGetProtoRevAllStatisticsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.statistics) {
      PoolStatistics.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetProtoRevAllStatisticsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetProtoRevAllStatisticsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.statistics.push(
            PoolStatistics.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetProtoRevAllStatisticsResponse {
    return {
      statistics: Array.isArray(object?.statistics)
        ? object.statistics.map((e: any) => PoolStatistics.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryGetProtoRevAllStatisticsResponse,
  ): JsonSafe<QueryGetProtoRevAllStatisticsResponse> {
    const obj: any = {};
    if (message.statistics) {
      obj.statistics = message.statistics.map(e =>
        e ? PoolStatistics.toJSON(e) : undefined,
      );
    } else {
      obj.statistics = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetProtoRevAllStatisticsResponse>,
  ): QueryGetProtoRevAllStatisticsResponse {
    const message = createBaseQueryGetProtoRevAllStatisticsResponse();
    message.statistics =
      object.statistics?.map(e => PoolStatistics.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryGetProtoRevAllStatisticsResponseProtoMsg,
  ): QueryGetProtoRevAllStatisticsResponse {
    return QueryGetProtoRevAllStatisticsResponse.decode(message.value);
  },
  toProto(message: QueryGetProtoRevAllStatisticsResponse): Uint8Array {
    return QueryGetProtoRevAllStatisticsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetProtoRevAllStatisticsResponse,
  ): QueryGetProtoRevAllStatisticsResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.protorev.v1beta1.QueryGetProtoRevAllStatisticsResponse',
      value: QueryGetProtoRevAllStatisticsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryGetProtoRevTokenPairArbRoutesRequest(): QueryGetProtoRevTokenPairArbRoutesRequest {
  return {};
}
export const QueryGetProtoRevTokenPairArbRoutesRequest = {
  typeUrl:
    '/osmosis.protorev.v1beta1.QueryGetProtoRevTokenPairArbRoutesRequest',
  encode(
    _: QueryGetProtoRevTokenPairArbRoutesRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetProtoRevTokenPairArbRoutesRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetProtoRevTokenPairArbRoutesRequest();
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
  fromJSON(_: any): QueryGetProtoRevTokenPairArbRoutesRequest {
    return {};
  },
  toJSON(
    _: QueryGetProtoRevTokenPairArbRoutesRequest,
  ): JsonSafe<QueryGetProtoRevTokenPairArbRoutesRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryGetProtoRevTokenPairArbRoutesRequest>,
  ): QueryGetProtoRevTokenPairArbRoutesRequest {
    const message = createBaseQueryGetProtoRevTokenPairArbRoutesRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryGetProtoRevTokenPairArbRoutesRequestProtoMsg,
  ): QueryGetProtoRevTokenPairArbRoutesRequest {
    return QueryGetProtoRevTokenPairArbRoutesRequest.decode(message.value);
  },
  toProto(message: QueryGetProtoRevTokenPairArbRoutesRequest): Uint8Array {
    return QueryGetProtoRevTokenPairArbRoutesRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetProtoRevTokenPairArbRoutesRequest,
  ): QueryGetProtoRevTokenPairArbRoutesRequestProtoMsg {
    return {
      typeUrl:
        '/osmosis.protorev.v1beta1.QueryGetProtoRevTokenPairArbRoutesRequest',
      value: QueryGetProtoRevTokenPairArbRoutesRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryGetProtoRevTokenPairArbRoutesResponse(): QueryGetProtoRevTokenPairArbRoutesResponse {
  return {
    routes: [],
  };
}
export const QueryGetProtoRevTokenPairArbRoutesResponse = {
  typeUrl:
    '/osmosis.protorev.v1beta1.QueryGetProtoRevTokenPairArbRoutesResponse',
  encode(
    message: QueryGetProtoRevTokenPairArbRoutesResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.routes) {
      TokenPairArbRoutes.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryGetProtoRevTokenPairArbRoutesResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryGetProtoRevTokenPairArbRoutesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.routes.push(
            TokenPairArbRoutes.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryGetProtoRevTokenPairArbRoutesResponse {
    return {
      routes: Array.isArray(object?.routes)
        ? object.routes.map((e: any) => TokenPairArbRoutes.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryGetProtoRevTokenPairArbRoutesResponse,
  ): JsonSafe<QueryGetProtoRevTokenPairArbRoutesResponse> {
    const obj: any = {};
    if (message.routes) {
      obj.routes = message.routes.map(e =>
        e ? TokenPairArbRoutes.toJSON(e) : undefined,
      );
    } else {
      obj.routes = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryGetProtoRevTokenPairArbRoutesResponse>,
  ): QueryGetProtoRevTokenPairArbRoutesResponse {
    const message = createBaseQueryGetProtoRevTokenPairArbRoutesResponse();
    message.routes =
      object.routes?.map(e => TokenPairArbRoutes.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryGetProtoRevTokenPairArbRoutesResponseProtoMsg,
  ): QueryGetProtoRevTokenPairArbRoutesResponse {
    return QueryGetProtoRevTokenPairArbRoutesResponse.decode(message.value);
  },
  toProto(message: QueryGetProtoRevTokenPairArbRoutesResponse): Uint8Array {
    return QueryGetProtoRevTokenPairArbRoutesResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryGetProtoRevTokenPairArbRoutesResponse,
  ): QueryGetProtoRevTokenPairArbRoutesResponseProtoMsg {
    return {
      typeUrl:
        '/osmosis.protorev.v1beta1.QueryGetProtoRevTokenPairArbRoutesResponse',
      value:
        QueryGetProtoRevTokenPairArbRoutesResponse.encode(message).finish(),
    };
  },
};
