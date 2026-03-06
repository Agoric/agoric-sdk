//@ts-nocheck
import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import {
  ContinuousFund,
  type ContinuousFundSDKType,
  Params,
  type ParamsSDKType,
} from './types.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
import { isSet } from '../../../helpers.js';
/**
 * QueryCommunityPoolRequest is the request type for the Query/CommunityPool RPC
 * method.
 * @name QueryCommunityPoolRequest
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryCommunityPoolRequest
 */
export interface QueryCommunityPoolRequest {}
export interface QueryCommunityPoolRequestProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.QueryCommunityPoolRequest';
  value: Uint8Array;
}
/**
 * QueryCommunityPoolRequest is the request type for the Query/CommunityPool RPC
 * method.
 * @name QueryCommunityPoolRequestSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryCommunityPoolRequest
 */
export interface QueryCommunityPoolRequestSDKType {}
/**
 * QueryCommunityPoolResponse is the response type for the Query/CommunityPool
 * RPC method.
 * @name QueryCommunityPoolResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryCommunityPoolResponse
 */
export interface QueryCommunityPoolResponse {
  /**
   * pool defines community pool's coins.
   */
  pool: Coin[];
}
export interface QueryCommunityPoolResponseProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.QueryCommunityPoolResponse';
  value: Uint8Array;
}
/**
 * QueryCommunityPoolResponse is the response type for the Query/CommunityPool
 * RPC method.
 * @name QueryCommunityPoolResponseSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryCommunityPoolResponse
 */
export interface QueryCommunityPoolResponseSDKType {
  pool: CoinSDKType[];
}
/**
 * QueryContinuousFundRequest is the request type for the Query/ContinuousFund
 * RPC method.
 * @name QueryContinuousFundRequest
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryContinuousFundRequest
 */
export interface QueryContinuousFundRequest {
  /**
   * recipient is the recipient address to query unclaimed budget amount for.
   */
  recipient: string;
}
export interface QueryContinuousFundRequestProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.QueryContinuousFundRequest';
  value: Uint8Array;
}
/**
 * QueryContinuousFundRequest is the request type for the Query/ContinuousFund
 * RPC method.
 * @name QueryContinuousFundRequestSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryContinuousFundRequest
 */
export interface QueryContinuousFundRequestSDKType {
  recipient: string;
}
/**
 * QueryUnclaimedBudgetResponse is the response type for the Query/ContinuousFund
 * RPC method.
 * @name QueryContinuousFundResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryContinuousFundResponse
 */
export interface QueryContinuousFundResponse {
  /**
   * ContinuousFunds is the given continuous fund returned in the query.
   */
  continuousFund: ContinuousFund;
}
export interface QueryContinuousFundResponseProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.QueryContinuousFundResponse';
  value: Uint8Array;
}
/**
 * QueryUnclaimedBudgetResponse is the response type for the Query/ContinuousFund
 * RPC method.
 * @name QueryContinuousFundResponseSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryContinuousFundResponse
 */
export interface QueryContinuousFundResponseSDKType {
  continuous_fund: ContinuousFundSDKType;
}
/**
 * QueryContinuousFundRequest is the request type for the Query/ContinuousFunds
 * RPC method.
 * @name QueryContinuousFundsRequest
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryContinuousFundsRequest
 */
export interface QueryContinuousFundsRequest {}
export interface QueryContinuousFundsRequestProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.QueryContinuousFundsRequest';
  value: Uint8Array;
}
/**
 * QueryContinuousFundRequest is the request type for the Query/ContinuousFunds
 * RPC method.
 * @name QueryContinuousFundsRequestSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryContinuousFundsRequest
 */
export interface QueryContinuousFundsRequestSDKType {}
/**
 * QueryUnclaimedBudgetResponse is the response type for the Query/ContinuousFunds
 * RPC method.
 * @name QueryContinuousFundsResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryContinuousFundsResponse
 */
export interface QueryContinuousFundsResponse {
  /**
   * ContinuousFunds defines all continuous funds in state.
   */
  continuousFunds: ContinuousFund[];
}
export interface QueryContinuousFundsResponseProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.QueryContinuousFundsResponse';
  value: Uint8Array;
}
/**
 * QueryUnclaimedBudgetResponse is the response type for the Query/ContinuousFunds
 * RPC method.
 * @name QueryContinuousFundsResponseSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryContinuousFundsResponse
 */
export interface QueryContinuousFundsResponseSDKType {
  continuous_funds: ContinuousFundSDKType[];
}
/**
 * QueryParamsRequest is the response type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryParamsRequest
 */
export interface QueryParamsRequest {}
export interface QueryParamsRequestProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.QueryParamsRequest';
  value: Uint8Array;
}
/**
 * QueryParamsRequest is the response type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryParamsResponse
 */
export interface QueryParamsResponse {
  params: Params;
}
export interface QueryParamsResponseProtoMsg {
  typeUrl: '/cosmos.protocolpool.v1.QueryParamsResponse';
  value: Uint8Array;
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
  params: ParamsSDKType;
}
function createBaseQueryCommunityPoolRequest(): QueryCommunityPoolRequest {
  return {};
}
/**
 * QueryCommunityPoolRequest is the request type for the Query/CommunityPool RPC
 * method.
 * @name QueryCommunityPoolRequest
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryCommunityPoolRequest
 */
export const QueryCommunityPoolRequest = {
  typeUrl: '/cosmos.protocolpool.v1.QueryCommunityPoolRequest' as const,
  aminoType: 'cosmos-sdk/QueryCommunityPoolRequest' as const,
  is(o: any): o is QueryCommunityPoolRequest {
    return o && o.$typeUrl === QueryCommunityPoolRequest.typeUrl;
  },
  isSDK(o: any): o is QueryCommunityPoolRequestSDKType {
    return o && o.$typeUrl === QueryCommunityPoolRequest.typeUrl;
  },
  encode(
    _: QueryCommunityPoolRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryCommunityPoolRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCommunityPoolRequest();
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
  fromJSON(_: any): QueryCommunityPoolRequest {
    return {};
  },
  toJSON(_: QueryCommunityPoolRequest): JsonSafe<QueryCommunityPoolRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryCommunityPoolRequest>,
  ): QueryCommunityPoolRequest {
    const message = createBaseQueryCommunityPoolRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryCommunityPoolRequestProtoMsg,
  ): QueryCommunityPoolRequest {
    return QueryCommunityPoolRequest.decode(message.value);
  },
  toProto(message: QueryCommunityPoolRequest): Uint8Array {
    return QueryCommunityPoolRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryCommunityPoolRequest,
  ): QueryCommunityPoolRequestProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.QueryCommunityPoolRequest',
      value: QueryCommunityPoolRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryCommunityPoolResponse(): QueryCommunityPoolResponse {
  return {
    pool: [],
  };
}
/**
 * QueryCommunityPoolResponse is the response type for the Query/CommunityPool
 * RPC method.
 * @name QueryCommunityPoolResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryCommunityPoolResponse
 */
export const QueryCommunityPoolResponse = {
  typeUrl: '/cosmos.protocolpool.v1.QueryCommunityPoolResponse' as const,
  aminoType: 'cosmos-sdk/QueryCommunityPoolResponse' as const,
  is(o: any): o is QueryCommunityPoolResponse {
    return (
      o &&
      (o.$typeUrl === QueryCommunityPoolResponse.typeUrl ||
        (Array.isArray(o.pool) && (!o.pool.length || Coin.is(o.pool[0]))))
    );
  },
  isSDK(o: any): o is QueryCommunityPoolResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryCommunityPoolResponse.typeUrl ||
        (Array.isArray(o.pool) && (!o.pool.length || Coin.isSDK(o.pool[0]))))
    );
  },
  encode(
    message: QueryCommunityPoolResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.pool) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryCommunityPoolResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryCommunityPoolResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.pool.push(Coin.decode(reader, reader.uint32()));
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryCommunityPoolResponse {
    return {
      pool: Array.isArray(object?.pool)
        ? object.pool.map((e: any) => Coin.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryCommunityPoolResponse,
  ): JsonSafe<QueryCommunityPoolResponse> {
    const obj: any = {};
    if (message.pool) {
      obj.pool = message.pool.map(e => (e ? Coin.toJSON(e) : undefined));
    } else {
      obj.pool = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryCommunityPoolResponse>,
  ): QueryCommunityPoolResponse {
    const message = createBaseQueryCommunityPoolResponse();
    message.pool = object.pool?.map(e => Coin.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryCommunityPoolResponseProtoMsg,
  ): QueryCommunityPoolResponse {
    return QueryCommunityPoolResponse.decode(message.value);
  },
  toProto(message: QueryCommunityPoolResponse): Uint8Array {
    return QueryCommunityPoolResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryCommunityPoolResponse,
  ): QueryCommunityPoolResponseProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.QueryCommunityPoolResponse',
      value: QueryCommunityPoolResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryContinuousFundRequest(): QueryContinuousFundRequest {
  return {
    recipient: '',
  };
}
/**
 * QueryContinuousFundRequest is the request type for the Query/ContinuousFund
 * RPC method.
 * @name QueryContinuousFundRequest
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryContinuousFundRequest
 */
export const QueryContinuousFundRequest = {
  typeUrl: '/cosmos.protocolpool.v1.QueryContinuousFundRequest' as const,
  aminoType: 'cosmos-sdk/QueryContinuousFundRequest' as const,
  is(o: any): o is QueryContinuousFundRequest {
    return (
      o &&
      (o.$typeUrl === QueryContinuousFundRequest.typeUrl ||
        typeof o.recipient === 'string')
    );
  },
  isSDK(o: any): o is QueryContinuousFundRequestSDKType {
    return (
      o &&
      (o.$typeUrl === QueryContinuousFundRequest.typeUrl ||
        typeof o.recipient === 'string')
    );
  },
  encode(
    message: QueryContinuousFundRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.recipient !== '') {
      writer.uint32(10).string(message.recipient);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryContinuousFundRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryContinuousFundRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.recipient = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryContinuousFundRequest {
    return {
      recipient: isSet(object.recipient) ? String(object.recipient) : '',
    };
  },
  toJSON(
    message: QueryContinuousFundRequest,
  ): JsonSafe<QueryContinuousFundRequest> {
    const obj: any = {};
    message.recipient !== undefined && (obj.recipient = message.recipient);
    return obj;
  },
  fromPartial(
    object: Partial<QueryContinuousFundRequest>,
  ): QueryContinuousFundRequest {
    const message = createBaseQueryContinuousFundRequest();
    message.recipient = object.recipient ?? '';
    return message;
  },
  fromProtoMsg(
    message: QueryContinuousFundRequestProtoMsg,
  ): QueryContinuousFundRequest {
    return QueryContinuousFundRequest.decode(message.value);
  },
  toProto(message: QueryContinuousFundRequest): Uint8Array {
    return QueryContinuousFundRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryContinuousFundRequest,
  ): QueryContinuousFundRequestProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.QueryContinuousFundRequest',
      value: QueryContinuousFundRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryContinuousFundResponse(): QueryContinuousFundResponse {
  return {
    continuousFund: ContinuousFund.fromPartial({}),
  };
}
/**
 * QueryUnclaimedBudgetResponse is the response type for the Query/ContinuousFund
 * RPC method.
 * @name QueryContinuousFundResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryContinuousFundResponse
 */
export const QueryContinuousFundResponse = {
  typeUrl: '/cosmos.protocolpool.v1.QueryContinuousFundResponse' as const,
  aminoType: 'cosmos-sdk/QueryContinuousFundResponse' as const,
  is(o: any): o is QueryContinuousFundResponse {
    return (
      o &&
      (o.$typeUrl === QueryContinuousFundResponse.typeUrl ||
        ContinuousFund.is(o.continuousFund))
    );
  },
  isSDK(o: any): o is QueryContinuousFundResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryContinuousFundResponse.typeUrl ||
        ContinuousFund.isSDK(o.continuous_fund))
    );
  },
  encode(
    message: QueryContinuousFundResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.continuousFund !== undefined) {
      ContinuousFund.encode(
        message.continuousFund,
        writer.uint32(10).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryContinuousFundResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryContinuousFundResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.continuousFund = ContinuousFund.decode(
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
  fromJSON(object: any): QueryContinuousFundResponse {
    return {
      continuousFund: isSet(object.continuousFund)
        ? ContinuousFund.fromJSON(object.continuousFund)
        : undefined,
    };
  },
  toJSON(
    message: QueryContinuousFundResponse,
  ): JsonSafe<QueryContinuousFundResponse> {
    const obj: any = {};
    message.continuousFund !== undefined &&
      (obj.continuousFund = message.continuousFund
        ? ContinuousFund.toJSON(message.continuousFund)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<QueryContinuousFundResponse>,
  ): QueryContinuousFundResponse {
    const message = createBaseQueryContinuousFundResponse();
    message.continuousFund =
      object.continuousFund !== undefined && object.continuousFund !== null
        ? ContinuousFund.fromPartial(object.continuousFund)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: QueryContinuousFundResponseProtoMsg,
  ): QueryContinuousFundResponse {
    return QueryContinuousFundResponse.decode(message.value);
  },
  toProto(message: QueryContinuousFundResponse): Uint8Array {
    return QueryContinuousFundResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryContinuousFundResponse,
  ): QueryContinuousFundResponseProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.QueryContinuousFundResponse',
      value: QueryContinuousFundResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryContinuousFundsRequest(): QueryContinuousFundsRequest {
  return {};
}
/**
 * QueryContinuousFundRequest is the request type for the Query/ContinuousFunds
 * RPC method.
 * @name QueryContinuousFundsRequest
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryContinuousFundsRequest
 */
export const QueryContinuousFundsRequest = {
  typeUrl: '/cosmos.protocolpool.v1.QueryContinuousFundsRequest' as const,
  aminoType: 'cosmos-sdk/QueryContinuousFundsRequest' as const,
  is(o: any): o is QueryContinuousFundsRequest {
    return o && o.$typeUrl === QueryContinuousFundsRequest.typeUrl;
  },
  isSDK(o: any): o is QueryContinuousFundsRequestSDKType {
    return o && o.$typeUrl === QueryContinuousFundsRequest.typeUrl;
  },
  encode(
    _: QueryContinuousFundsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryContinuousFundsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryContinuousFundsRequest();
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
  fromJSON(_: any): QueryContinuousFundsRequest {
    return {};
  },
  toJSON(
    _: QueryContinuousFundsRequest,
  ): JsonSafe<QueryContinuousFundsRequest> {
    const obj: any = {};
    return obj;
  },
  fromPartial(
    _: Partial<QueryContinuousFundsRequest>,
  ): QueryContinuousFundsRequest {
    const message = createBaseQueryContinuousFundsRequest();
    return message;
  },
  fromProtoMsg(
    message: QueryContinuousFundsRequestProtoMsg,
  ): QueryContinuousFundsRequest {
    return QueryContinuousFundsRequest.decode(message.value);
  },
  toProto(message: QueryContinuousFundsRequest): Uint8Array {
    return QueryContinuousFundsRequest.encode(message).finish();
  },
  toProtoMsg(
    message: QueryContinuousFundsRequest,
  ): QueryContinuousFundsRequestProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.QueryContinuousFundsRequest',
      value: QueryContinuousFundsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryContinuousFundsResponse(): QueryContinuousFundsResponse {
  return {
    continuousFunds: [],
  };
}
/**
 * QueryUnclaimedBudgetResponse is the response type for the Query/ContinuousFunds
 * RPC method.
 * @name QueryContinuousFundsResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryContinuousFundsResponse
 */
export const QueryContinuousFundsResponse = {
  typeUrl: '/cosmos.protocolpool.v1.QueryContinuousFundsResponse' as const,
  aminoType: 'cosmos-sdk/QueryContinuousFundsResponse' as const,
  is(o: any): o is QueryContinuousFundsResponse {
    return (
      o &&
      (o.$typeUrl === QueryContinuousFundsResponse.typeUrl ||
        (Array.isArray(o.continuousFunds) &&
          (!o.continuousFunds.length ||
            ContinuousFund.is(o.continuousFunds[0]))))
    );
  },
  isSDK(o: any): o is QueryContinuousFundsResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryContinuousFundsResponse.typeUrl ||
        (Array.isArray(o.continuous_funds) &&
          (!o.continuous_funds.length ||
            ContinuousFund.isSDK(o.continuous_funds[0]))))
    );
  },
  encode(
    message: QueryContinuousFundsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.continuousFunds) {
      ContinuousFund.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): QueryContinuousFundsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseQueryContinuousFundsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.continuousFunds.push(
            ContinuousFund.decode(reader, reader.uint32()),
          );
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): QueryContinuousFundsResponse {
    return {
      continuousFunds: Array.isArray(object?.continuousFunds)
        ? object.continuousFunds.map((e: any) => ContinuousFund.fromJSON(e))
        : [],
    };
  },
  toJSON(
    message: QueryContinuousFundsResponse,
  ): JsonSafe<QueryContinuousFundsResponse> {
    const obj: any = {};
    if (message.continuousFunds) {
      obj.continuousFunds = message.continuousFunds.map(e =>
        e ? ContinuousFund.toJSON(e) : undefined,
      );
    } else {
      obj.continuousFunds = [];
    }
    return obj;
  },
  fromPartial(
    object: Partial<QueryContinuousFundsResponse>,
  ): QueryContinuousFundsResponse {
    const message = createBaseQueryContinuousFundsResponse();
    message.continuousFunds =
      object.continuousFunds?.map(e => ContinuousFund.fromPartial(e)) || [];
    return message;
  },
  fromProtoMsg(
    message: QueryContinuousFundsResponseProtoMsg,
  ): QueryContinuousFundsResponse {
    return QueryContinuousFundsResponse.decode(message.value);
  },
  toProto(message: QueryContinuousFundsResponse): Uint8Array {
    return QueryContinuousFundsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: QueryContinuousFundsResponse,
  ): QueryContinuousFundsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.protocolpool.v1.QueryContinuousFundsResponse',
      value: QueryContinuousFundsResponse.encode(message).finish(),
    };
  },
};
function createBaseQueryParamsRequest(): QueryParamsRequest {
  return {};
}
/**
 * QueryParamsRequest is the response type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryParamsRequest
 */
export const QueryParamsRequest = {
  typeUrl: '/cosmos.protocolpool.v1.QueryParamsRequest' as const,
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
      typeUrl: '/cosmos.protocolpool.v1.QueryParamsRequest',
      value: QueryParamsRequest.encode(message).finish(),
    };
  },
};
function createBaseQueryParamsResponse(): QueryParamsResponse {
  return {
    params: Params.fromPartial({}),
  };
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package cosmos.protocolpool.v1
 * @see proto type: cosmos.protocolpool.v1.QueryParamsResponse
 */
export const QueryParamsResponse = {
  typeUrl: '/cosmos.protocolpool.v1.QueryParamsResponse' as const,
  aminoType: 'cosmos-sdk/QueryParamsResponse' as const,
  is(o: any): o is QueryParamsResponse {
    return (
      o && (o.$typeUrl === QueryParamsResponse.typeUrl || Params.is(o.params))
    );
  },
  isSDK(o: any): o is QueryParamsResponseSDKType {
    return (
      o &&
      (o.$typeUrl === QueryParamsResponse.typeUrl || Params.isSDK(o.params))
    );
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
      typeUrl: '/cosmos.protocolpool.v1.QueryParamsResponse',
      value: QueryParamsResponse.encode(message).finish(),
    };
  },
};
