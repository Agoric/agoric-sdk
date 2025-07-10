//@ts-nocheck
import { Tx, type TxSDKType } from './tx.js';
import {
  PageRequest,
  type PageRequestSDKType,
  PageResponse,
  type PageResponseSDKType,
} from '../../base/query/v1beta1/pagination.js';
import {
  TxResponse,
  type TxResponseSDKType,
  GasInfo,
  type GasInfoSDKType,
  Result,
  type ResultSDKType,
} from '../../base/abci/v1beta1/abci.js';
import {
  BlockID,
  type BlockIDSDKType,
} from '../../../tendermint/types/types.js';
import { Block, type BlockSDKType } from '../../../tendermint/types/block.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { isSet } from '../../../helpers.js';
import { type JsonSafe } from '../../../json-safe.js';
import { decodeBase64 as bytesFromBase64 } from '@endo/base64';
import { encodeBase64 as base64FromBytes } from '@endo/base64';
/** OrderBy defines the sorting order */
export enum OrderBy {
  /**
   * ORDER_BY_UNSPECIFIED - ORDER_BY_UNSPECIFIED specifies an unknown sorting order. OrderBy defaults
   * to ASC in this case.
   */
  ORDER_BY_UNSPECIFIED = 0,
  /** ORDER_BY_ASC - ORDER_BY_ASC defines ascending order */
  ORDER_BY_ASC = 1,
  /** ORDER_BY_DESC - ORDER_BY_DESC defines descending order */
  ORDER_BY_DESC = 2,
  UNRECOGNIZED = -1,
}
export const OrderBySDKType = OrderBy;
export function orderByFromJSON(object: any): OrderBy {
  switch (object) {
    case 0:
    case 'ORDER_BY_UNSPECIFIED':
      return OrderBy.ORDER_BY_UNSPECIFIED;
    case 1:
    case 'ORDER_BY_ASC':
      return OrderBy.ORDER_BY_ASC;
    case 2:
    case 'ORDER_BY_DESC':
      return OrderBy.ORDER_BY_DESC;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return OrderBy.UNRECOGNIZED;
  }
}
export function orderByToJSON(object: OrderBy): string {
  switch (object) {
    case OrderBy.ORDER_BY_UNSPECIFIED:
      return 'ORDER_BY_UNSPECIFIED';
    case OrderBy.ORDER_BY_ASC:
      return 'ORDER_BY_ASC';
    case OrderBy.ORDER_BY_DESC:
      return 'ORDER_BY_DESC';
    case OrderBy.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/**
 * BroadcastMode specifies the broadcast mode for the TxService.Broadcast RPC
 * method.
 */
export enum BroadcastMode {
  /** BROADCAST_MODE_UNSPECIFIED - zero-value for mode ordering */
  BROADCAST_MODE_UNSPECIFIED = 0,
  /**
   * BROADCAST_MODE_BLOCK - DEPRECATED: use BROADCAST_MODE_SYNC instead,
   * BROADCAST_MODE_BLOCK is not supported by the SDK from v0.47.x onwards.
   */
  BROADCAST_MODE_BLOCK = 1,
  /**
   * BROADCAST_MODE_SYNC - BROADCAST_MODE_SYNC defines a tx broadcasting mode where the client waits
   * for a CheckTx execution response only.
   */
  BROADCAST_MODE_SYNC = 2,
  /**
   * BROADCAST_MODE_ASYNC - BROADCAST_MODE_ASYNC defines a tx broadcasting mode where the client
   * returns immediately.
   */
  BROADCAST_MODE_ASYNC = 3,
  UNRECOGNIZED = -1,
}
export const BroadcastModeSDKType = BroadcastMode;
export function broadcastModeFromJSON(object: any): BroadcastMode {
  switch (object) {
    case 0:
    case 'BROADCAST_MODE_UNSPECIFIED':
      return BroadcastMode.BROADCAST_MODE_UNSPECIFIED;
    case 1:
    case 'BROADCAST_MODE_BLOCK':
      return BroadcastMode.BROADCAST_MODE_BLOCK;
    case 2:
    case 'BROADCAST_MODE_SYNC':
      return BroadcastMode.BROADCAST_MODE_SYNC;
    case 3:
    case 'BROADCAST_MODE_ASYNC':
      return BroadcastMode.BROADCAST_MODE_ASYNC;
    case -1:
    case 'UNRECOGNIZED':
    default:
      return BroadcastMode.UNRECOGNIZED;
  }
}
export function broadcastModeToJSON(object: BroadcastMode): string {
  switch (object) {
    case BroadcastMode.BROADCAST_MODE_UNSPECIFIED:
      return 'BROADCAST_MODE_UNSPECIFIED';
    case BroadcastMode.BROADCAST_MODE_BLOCK:
      return 'BROADCAST_MODE_BLOCK';
    case BroadcastMode.BROADCAST_MODE_SYNC:
      return 'BROADCAST_MODE_SYNC';
    case BroadcastMode.BROADCAST_MODE_ASYNC:
      return 'BROADCAST_MODE_ASYNC';
    case BroadcastMode.UNRECOGNIZED:
    default:
      return 'UNRECOGNIZED';
  }
}
/**
 * GetTxsEventRequest is the request type for the Service.TxsByEvents
 * RPC method.
 */
export interface GetTxsEventRequest {
  /**
   * events is the list of transaction event type.
   * Deprecated post v0.47.x: use query instead, which should contain a valid
   * events query.
   */
  /** @deprecated */
  events: string[];
  /**
   * pagination defines a pagination for the request.
   * Deprecated post v0.46.x: use page and limit instead.
   */
  /** @deprecated */
  pagination?: PageRequest;
  orderBy: OrderBy;
  /**
   * page is the page number to query, starts at 1. If not provided, will
   * default to first page.
   */
  page: bigint;
  /**
   * limit is the total number of results to be returned in the result page.
   * If left empty it will default to a value to be set by each app.
   */
  limit: bigint;
  /**
   * query defines the transaction event query that is proxied to Tendermint's
   * TxSearch RPC method. The query must be valid.
   *
   * Since cosmos-sdk 0.50
   */
  query: string;
}
export interface GetTxsEventRequestProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.GetTxsEventRequest';
  value: Uint8Array;
}
/**
 * GetTxsEventRequest is the request type for the Service.TxsByEvents
 * RPC method.
 */
export interface GetTxsEventRequestSDKType {
  /** @deprecated */
  events: string[];
  /** @deprecated */
  pagination?: PageRequestSDKType;
  order_by: OrderBy;
  page: bigint;
  limit: bigint;
  query: string;
}
/**
 * GetTxsEventResponse is the response type for the Service.TxsByEvents
 * RPC method.
 */
export interface GetTxsEventResponse {
  /** txs is the list of queried transactions. */
  txs: Tx[];
  /** tx_responses is the list of queried TxResponses. */
  txResponses: TxResponse[];
  /**
   * pagination defines a pagination for the response.
   * Deprecated post v0.46.x: use total instead.
   */
  /** @deprecated */
  pagination?: PageResponse;
  /** total is total number of results available */
  total: bigint;
}
export interface GetTxsEventResponseProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.GetTxsEventResponse';
  value: Uint8Array;
}
/**
 * GetTxsEventResponse is the response type for the Service.TxsByEvents
 * RPC method.
 */
export interface GetTxsEventResponseSDKType {
  txs: TxSDKType[];
  tx_responses: TxResponseSDKType[];
  /** @deprecated */
  pagination?: PageResponseSDKType;
  total: bigint;
}
/**
 * BroadcastTxRequest is the request type for the Service.BroadcastTxRequest
 * RPC method.
 */
export interface BroadcastTxRequest {
  /** tx_bytes is the raw transaction. */
  txBytes: Uint8Array;
  mode: BroadcastMode;
}
export interface BroadcastTxRequestProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.BroadcastTxRequest';
  value: Uint8Array;
}
/**
 * BroadcastTxRequest is the request type for the Service.BroadcastTxRequest
 * RPC method.
 */
export interface BroadcastTxRequestSDKType {
  tx_bytes: Uint8Array;
  mode: BroadcastMode;
}
/**
 * BroadcastTxResponse is the response type for the
 * Service.BroadcastTx method.
 */
export interface BroadcastTxResponse {
  /** tx_response is the queried TxResponses. */
  txResponse?: TxResponse;
}
export interface BroadcastTxResponseProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.BroadcastTxResponse';
  value: Uint8Array;
}
/**
 * BroadcastTxResponse is the response type for the
 * Service.BroadcastTx method.
 */
export interface BroadcastTxResponseSDKType {
  tx_response?: TxResponseSDKType;
}
/**
 * SimulateRequest is the request type for the Service.Simulate
 * RPC method.
 */
export interface SimulateRequest {
  /**
   * tx is the transaction to simulate.
   * Deprecated. Send raw tx bytes instead.
   */
  /** @deprecated */
  tx?: Tx;
  /**
   * tx_bytes is the raw transaction.
   *
   * Since: cosmos-sdk 0.43
   */
  txBytes: Uint8Array;
}
export interface SimulateRequestProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.SimulateRequest';
  value: Uint8Array;
}
/**
 * SimulateRequest is the request type for the Service.Simulate
 * RPC method.
 */
export interface SimulateRequestSDKType {
  /** @deprecated */
  tx?: TxSDKType;
  tx_bytes: Uint8Array;
}
/**
 * SimulateResponse is the response type for the
 * Service.SimulateRPC method.
 */
export interface SimulateResponse {
  /** gas_info is the information about gas used in the simulation. */
  gasInfo?: GasInfo;
  /** result is the result of the simulation. */
  result?: Result;
}
export interface SimulateResponseProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.SimulateResponse';
  value: Uint8Array;
}
/**
 * SimulateResponse is the response type for the
 * Service.SimulateRPC method.
 */
export interface SimulateResponseSDKType {
  gas_info?: GasInfoSDKType;
  result?: ResultSDKType;
}
/**
 * GetTxRequest is the request type for the Service.GetTx
 * RPC method.
 */
export interface GetTxRequest {
  /** hash is the tx hash to query, encoded as a hex string. */
  hash: string;
}
export interface GetTxRequestProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.GetTxRequest';
  value: Uint8Array;
}
/**
 * GetTxRequest is the request type for the Service.GetTx
 * RPC method.
 */
export interface GetTxRequestSDKType {
  hash: string;
}
/** GetTxResponse is the response type for the Service.GetTx method. */
export interface GetTxResponse {
  /** tx is the queried transaction. */
  tx?: Tx;
  /** tx_response is the queried TxResponses. */
  txResponse?: TxResponse;
}
export interface GetTxResponseProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.GetTxResponse';
  value: Uint8Array;
}
/** GetTxResponse is the response type for the Service.GetTx method. */
export interface GetTxResponseSDKType {
  tx?: TxSDKType;
  tx_response?: TxResponseSDKType;
}
/**
 * GetBlockWithTxsRequest is the request type for the Service.GetBlockWithTxs
 * RPC method.
 *
 * Since: cosmos-sdk 0.45.2
 */
export interface GetBlockWithTxsRequest {
  /** height is the height of the block to query. */
  height: bigint;
  /** pagination defines a pagination for the request. */
  pagination?: PageRequest;
}
export interface GetBlockWithTxsRequestProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.GetBlockWithTxsRequest';
  value: Uint8Array;
}
/**
 * GetBlockWithTxsRequest is the request type for the Service.GetBlockWithTxs
 * RPC method.
 *
 * Since: cosmos-sdk 0.45.2
 */
export interface GetBlockWithTxsRequestSDKType {
  height: bigint;
  pagination?: PageRequestSDKType;
}
/**
 * GetBlockWithTxsResponse is the response type for the Service.GetBlockWithTxs
 * method.
 *
 * Since: cosmos-sdk 0.45.2
 */
export interface GetBlockWithTxsResponse {
  /** txs are the transactions in the block. */
  txs: Tx[];
  blockId?: BlockID;
  block?: Block;
  /** pagination defines a pagination for the response. */
  pagination?: PageResponse;
}
export interface GetBlockWithTxsResponseProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.GetBlockWithTxsResponse';
  value: Uint8Array;
}
/**
 * GetBlockWithTxsResponse is the response type for the Service.GetBlockWithTxs
 * method.
 *
 * Since: cosmos-sdk 0.45.2
 */
export interface GetBlockWithTxsResponseSDKType {
  txs: TxSDKType[];
  block_id?: BlockIDSDKType;
  block?: BlockSDKType;
  pagination?: PageResponseSDKType;
}
/**
 * TxDecodeRequest is the request type for the Service.TxDecode
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxDecodeRequest {
  /** tx_bytes is the raw transaction. */
  txBytes: Uint8Array;
}
export interface TxDecodeRequestProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.TxDecodeRequest';
  value: Uint8Array;
}
/**
 * TxDecodeRequest is the request type for the Service.TxDecode
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxDecodeRequestSDKType {
  tx_bytes: Uint8Array;
}
/**
 * TxDecodeResponse is the response type for the
 * Service.TxDecode method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxDecodeResponse {
  /** tx is the decoded transaction. */
  tx?: Tx;
}
export interface TxDecodeResponseProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.TxDecodeResponse';
  value: Uint8Array;
}
/**
 * TxDecodeResponse is the response type for the
 * Service.TxDecode method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxDecodeResponseSDKType {
  tx?: TxSDKType;
}
/**
 * TxEncodeRequest is the request type for the Service.TxEncode
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxEncodeRequest {
  /** tx is the transaction to encode. */
  tx?: Tx;
}
export interface TxEncodeRequestProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.TxEncodeRequest';
  value: Uint8Array;
}
/**
 * TxEncodeRequest is the request type for the Service.TxEncode
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxEncodeRequestSDKType {
  tx?: TxSDKType;
}
/**
 * TxEncodeResponse is the response type for the
 * Service.TxEncode method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxEncodeResponse {
  /** tx_bytes is the encoded transaction bytes. */
  txBytes: Uint8Array;
}
export interface TxEncodeResponseProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.TxEncodeResponse';
  value: Uint8Array;
}
/**
 * TxEncodeResponse is the response type for the
 * Service.TxEncode method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxEncodeResponseSDKType {
  tx_bytes: Uint8Array;
}
/**
 * TxEncodeAminoRequest is the request type for the Service.TxEncodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxEncodeAminoRequest {
  aminoJson: string;
}
export interface TxEncodeAminoRequestProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.TxEncodeAminoRequest';
  value: Uint8Array;
}
/**
 * TxEncodeAminoRequest is the request type for the Service.TxEncodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxEncodeAminoRequestSDKType {
  amino_json: string;
}
/**
 * TxEncodeAminoResponse is the response type for the Service.TxEncodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxEncodeAminoResponse {
  aminoBinary: Uint8Array;
}
export interface TxEncodeAminoResponseProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.TxEncodeAminoResponse';
  value: Uint8Array;
}
/**
 * TxEncodeAminoResponse is the response type for the Service.TxEncodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxEncodeAminoResponseSDKType {
  amino_binary: Uint8Array;
}
/**
 * TxDecodeAminoRequest is the request type for the Service.TxDecodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxDecodeAminoRequest {
  aminoBinary: Uint8Array;
}
export interface TxDecodeAminoRequestProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.TxDecodeAminoRequest';
  value: Uint8Array;
}
/**
 * TxDecodeAminoRequest is the request type for the Service.TxDecodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxDecodeAminoRequestSDKType {
  amino_binary: Uint8Array;
}
/**
 * TxDecodeAminoResponse is the response type for the Service.TxDecodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxDecodeAminoResponse {
  aminoJson: string;
}
export interface TxDecodeAminoResponseProtoMsg {
  typeUrl: '/cosmos.tx.v1beta1.TxDecodeAminoResponse';
  value: Uint8Array;
}
/**
 * TxDecodeAminoResponse is the response type for the Service.TxDecodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 */
export interface TxDecodeAminoResponseSDKType {
  amino_json: string;
}
function createBaseGetTxsEventRequest(): GetTxsEventRequest {
  return {
    events: [],
    pagination: undefined,
    orderBy: 0,
    page: BigInt(0),
    limit: BigInt(0),
    query: '',
  };
}
export const GetTxsEventRequest = {
  typeUrl: '/cosmos.tx.v1beta1.GetTxsEventRequest',
  encode(
    message: GetTxsEventRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.events) {
      writer.uint32(10).string(v!);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    if (message.orderBy !== 0) {
      writer.uint32(24).int32(message.orderBy);
    }
    if (message.page !== BigInt(0)) {
      writer.uint32(32).uint64(message.page);
    }
    if (message.limit !== BigInt(0)) {
      writer.uint32(40).uint64(message.limit);
    }
    if (message.query !== '') {
      writer.uint32(50).string(message.query);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): GetTxsEventRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetTxsEventRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.events.push(reader.string());
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        case 3:
          message.orderBy = reader.int32() as any;
          break;
        case 4:
          message.page = reader.uint64();
          break;
        case 5:
          message.limit = reader.uint64();
          break;
        case 6:
          message.query = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GetTxsEventRequest {
    return {
      events: Array.isArray(object?.events)
        ? object.events.map((e: any) => String(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
      orderBy: isSet(object.orderBy) ? orderByFromJSON(object.orderBy) : -1,
      page: isSet(object.page) ? BigInt(object.page.toString()) : BigInt(0),
      limit: isSet(object.limit) ? BigInt(object.limit.toString()) : BigInt(0),
      query: isSet(object.query) ? String(object.query) : '',
    };
  },
  toJSON(message: GetTxsEventRequest): JsonSafe<GetTxsEventRequest> {
    const obj: any = {};
    if (message.events) {
      obj.events = message.events.map(e => e);
    } else {
      obj.events = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    message.orderBy !== undefined &&
      (obj.orderBy = orderByToJSON(message.orderBy));
    message.page !== undefined &&
      (obj.page = (message.page || BigInt(0)).toString());
    message.limit !== undefined &&
      (obj.limit = (message.limit || BigInt(0)).toString());
    message.query !== undefined && (obj.query = message.query);
    return obj;
  },
  fromPartial(object: Partial<GetTxsEventRequest>): GetTxsEventRequest {
    const message = createBaseGetTxsEventRequest();
    message.events = object.events?.map(e => e) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    message.orderBy = object.orderBy ?? 0;
    message.page =
      object.page !== undefined && object.page !== null
        ? BigInt(object.page.toString())
        : BigInt(0);
    message.limit =
      object.limit !== undefined && object.limit !== null
        ? BigInt(object.limit.toString())
        : BigInt(0);
    message.query = object.query ?? '';
    return message;
  },
  fromProtoMsg(message: GetTxsEventRequestProtoMsg): GetTxsEventRequest {
    return GetTxsEventRequest.decode(message.value);
  },
  toProto(message: GetTxsEventRequest): Uint8Array {
    return GetTxsEventRequest.encode(message).finish();
  },
  toProtoMsg(message: GetTxsEventRequest): GetTxsEventRequestProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.GetTxsEventRequest',
      value: GetTxsEventRequest.encode(message).finish(),
    };
  },
};
function createBaseGetTxsEventResponse(): GetTxsEventResponse {
  return {
    txs: [],
    txResponses: [],
    pagination: undefined,
    total: BigInt(0),
  };
}
export const GetTxsEventResponse = {
  typeUrl: '/cosmos.tx.v1beta1.GetTxsEventResponse',
  encode(
    message: GetTxsEventResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.txs) {
      Tx.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    for (const v of message.txResponses) {
      TxResponse.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(26).fork(),
      ).ldelim();
    }
    if (message.total !== BigInt(0)) {
      writer.uint32(32).uint64(message.total);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): GetTxsEventResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetTxsEventResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.txs.push(Tx.decode(reader, reader.uint32()));
          break;
        case 2:
          message.txResponses.push(TxResponse.decode(reader, reader.uint32()));
          break;
        case 3:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        case 4:
          message.total = reader.uint64();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GetTxsEventResponse {
    return {
      txs: Array.isArray(object?.txs)
        ? object.txs.map((e: any) => Tx.fromJSON(e))
        : [],
      txResponses: Array.isArray(object?.txResponses)
        ? object.txResponses.map((e: any) => TxResponse.fromJSON(e))
        : [],
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
      total: isSet(object.total) ? BigInt(object.total.toString()) : BigInt(0),
    };
  },
  toJSON(message: GetTxsEventResponse): JsonSafe<GetTxsEventResponse> {
    const obj: any = {};
    if (message.txs) {
      obj.txs = message.txs.map(e => (e ? Tx.toJSON(e) : undefined));
    } else {
      obj.txs = [];
    }
    if (message.txResponses) {
      obj.txResponses = message.txResponses.map(e =>
        e ? TxResponse.toJSON(e) : undefined,
      );
    } else {
      obj.txResponses = [];
    }
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    message.total !== undefined &&
      (obj.total = (message.total || BigInt(0)).toString());
    return obj;
  },
  fromPartial(object: Partial<GetTxsEventResponse>): GetTxsEventResponse {
    const message = createBaseGetTxsEventResponse();
    message.txs = object.txs?.map(e => Tx.fromPartial(e)) || [];
    message.txResponses =
      object.txResponses?.map(e => TxResponse.fromPartial(e)) || [];
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    message.total =
      object.total !== undefined && object.total !== null
        ? BigInt(object.total.toString())
        : BigInt(0);
    return message;
  },
  fromProtoMsg(message: GetTxsEventResponseProtoMsg): GetTxsEventResponse {
    return GetTxsEventResponse.decode(message.value);
  },
  toProto(message: GetTxsEventResponse): Uint8Array {
    return GetTxsEventResponse.encode(message).finish();
  },
  toProtoMsg(message: GetTxsEventResponse): GetTxsEventResponseProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.GetTxsEventResponse',
      value: GetTxsEventResponse.encode(message).finish(),
    };
  },
};
function createBaseBroadcastTxRequest(): BroadcastTxRequest {
  return {
    txBytes: new Uint8Array(),
    mode: 0,
  };
}
export const BroadcastTxRequest = {
  typeUrl: '/cosmos.tx.v1beta1.BroadcastTxRequest',
  encode(
    message: BroadcastTxRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.txBytes.length !== 0) {
      writer.uint32(10).bytes(message.txBytes);
    }
    if (message.mode !== 0) {
      writer.uint32(16).int32(message.mode);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): BroadcastTxRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBroadcastTxRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.txBytes = reader.bytes();
          break;
        case 2:
          message.mode = reader.int32() as any;
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): BroadcastTxRequest {
    return {
      txBytes: isSet(object.txBytes)
        ? bytesFromBase64(object.txBytes)
        : new Uint8Array(),
      mode: isSet(object.mode) ? broadcastModeFromJSON(object.mode) : -1,
    };
  },
  toJSON(message: BroadcastTxRequest): JsonSafe<BroadcastTxRequest> {
    const obj: any = {};
    message.txBytes !== undefined &&
      (obj.txBytes = base64FromBytes(
        message.txBytes !== undefined ? message.txBytes : new Uint8Array(),
      ));
    message.mode !== undefined &&
      (obj.mode = broadcastModeToJSON(message.mode));
    return obj;
  },
  fromPartial(object: Partial<BroadcastTxRequest>): BroadcastTxRequest {
    const message = createBaseBroadcastTxRequest();
    message.txBytes = object.txBytes ?? new Uint8Array();
    message.mode = object.mode ?? 0;
    return message;
  },
  fromProtoMsg(message: BroadcastTxRequestProtoMsg): BroadcastTxRequest {
    return BroadcastTxRequest.decode(message.value);
  },
  toProto(message: BroadcastTxRequest): Uint8Array {
    return BroadcastTxRequest.encode(message).finish();
  },
  toProtoMsg(message: BroadcastTxRequest): BroadcastTxRequestProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.BroadcastTxRequest',
      value: BroadcastTxRequest.encode(message).finish(),
    };
  },
};
function createBaseBroadcastTxResponse(): BroadcastTxResponse {
  return {
    txResponse: undefined,
  };
}
export const BroadcastTxResponse = {
  typeUrl: '/cosmos.tx.v1beta1.BroadcastTxResponse',
  encode(
    message: BroadcastTxResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.txResponse !== undefined) {
      TxResponse.encode(message.txResponse, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): BroadcastTxResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseBroadcastTxResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.txResponse = TxResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): BroadcastTxResponse {
    return {
      txResponse: isSet(object.txResponse)
        ? TxResponse.fromJSON(object.txResponse)
        : undefined,
    };
  },
  toJSON(message: BroadcastTxResponse): JsonSafe<BroadcastTxResponse> {
    const obj: any = {};
    message.txResponse !== undefined &&
      (obj.txResponse = message.txResponse
        ? TxResponse.toJSON(message.txResponse)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<BroadcastTxResponse>): BroadcastTxResponse {
    const message = createBaseBroadcastTxResponse();
    message.txResponse =
      object.txResponse !== undefined && object.txResponse !== null
        ? TxResponse.fromPartial(object.txResponse)
        : undefined;
    return message;
  },
  fromProtoMsg(message: BroadcastTxResponseProtoMsg): BroadcastTxResponse {
    return BroadcastTxResponse.decode(message.value);
  },
  toProto(message: BroadcastTxResponse): Uint8Array {
    return BroadcastTxResponse.encode(message).finish();
  },
  toProtoMsg(message: BroadcastTxResponse): BroadcastTxResponseProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.BroadcastTxResponse',
      value: BroadcastTxResponse.encode(message).finish(),
    };
  },
};
function createBaseSimulateRequest(): SimulateRequest {
  return {
    tx: undefined,
    txBytes: new Uint8Array(),
  };
}
export const SimulateRequest = {
  typeUrl: '/cosmos.tx.v1beta1.SimulateRequest',
  encode(
    message: SimulateRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.tx !== undefined) {
      Tx.encode(message.tx, writer.uint32(10).fork()).ldelim();
    }
    if (message.txBytes.length !== 0) {
      writer.uint32(18).bytes(message.txBytes);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): SimulateRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSimulateRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.tx = Tx.decode(reader, reader.uint32());
          break;
        case 2:
          message.txBytes = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SimulateRequest {
    return {
      tx: isSet(object.tx) ? Tx.fromJSON(object.tx) : undefined,
      txBytes: isSet(object.txBytes)
        ? bytesFromBase64(object.txBytes)
        : new Uint8Array(),
    };
  },
  toJSON(message: SimulateRequest): JsonSafe<SimulateRequest> {
    const obj: any = {};
    message.tx !== undefined &&
      (obj.tx = message.tx ? Tx.toJSON(message.tx) : undefined);
    message.txBytes !== undefined &&
      (obj.txBytes = base64FromBytes(
        message.txBytes !== undefined ? message.txBytes : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<SimulateRequest>): SimulateRequest {
    const message = createBaseSimulateRequest();
    message.tx =
      object.tx !== undefined && object.tx !== null
        ? Tx.fromPartial(object.tx)
        : undefined;
    message.txBytes = object.txBytes ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: SimulateRequestProtoMsg): SimulateRequest {
    return SimulateRequest.decode(message.value);
  },
  toProto(message: SimulateRequest): Uint8Array {
    return SimulateRequest.encode(message).finish();
  },
  toProtoMsg(message: SimulateRequest): SimulateRequestProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.SimulateRequest',
      value: SimulateRequest.encode(message).finish(),
    };
  },
};
function createBaseSimulateResponse(): SimulateResponse {
  return {
    gasInfo: undefined,
    result: undefined,
  };
}
export const SimulateResponse = {
  typeUrl: '/cosmos.tx.v1beta1.SimulateResponse',
  encode(
    message: SimulateResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.gasInfo !== undefined) {
      GasInfo.encode(message.gasInfo, writer.uint32(10).fork()).ldelim();
    }
    if (message.result !== undefined) {
      Result.encode(message.result, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): SimulateResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSimulateResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.gasInfo = GasInfo.decode(reader, reader.uint32());
          break;
        case 2:
          message.result = Result.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): SimulateResponse {
    return {
      gasInfo: isSet(object.gasInfo)
        ? GasInfo.fromJSON(object.gasInfo)
        : undefined,
      result: isSet(object.result) ? Result.fromJSON(object.result) : undefined,
    };
  },
  toJSON(message: SimulateResponse): JsonSafe<SimulateResponse> {
    const obj: any = {};
    message.gasInfo !== undefined &&
      (obj.gasInfo = message.gasInfo
        ? GasInfo.toJSON(message.gasInfo)
        : undefined);
    message.result !== undefined &&
      (obj.result = message.result ? Result.toJSON(message.result) : undefined);
    return obj;
  },
  fromPartial(object: Partial<SimulateResponse>): SimulateResponse {
    const message = createBaseSimulateResponse();
    message.gasInfo =
      object.gasInfo !== undefined && object.gasInfo !== null
        ? GasInfo.fromPartial(object.gasInfo)
        : undefined;
    message.result =
      object.result !== undefined && object.result !== null
        ? Result.fromPartial(object.result)
        : undefined;
    return message;
  },
  fromProtoMsg(message: SimulateResponseProtoMsg): SimulateResponse {
    return SimulateResponse.decode(message.value);
  },
  toProto(message: SimulateResponse): Uint8Array {
    return SimulateResponse.encode(message).finish();
  },
  toProtoMsg(message: SimulateResponse): SimulateResponseProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.SimulateResponse',
      value: SimulateResponse.encode(message).finish(),
    };
  },
};
function createBaseGetTxRequest(): GetTxRequest {
  return {
    hash: '',
  };
}
export const GetTxRequest = {
  typeUrl: '/cosmos.tx.v1beta1.GetTxRequest',
  encode(
    message: GetTxRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.hash !== '') {
      writer.uint32(10).string(message.hash);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): GetTxRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetTxRequest();
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
  fromJSON(object: any): GetTxRequest {
    return {
      hash: isSet(object.hash) ? String(object.hash) : '',
    };
  },
  toJSON(message: GetTxRequest): JsonSafe<GetTxRequest> {
    const obj: any = {};
    message.hash !== undefined && (obj.hash = message.hash);
    return obj;
  },
  fromPartial(object: Partial<GetTxRequest>): GetTxRequest {
    const message = createBaseGetTxRequest();
    message.hash = object.hash ?? '';
    return message;
  },
  fromProtoMsg(message: GetTxRequestProtoMsg): GetTxRequest {
    return GetTxRequest.decode(message.value);
  },
  toProto(message: GetTxRequest): Uint8Array {
    return GetTxRequest.encode(message).finish();
  },
  toProtoMsg(message: GetTxRequest): GetTxRequestProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.GetTxRequest',
      value: GetTxRequest.encode(message).finish(),
    };
  },
};
function createBaseGetTxResponse(): GetTxResponse {
  return {
    tx: undefined,
    txResponse: undefined,
  };
}
export const GetTxResponse = {
  typeUrl: '/cosmos.tx.v1beta1.GetTxResponse',
  encode(
    message: GetTxResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.tx !== undefined) {
      Tx.encode(message.tx, writer.uint32(10).fork()).ldelim();
    }
    if (message.txResponse !== undefined) {
      TxResponse.encode(message.txResponse, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): GetTxResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetTxResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.tx = Tx.decode(reader, reader.uint32());
          break;
        case 2:
          message.txResponse = TxResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GetTxResponse {
    return {
      tx: isSet(object.tx) ? Tx.fromJSON(object.tx) : undefined,
      txResponse: isSet(object.txResponse)
        ? TxResponse.fromJSON(object.txResponse)
        : undefined,
    };
  },
  toJSON(message: GetTxResponse): JsonSafe<GetTxResponse> {
    const obj: any = {};
    message.tx !== undefined &&
      (obj.tx = message.tx ? Tx.toJSON(message.tx) : undefined);
    message.txResponse !== undefined &&
      (obj.txResponse = message.txResponse
        ? TxResponse.toJSON(message.txResponse)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<GetTxResponse>): GetTxResponse {
    const message = createBaseGetTxResponse();
    message.tx =
      object.tx !== undefined && object.tx !== null
        ? Tx.fromPartial(object.tx)
        : undefined;
    message.txResponse =
      object.txResponse !== undefined && object.txResponse !== null
        ? TxResponse.fromPartial(object.txResponse)
        : undefined;
    return message;
  },
  fromProtoMsg(message: GetTxResponseProtoMsg): GetTxResponse {
    return GetTxResponse.decode(message.value);
  },
  toProto(message: GetTxResponse): Uint8Array {
    return GetTxResponse.encode(message).finish();
  },
  toProtoMsg(message: GetTxResponse): GetTxResponseProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.GetTxResponse',
      value: GetTxResponse.encode(message).finish(),
    };
  },
};
function createBaseGetBlockWithTxsRequest(): GetBlockWithTxsRequest {
  return {
    height: BigInt(0),
    pagination: undefined,
  };
}
export const GetBlockWithTxsRequest = {
  typeUrl: '/cosmos.tx.v1beta1.GetBlockWithTxsRequest',
  encode(
    message: GetBlockWithTxsRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.height !== BigInt(0)) {
      writer.uint32(8).int64(message.height);
    }
    if (message.pagination !== undefined) {
      PageRequest.encode(message.pagination, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): GetBlockWithTxsRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetBlockWithTxsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.height = reader.int64();
          break;
        case 2:
          message.pagination = PageRequest.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GetBlockWithTxsRequest {
    return {
      height: isSet(object.height)
        ? BigInt(object.height.toString())
        : BigInt(0),
      pagination: isSet(object.pagination)
        ? PageRequest.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message: GetBlockWithTxsRequest): JsonSafe<GetBlockWithTxsRequest> {
    const obj: any = {};
    message.height !== undefined &&
      (obj.height = (message.height || BigInt(0)).toString());
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageRequest.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(object: Partial<GetBlockWithTxsRequest>): GetBlockWithTxsRequest {
    const message = createBaseGetBlockWithTxsRequest();
    message.height =
      object.height !== undefined && object.height !== null
        ? BigInt(object.height.toString())
        : BigInt(0);
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageRequest.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: GetBlockWithTxsRequestProtoMsg,
  ): GetBlockWithTxsRequest {
    return GetBlockWithTxsRequest.decode(message.value);
  },
  toProto(message: GetBlockWithTxsRequest): Uint8Array {
    return GetBlockWithTxsRequest.encode(message).finish();
  },
  toProtoMsg(message: GetBlockWithTxsRequest): GetBlockWithTxsRequestProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.GetBlockWithTxsRequest',
      value: GetBlockWithTxsRequest.encode(message).finish(),
    };
  },
};
function createBaseGetBlockWithTxsResponse(): GetBlockWithTxsResponse {
  return {
    txs: [],
    blockId: undefined,
    block: undefined,
    pagination: undefined,
  };
}
export const GetBlockWithTxsResponse = {
  typeUrl: '/cosmos.tx.v1beta1.GetBlockWithTxsResponse',
  encode(
    message: GetBlockWithTxsResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    for (const v of message.txs) {
      Tx.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    if (message.blockId !== undefined) {
      BlockID.encode(message.blockId, writer.uint32(18).fork()).ldelim();
    }
    if (message.block !== undefined) {
      Block.encode(message.block, writer.uint32(26).fork()).ldelim();
    }
    if (message.pagination !== undefined) {
      PageResponse.encode(
        message.pagination,
        writer.uint32(34).fork(),
      ).ldelim();
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): GetBlockWithTxsResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetBlockWithTxsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.txs.push(Tx.decode(reader, reader.uint32()));
          break;
        case 2:
          message.blockId = BlockID.decode(reader, reader.uint32());
          break;
        case 3:
          message.block = Block.decode(reader, reader.uint32());
          break;
        case 4:
          message.pagination = PageResponse.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): GetBlockWithTxsResponse {
    return {
      txs: Array.isArray(object?.txs)
        ? object.txs.map((e: any) => Tx.fromJSON(e))
        : [],
      blockId: isSet(object.blockId)
        ? BlockID.fromJSON(object.blockId)
        : undefined,
      block: isSet(object.block) ? Block.fromJSON(object.block) : undefined,
      pagination: isSet(object.pagination)
        ? PageResponse.fromJSON(object.pagination)
        : undefined,
    };
  },
  toJSON(message: GetBlockWithTxsResponse): JsonSafe<GetBlockWithTxsResponse> {
    const obj: any = {};
    if (message.txs) {
      obj.txs = message.txs.map(e => (e ? Tx.toJSON(e) : undefined));
    } else {
      obj.txs = [];
    }
    message.blockId !== undefined &&
      (obj.blockId = message.blockId
        ? BlockID.toJSON(message.blockId)
        : undefined);
    message.block !== undefined &&
      (obj.block = message.block ? Block.toJSON(message.block) : undefined);
    message.pagination !== undefined &&
      (obj.pagination = message.pagination
        ? PageResponse.toJSON(message.pagination)
        : undefined);
    return obj;
  },
  fromPartial(
    object: Partial<GetBlockWithTxsResponse>,
  ): GetBlockWithTxsResponse {
    const message = createBaseGetBlockWithTxsResponse();
    message.txs = object.txs?.map(e => Tx.fromPartial(e)) || [];
    message.blockId =
      object.blockId !== undefined && object.blockId !== null
        ? BlockID.fromPartial(object.blockId)
        : undefined;
    message.block =
      object.block !== undefined && object.block !== null
        ? Block.fromPartial(object.block)
        : undefined;
    message.pagination =
      object.pagination !== undefined && object.pagination !== null
        ? PageResponse.fromPartial(object.pagination)
        : undefined;
    return message;
  },
  fromProtoMsg(
    message: GetBlockWithTxsResponseProtoMsg,
  ): GetBlockWithTxsResponse {
    return GetBlockWithTxsResponse.decode(message.value);
  },
  toProto(message: GetBlockWithTxsResponse): Uint8Array {
    return GetBlockWithTxsResponse.encode(message).finish();
  },
  toProtoMsg(
    message: GetBlockWithTxsResponse,
  ): GetBlockWithTxsResponseProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.GetBlockWithTxsResponse',
      value: GetBlockWithTxsResponse.encode(message).finish(),
    };
  },
};
function createBaseTxDecodeRequest(): TxDecodeRequest {
  return {
    txBytes: new Uint8Array(),
  };
}
export const TxDecodeRequest = {
  typeUrl: '/cosmos.tx.v1beta1.TxDecodeRequest',
  encode(
    message: TxDecodeRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.txBytes.length !== 0) {
      writer.uint32(10).bytes(message.txBytes);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): TxDecodeRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTxDecodeRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.txBytes = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TxDecodeRequest {
    return {
      txBytes: isSet(object.txBytes)
        ? bytesFromBase64(object.txBytes)
        : new Uint8Array(),
    };
  },
  toJSON(message: TxDecodeRequest): JsonSafe<TxDecodeRequest> {
    const obj: any = {};
    message.txBytes !== undefined &&
      (obj.txBytes = base64FromBytes(
        message.txBytes !== undefined ? message.txBytes : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<TxDecodeRequest>): TxDecodeRequest {
    const message = createBaseTxDecodeRequest();
    message.txBytes = object.txBytes ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: TxDecodeRequestProtoMsg): TxDecodeRequest {
    return TxDecodeRequest.decode(message.value);
  },
  toProto(message: TxDecodeRequest): Uint8Array {
    return TxDecodeRequest.encode(message).finish();
  },
  toProtoMsg(message: TxDecodeRequest): TxDecodeRequestProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.TxDecodeRequest',
      value: TxDecodeRequest.encode(message).finish(),
    };
  },
};
function createBaseTxDecodeResponse(): TxDecodeResponse {
  return {
    tx: undefined,
  };
}
export const TxDecodeResponse = {
  typeUrl: '/cosmos.tx.v1beta1.TxDecodeResponse',
  encode(
    message: TxDecodeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.tx !== undefined) {
      Tx.encode(message.tx, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): TxDecodeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTxDecodeResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.tx = Tx.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TxDecodeResponse {
    return {
      tx: isSet(object.tx) ? Tx.fromJSON(object.tx) : undefined,
    };
  },
  toJSON(message: TxDecodeResponse): JsonSafe<TxDecodeResponse> {
    const obj: any = {};
    message.tx !== undefined &&
      (obj.tx = message.tx ? Tx.toJSON(message.tx) : undefined);
    return obj;
  },
  fromPartial(object: Partial<TxDecodeResponse>): TxDecodeResponse {
    const message = createBaseTxDecodeResponse();
    message.tx =
      object.tx !== undefined && object.tx !== null
        ? Tx.fromPartial(object.tx)
        : undefined;
    return message;
  },
  fromProtoMsg(message: TxDecodeResponseProtoMsg): TxDecodeResponse {
    return TxDecodeResponse.decode(message.value);
  },
  toProto(message: TxDecodeResponse): Uint8Array {
    return TxDecodeResponse.encode(message).finish();
  },
  toProtoMsg(message: TxDecodeResponse): TxDecodeResponseProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.TxDecodeResponse',
      value: TxDecodeResponse.encode(message).finish(),
    };
  },
};
function createBaseTxEncodeRequest(): TxEncodeRequest {
  return {
    tx: undefined,
  };
}
export const TxEncodeRequest = {
  typeUrl: '/cosmos.tx.v1beta1.TxEncodeRequest',
  encode(
    message: TxEncodeRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.tx !== undefined) {
      Tx.encode(message.tx, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): TxEncodeRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTxEncodeRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.tx = Tx.decode(reader, reader.uint32());
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TxEncodeRequest {
    return {
      tx: isSet(object.tx) ? Tx.fromJSON(object.tx) : undefined,
    };
  },
  toJSON(message: TxEncodeRequest): JsonSafe<TxEncodeRequest> {
    const obj: any = {};
    message.tx !== undefined &&
      (obj.tx = message.tx ? Tx.toJSON(message.tx) : undefined);
    return obj;
  },
  fromPartial(object: Partial<TxEncodeRequest>): TxEncodeRequest {
    const message = createBaseTxEncodeRequest();
    message.tx =
      object.tx !== undefined && object.tx !== null
        ? Tx.fromPartial(object.tx)
        : undefined;
    return message;
  },
  fromProtoMsg(message: TxEncodeRequestProtoMsg): TxEncodeRequest {
    return TxEncodeRequest.decode(message.value);
  },
  toProto(message: TxEncodeRequest): Uint8Array {
    return TxEncodeRequest.encode(message).finish();
  },
  toProtoMsg(message: TxEncodeRequest): TxEncodeRequestProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.TxEncodeRequest',
      value: TxEncodeRequest.encode(message).finish(),
    };
  },
};
function createBaseTxEncodeResponse(): TxEncodeResponse {
  return {
    txBytes: new Uint8Array(),
  };
}
export const TxEncodeResponse = {
  typeUrl: '/cosmos.tx.v1beta1.TxEncodeResponse',
  encode(
    message: TxEncodeResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.txBytes.length !== 0) {
      writer.uint32(10).bytes(message.txBytes);
    }
    return writer;
  },
  decode(input: BinaryReader | Uint8Array, length?: number): TxEncodeResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTxEncodeResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.txBytes = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TxEncodeResponse {
    return {
      txBytes: isSet(object.txBytes)
        ? bytesFromBase64(object.txBytes)
        : new Uint8Array(),
    };
  },
  toJSON(message: TxEncodeResponse): JsonSafe<TxEncodeResponse> {
    const obj: any = {};
    message.txBytes !== undefined &&
      (obj.txBytes = base64FromBytes(
        message.txBytes !== undefined ? message.txBytes : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<TxEncodeResponse>): TxEncodeResponse {
    const message = createBaseTxEncodeResponse();
    message.txBytes = object.txBytes ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: TxEncodeResponseProtoMsg): TxEncodeResponse {
    return TxEncodeResponse.decode(message.value);
  },
  toProto(message: TxEncodeResponse): Uint8Array {
    return TxEncodeResponse.encode(message).finish();
  },
  toProtoMsg(message: TxEncodeResponse): TxEncodeResponseProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.TxEncodeResponse',
      value: TxEncodeResponse.encode(message).finish(),
    };
  },
};
function createBaseTxEncodeAminoRequest(): TxEncodeAminoRequest {
  return {
    aminoJson: '',
  };
}
export const TxEncodeAminoRequest = {
  typeUrl: '/cosmos.tx.v1beta1.TxEncodeAminoRequest',
  encode(
    message: TxEncodeAminoRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.aminoJson !== '') {
      writer.uint32(10).string(message.aminoJson);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): TxEncodeAminoRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTxEncodeAminoRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.aminoJson = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TxEncodeAminoRequest {
    return {
      aminoJson: isSet(object.aminoJson) ? String(object.aminoJson) : '',
    };
  },
  toJSON(message: TxEncodeAminoRequest): JsonSafe<TxEncodeAminoRequest> {
    const obj: any = {};
    message.aminoJson !== undefined && (obj.aminoJson = message.aminoJson);
    return obj;
  },
  fromPartial(object: Partial<TxEncodeAminoRequest>): TxEncodeAminoRequest {
    const message = createBaseTxEncodeAminoRequest();
    message.aminoJson = object.aminoJson ?? '';
    return message;
  },
  fromProtoMsg(message: TxEncodeAminoRequestProtoMsg): TxEncodeAminoRequest {
    return TxEncodeAminoRequest.decode(message.value);
  },
  toProto(message: TxEncodeAminoRequest): Uint8Array {
    return TxEncodeAminoRequest.encode(message).finish();
  },
  toProtoMsg(message: TxEncodeAminoRequest): TxEncodeAminoRequestProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.TxEncodeAminoRequest',
      value: TxEncodeAminoRequest.encode(message).finish(),
    };
  },
};
function createBaseTxEncodeAminoResponse(): TxEncodeAminoResponse {
  return {
    aminoBinary: new Uint8Array(),
  };
}
export const TxEncodeAminoResponse = {
  typeUrl: '/cosmos.tx.v1beta1.TxEncodeAminoResponse',
  encode(
    message: TxEncodeAminoResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.aminoBinary.length !== 0) {
      writer.uint32(10).bytes(message.aminoBinary);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): TxEncodeAminoResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTxEncodeAminoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.aminoBinary = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TxEncodeAminoResponse {
    return {
      aminoBinary: isSet(object.aminoBinary)
        ? bytesFromBase64(object.aminoBinary)
        : new Uint8Array(),
    };
  },
  toJSON(message: TxEncodeAminoResponse): JsonSafe<TxEncodeAminoResponse> {
    const obj: any = {};
    message.aminoBinary !== undefined &&
      (obj.aminoBinary = base64FromBytes(
        message.aminoBinary !== undefined
          ? message.aminoBinary
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<TxEncodeAminoResponse>): TxEncodeAminoResponse {
    const message = createBaseTxEncodeAminoResponse();
    message.aminoBinary = object.aminoBinary ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: TxEncodeAminoResponseProtoMsg): TxEncodeAminoResponse {
    return TxEncodeAminoResponse.decode(message.value);
  },
  toProto(message: TxEncodeAminoResponse): Uint8Array {
    return TxEncodeAminoResponse.encode(message).finish();
  },
  toProtoMsg(message: TxEncodeAminoResponse): TxEncodeAminoResponseProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.TxEncodeAminoResponse',
      value: TxEncodeAminoResponse.encode(message).finish(),
    };
  },
};
function createBaseTxDecodeAminoRequest(): TxDecodeAminoRequest {
  return {
    aminoBinary: new Uint8Array(),
  };
}
export const TxDecodeAminoRequest = {
  typeUrl: '/cosmos.tx.v1beta1.TxDecodeAminoRequest',
  encode(
    message: TxDecodeAminoRequest,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.aminoBinary.length !== 0) {
      writer.uint32(10).bytes(message.aminoBinary);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): TxDecodeAminoRequest {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTxDecodeAminoRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.aminoBinary = reader.bytes();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TxDecodeAminoRequest {
    return {
      aminoBinary: isSet(object.aminoBinary)
        ? bytesFromBase64(object.aminoBinary)
        : new Uint8Array(),
    };
  },
  toJSON(message: TxDecodeAminoRequest): JsonSafe<TxDecodeAminoRequest> {
    const obj: any = {};
    message.aminoBinary !== undefined &&
      (obj.aminoBinary = base64FromBytes(
        message.aminoBinary !== undefined
          ? message.aminoBinary
          : new Uint8Array(),
      ));
    return obj;
  },
  fromPartial(object: Partial<TxDecodeAminoRequest>): TxDecodeAminoRequest {
    const message = createBaseTxDecodeAminoRequest();
    message.aminoBinary = object.aminoBinary ?? new Uint8Array();
    return message;
  },
  fromProtoMsg(message: TxDecodeAminoRequestProtoMsg): TxDecodeAminoRequest {
    return TxDecodeAminoRequest.decode(message.value);
  },
  toProto(message: TxDecodeAminoRequest): Uint8Array {
    return TxDecodeAminoRequest.encode(message).finish();
  },
  toProtoMsg(message: TxDecodeAminoRequest): TxDecodeAminoRequestProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.TxDecodeAminoRequest',
      value: TxDecodeAminoRequest.encode(message).finish(),
    };
  },
};
function createBaseTxDecodeAminoResponse(): TxDecodeAminoResponse {
  return {
    aminoJson: '',
  };
}
export const TxDecodeAminoResponse = {
  typeUrl: '/cosmos.tx.v1beta1.TxDecodeAminoResponse',
  encode(
    message: TxDecodeAminoResponse,
    writer: BinaryWriter = BinaryWriter.create(),
  ): BinaryWriter {
    if (message.aminoJson !== '') {
      writer.uint32(10).string(message.aminoJson);
    }
    return writer;
  },
  decode(
    input: BinaryReader | Uint8Array,
    length?: number,
  ): TxDecodeAminoResponse {
    const reader =
      input instanceof BinaryReader ? input : new BinaryReader(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTxDecodeAminoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.aminoJson = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromJSON(object: any): TxDecodeAminoResponse {
    return {
      aminoJson: isSet(object.aminoJson) ? String(object.aminoJson) : '',
    };
  },
  toJSON(message: TxDecodeAminoResponse): JsonSafe<TxDecodeAminoResponse> {
    const obj: any = {};
    message.aminoJson !== undefined && (obj.aminoJson = message.aminoJson);
    return obj;
  },
  fromPartial(object: Partial<TxDecodeAminoResponse>): TxDecodeAminoResponse {
    const message = createBaseTxDecodeAminoResponse();
    message.aminoJson = object.aminoJson ?? '';
    return message;
  },
  fromProtoMsg(message: TxDecodeAminoResponseProtoMsg): TxDecodeAminoResponse {
    return TxDecodeAminoResponse.decode(message.value);
  },
  toProto(message: TxDecodeAminoResponse): Uint8Array {
    return TxDecodeAminoResponse.encode(message).finish();
  },
  toProtoMsg(message: TxDecodeAminoResponse): TxDecodeAminoResponseProtoMsg {
    return {
      typeUrl: '/cosmos.tx.v1beta1.TxDecodeAminoResponse',
      value: TxDecodeAminoResponse.encode(message).finish(),
    };
  },
};
