import { Tx, type TxSDKType } from './tx.js';
import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../base/query/v1beta1/pagination.js';
import { TxResponse, type TxResponseSDKType, GasInfo, type GasInfoSDKType, Result, type ResultSDKType } from '../../base/abci/v1beta1/abci.js';
import { BlockID, type BlockIDSDKType } from '../../../tendermint/types/types.js';
import { Block, type BlockSDKType } from '../../../tendermint/types/block.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/** OrderBy defines the sorting order */
export declare enum OrderBy {
    /**
     * ORDER_BY_UNSPECIFIED - ORDER_BY_UNSPECIFIED specifies an unknown sorting order. OrderBy defaults
     * to ASC in this case.
     */
    ORDER_BY_UNSPECIFIED = 0,
    /** ORDER_BY_ASC - ORDER_BY_ASC defines ascending order */
    ORDER_BY_ASC = 1,
    /** ORDER_BY_DESC - ORDER_BY_DESC defines descending order */
    ORDER_BY_DESC = 2,
    UNRECOGNIZED = -1
}
export declare const OrderBySDKType: typeof OrderBy;
export declare function orderByFromJSON(object: any): OrderBy;
export declare function orderByToJSON(object: OrderBy): string;
/**
 * BroadcastMode specifies the broadcast mode for the TxService.Broadcast RPC
 * method.
 */
export declare enum BroadcastMode {
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
    UNRECOGNIZED = -1
}
export declare const BroadcastModeSDKType: typeof BroadcastMode;
export declare function broadcastModeFromJSON(object: any): BroadcastMode;
export declare function broadcastModeToJSON(object: BroadcastMode): string;
/**
 * GetTxsEventRequest is the request type for the Service.TxsByEvents
 * RPC method.
 * @name GetTxsEventRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetTxsEventRequest
 */
export interface GetTxsEventRequest {
    /**
     * events is the list of transaction event type.
     * Deprecated post v0.47.x: use query instead, which should contain a valid
     * events query.
     * @deprecated
     */
    events: string[];
    /**
     * pagination defines a pagination for the request.
     * Deprecated post v0.46.x: use page and limit instead.
     * @deprecated
     */
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
 * @name GetTxsEventRequestSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetTxsEventRequest
 */
export interface GetTxsEventRequestSDKType {
    /**
     * @deprecated
     */
    events: string[];
    /**
     * @deprecated
     */
    pagination?: PageRequestSDKType;
    order_by: OrderBy;
    page: bigint;
    limit: bigint;
    query: string;
}
/**
 * GetTxsEventResponse is the response type for the Service.TxsByEvents
 * RPC method.
 * @name GetTxsEventResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetTxsEventResponse
 */
export interface GetTxsEventResponse {
    /**
     * txs is the list of queried transactions.
     */
    txs: Tx[];
    /**
     * tx_responses is the list of queried TxResponses.
     */
    txResponses: TxResponse[];
    /**
     * pagination defines a pagination for the response.
     * Deprecated post v0.46.x: use total instead.
     * @deprecated
     */
    pagination?: PageResponse;
    /**
     * total is total number of results available
     */
    total: bigint;
}
export interface GetTxsEventResponseProtoMsg {
    typeUrl: '/cosmos.tx.v1beta1.GetTxsEventResponse';
    value: Uint8Array;
}
/**
 * GetTxsEventResponse is the response type for the Service.TxsByEvents
 * RPC method.
 * @name GetTxsEventResponseSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetTxsEventResponse
 */
export interface GetTxsEventResponseSDKType {
    txs: TxSDKType[];
    tx_responses: TxResponseSDKType[];
    /**
     * @deprecated
     */
    pagination?: PageResponseSDKType;
    total: bigint;
}
/**
 * BroadcastTxRequest is the request type for the Service.BroadcastTxRequest
 * RPC method.
 * @name BroadcastTxRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.BroadcastTxRequest
 */
export interface BroadcastTxRequest {
    /**
     * tx_bytes is the raw transaction.
     */
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
 * @name BroadcastTxRequestSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.BroadcastTxRequest
 */
export interface BroadcastTxRequestSDKType {
    tx_bytes: Uint8Array;
    mode: BroadcastMode;
}
/**
 * BroadcastTxResponse is the response type for the
 * Service.BroadcastTx method.
 * @name BroadcastTxResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.BroadcastTxResponse
 */
export interface BroadcastTxResponse {
    /**
     * tx_response is the queried TxResponses.
     */
    txResponse?: TxResponse;
}
export interface BroadcastTxResponseProtoMsg {
    typeUrl: '/cosmos.tx.v1beta1.BroadcastTxResponse';
    value: Uint8Array;
}
/**
 * BroadcastTxResponse is the response type for the
 * Service.BroadcastTx method.
 * @name BroadcastTxResponseSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.BroadcastTxResponse
 */
export interface BroadcastTxResponseSDKType {
    tx_response?: TxResponseSDKType;
}
/**
 * SimulateRequest is the request type for the Service.Simulate
 * RPC method.
 * @name SimulateRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.SimulateRequest
 */
export interface SimulateRequest {
    /**
     * tx is the transaction to simulate.
     * Deprecated. Send raw tx bytes instead.
     * @deprecated
     */
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
 * @name SimulateRequestSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.SimulateRequest
 */
export interface SimulateRequestSDKType {
    /**
     * @deprecated
     */
    tx?: TxSDKType;
    tx_bytes: Uint8Array;
}
/**
 * SimulateResponse is the response type for the
 * Service.SimulateRPC method.
 * @name SimulateResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.SimulateResponse
 */
export interface SimulateResponse {
    /**
     * gas_info is the information about gas used in the simulation.
     */
    gasInfo?: GasInfo;
    /**
     * result is the result of the simulation.
     */
    result?: Result;
}
export interface SimulateResponseProtoMsg {
    typeUrl: '/cosmos.tx.v1beta1.SimulateResponse';
    value: Uint8Array;
}
/**
 * SimulateResponse is the response type for the
 * Service.SimulateRPC method.
 * @name SimulateResponseSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.SimulateResponse
 */
export interface SimulateResponseSDKType {
    gas_info?: GasInfoSDKType;
    result?: ResultSDKType;
}
/**
 * GetTxRequest is the request type for the Service.GetTx
 * RPC method.
 * @name GetTxRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetTxRequest
 */
export interface GetTxRequest {
    /**
     * hash is the tx hash to query, encoded as a hex string.
     */
    hash: string;
}
export interface GetTxRequestProtoMsg {
    typeUrl: '/cosmos.tx.v1beta1.GetTxRequest';
    value: Uint8Array;
}
/**
 * GetTxRequest is the request type for the Service.GetTx
 * RPC method.
 * @name GetTxRequestSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetTxRequest
 */
export interface GetTxRequestSDKType {
    hash: string;
}
/**
 * GetTxResponse is the response type for the Service.GetTx method.
 * @name GetTxResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetTxResponse
 */
export interface GetTxResponse {
    /**
     * tx is the queried transaction.
     */
    tx?: Tx;
    /**
     * tx_response is the queried TxResponses.
     */
    txResponse?: TxResponse;
}
export interface GetTxResponseProtoMsg {
    typeUrl: '/cosmos.tx.v1beta1.GetTxResponse';
    value: Uint8Array;
}
/**
 * GetTxResponse is the response type for the Service.GetTx method.
 * @name GetTxResponseSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetTxResponse
 */
export interface GetTxResponseSDKType {
    tx?: TxSDKType;
    tx_response?: TxResponseSDKType;
}
/**
 * GetBlockWithTxsRequest is the request type for the Service.GetBlockWithTxs
 * RPC method.
 *
 * Since: cosmos-sdk 0.45.2
 * @name GetBlockWithTxsRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetBlockWithTxsRequest
 */
export interface GetBlockWithTxsRequest {
    /**
     * height is the height of the block to query.
     */
    height: bigint;
    /**
     * pagination defines a pagination for the request.
     */
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
 * @name GetBlockWithTxsRequestSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetBlockWithTxsRequest
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
 * @name GetBlockWithTxsResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetBlockWithTxsResponse
 */
export interface GetBlockWithTxsResponse {
    /**
     * txs are the transactions in the block.
     */
    txs: Tx[];
    blockId?: BlockID;
    block?: Block;
    /**
     * pagination defines a pagination for the response.
     */
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
 * @name GetBlockWithTxsResponseSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetBlockWithTxsResponse
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
 * @name TxDecodeRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxDecodeRequest
 */
export interface TxDecodeRequest {
    /**
     * tx_bytes is the raw transaction.
     */
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
 * @name TxDecodeRequestSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxDecodeRequest
 */
export interface TxDecodeRequestSDKType {
    tx_bytes: Uint8Array;
}
/**
 * TxDecodeResponse is the response type for the
 * Service.TxDecode method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxDecodeResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxDecodeResponse
 */
export interface TxDecodeResponse {
    /**
     * tx is the decoded transaction.
     */
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
 * @name TxDecodeResponseSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxDecodeResponse
 */
export interface TxDecodeResponseSDKType {
    tx?: TxSDKType;
}
/**
 * TxEncodeRequest is the request type for the Service.TxEncode
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxEncodeRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxEncodeRequest
 */
export interface TxEncodeRequest {
    /**
     * tx is the transaction to encode.
     */
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
 * @name TxEncodeRequestSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxEncodeRequest
 */
export interface TxEncodeRequestSDKType {
    tx?: TxSDKType;
}
/**
 * TxEncodeResponse is the response type for the
 * Service.TxEncode method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxEncodeResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxEncodeResponse
 */
export interface TxEncodeResponse {
    /**
     * tx_bytes is the encoded transaction bytes.
     */
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
 * @name TxEncodeResponseSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxEncodeResponse
 */
export interface TxEncodeResponseSDKType {
    tx_bytes: Uint8Array;
}
/**
 * TxEncodeAminoRequest is the request type for the Service.TxEncodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxEncodeAminoRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxEncodeAminoRequest
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
 * @name TxEncodeAminoRequestSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxEncodeAminoRequest
 */
export interface TxEncodeAminoRequestSDKType {
    amino_json: string;
}
/**
 * TxEncodeAminoResponse is the response type for the Service.TxEncodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxEncodeAminoResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxEncodeAminoResponse
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
 * @name TxEncodeAminoResponseSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxEncodeAminoResponse
 */
export interface TxEncodeAminoResponseSDKType {
    amino_binary: Uint8Array;
}
/**
 * TxDecodeAminoRequest is the request type for the Service.TxDecodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxDecodeAminoRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxDecodeAminoRequest
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
 * @name TxDecodeAminoRequestSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxDecodeAminoRequest
 */
export interface TxDecodeAminoRequestSDKType {
    amino_binary: Uint8Array;
}
/**
 * TxDecodeAminoResponse is the response type for the Service.TxDecodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxDecodeAminoResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxDecodeAminoResponse
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
 * @name TxDecodeAminoResponseSDKType
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxDecodeAminoResponse
 */
export interface TxDecodeAminoResponseSDKType {
    amino_json: string;
}
/**
 * GetTxsEventRequest is the request type for the Service.TxsByEvents
 * RPC method.
 * @name GetTxsEventRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetTxsEventRequest
 */
export declare const GetTxsEventRequest: {
    typeUrl: "/cosmos.tx.v1beta1.GetTxsEventRequest";
    aminoType: "cosmos-sdk/GetTxsEventRequest";
    is(o: any): o is GetTxsEventRequest;
    isSDK(o: any): o is GetTxsEventRequestSDKType;
    encode(message: GetTxsEventRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GetTxsEventRequest;
    fromJSON(object: any): GetTxsEventRequest;
    toJSON(message: GetTxsEventRequest): JsonSafe<GetTxsEventRequest>;
    fromPartial(object: Partial<GetTxsEventRequest>): GetTxsEventRequest;
    fromProtoMsg(message: GetTxsEventRequestProtoMsg): GetTxsEventRequest;
    toProto(message: GetTxsEventRequest): Uint8Array;
    toProtoMsg(message: GetTxsEventRequest): GetTxsEventRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * GetTxsEventResponse is the response type for the Service.TxsByEvents
 * RPC method.
 * @name GetTxsEventResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetTxsEventResponse
 */
export declare const GetTxsEventResponse: {
    typeUrl: "/cosmos.tx.v1beta1.GetTxsEventResponse";
    aminoType: "cosmos-sdk/GetTxsEventResponse";
    is(o: any): o is GetTxsEventResponse;
    isSDK(o: any): o is GetTxsEventResponseSDKType;
    encode(message: GetTxsEventResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GetTxsEventResponse;
    fromJSON(object: any): GetTxsEventResponse;
    toJSON(message: GetTxsEventResponse): JsonSafe<GetTxsEventResponse>;
    fromPartial(object: Partial<GetTxsEventResponse>): GetTxsEventResponse;
    fromProtoMsg(message: GetTxsEventResponseProtoMsg): GetTxsEventResponse;
    toProto(message: GetTxsEventResponse): Uint8Array;
    toProtoMsg(message: GetTxsEventResponse): GetTxsEventResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * BroadcastTxRequest is the request type for the Service.BroadcastTxRequest
 * RPC method.
 * @name BroadcastTxRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.BroadcastTxRequest
 */
export declare const BroadcastTxRequest: {
    typeUrl: "/cosmos.tx.v1beta1.BroadcastTxRequest";
    aminoType: "cosmos-sdk/BroadcastTxRequest";
    is(o: any): o is BroadcastTxRequest;
    isSDK(o: any): o is BroadcastTxRequestSDKType;
    encode(message: BroadcastTxRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): BroadcastTxRequest;
    fromJSON(object: any): BroadcastTxRequest;
    toJSON(message: BroadcastTxRequest): JsonSafe<BroadcastTxRequest>;
    fromPartial(object: Partial<BroadcastTxRequest>): BroadcastTxRequest;
    fromProtoMsg(message: BroadcastTxRequestProtoMsg): BroadcastTxRequest;
    toProto(message: BroadcastTxRequest): Uint8Array;
    toProtoMsg(message: BroadcastTxRequest): BroadcastTxRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * BroadcastTxResponse is the response type for the
 * Service.BroadcastTx method.
 * @name BroadcastTxResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.BroadcastTxResponse
 */
export declare const BroadcastTxResponse: {
    typeUrl: "/cosmos.tx.v1beta1.BroadcastTxResponse";
    aminoType: "cosmos-sdk/BroadcastTxResponse";
    is(o: any): o is BroadcastTxResponse;
    isSDK(o: any): o is BroadcastTxResponseSDKType;
    encode(message: BroadcastTxResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): BroadcastTxResponse;
    fromJSON(object: any): BroadcastTxResponse;
    toJSON(message: BroadcastTxResponse): JsonSafe<BroadcastTxResponse>;
    fromPartial(object: Partial<BroadcastTxResponse>): BroadcastTxResponse;
    fromProtoMsg(message: BroadcastTxResponseProtoMsg): BroadcastTxResponse;
    toProto(message: BroadcastTxResponse): Uint8Array;
    toProtoMsg(message: BroadcastTxResponse): BroadcastTxResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * SimulateRequest is the request type for the Service.Simulate
 * RPC method.
 * @name SimulateRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.SimulateRequest
 */
export declare const SimulateRequest: {
    typeUrl: "/cosmos.tx.v1beta1.SimulateRequest";
    aminoType: "cosmos-sdk/SimulateRequest";
    is(o: any): o is SimulateRequest;
    isSDK(o: any): o is SimulateRequestSDKType;
    encode(message: SimulateRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SimulateRequest;
    fromJSON(object: any): SimulateRequest;
    toJSON(message: SimulateRequest): JsonSafe<SimulateRequest>;
    fromPartial(object: Partial<SimulateRequest>): SimulateRequest;
    fromProtoMsg(message: SimulateRequestProtoMsg): SimulateRequest;
    toProto(message: SimulateRequest): Uint8Array;
    toProtoMsg(message: SimulateRequest): SimulateRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * SimulateResponse is the response type for the
 * Service.SimulateRPC method.
 * @name SimulateResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.SimulateResponse
 */
export declare const SimulateResponse: {
    typeUrl: "/cosmos.tx.v1beta1.SimulateResponse";
    aminoType: "cosmos-sdk/SimulateResponse";
    is(o: any): o is SimulateResponse;
    isSDK(o: any): o is SimulateResponseSDKType;
    encode(message: SimulateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): SimulateResponse;
    fromJSON(object: any): SimulateResponse;
    toJSON(message: SimulateResponse): JsonSafe<SimulateResponse>;
    fromPartial(object: Partial<SimulateResponse>): SimulateResponse;
    fromProtoMsg(message: SimulateResponseProtoMsg): SimulateResponse;
    toProto(message: SimulateResponse): Uint8Array;
    toProtoMsg(message: SimulateResponse): SimulateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * GetTxRequest is the request type for the Service.GetTx
 * RPC method.
 * @name GetTxRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetTxRequest
 */
export declare const GetTxRequest: {
    typeUrl: "/cosmos.tx.v1beta1.GetTxRequest";
    aminoType: "cosmos-sdk/GetTxRequest";
    is(o: any): o is GetTxRequest;
    isSDK(o: any): o is GetTxRequestSDKType;
    encode(message: GetTxRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GetTxRequest;
    fromJSON(object: any): GetTxRequest;
    toJSON(message: GetTxRequest): JsonSafe<GetTxRequest>;
    fromPartial(object: Partial<GetTxRequest>): GetTxRequest;
    fromProtoMsg(message: GetTxRequestProtoMsg): GetTxRequest;
    toProto(message: GetTxRequest): Uint8Array;
    toProtoMsg(message: GetTxRequest): GetTxRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * GetTxResponse is the response type for the Service.GetTx method.
 * @name GetTxResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetTxResponse
 */
export declare const GetTxResponse: {
    typeUrl: "/cosmos.tx.v1beta1.GetTxResponse";
    aminoType: "cosmos-sdk/GetTxResponse";
    is(o: any): o is GetTxResponse;
    isSDK(o: any): o is GetTxResponseSDKType;
    encode(message: GetTxResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GetTxResponse;
    fromJSON(object: any): GetTxResponse;
    toJSON(message: GetTxResponse): JsonSafe<GetTxResponse>;
    fromPartial(object: Partial<GetTxResponse>): GetTxResponse;
    fromProtoMsg(message: GetTxResponseProtoMsg): GetTxResponse;
    toProto(message: GetTxResponse): Uint8Array;
    toProtoMsg(message: GetTxResponse): GetTxResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * GetBlockWithTxsRequest is the request type for the Service.GetBlockWithTxs
 * RPC method.
 *
 * Since: cosmos-sdk 0.45.2
 * @name GetBlockWithTxsRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetBlockWithTxsRequest
 */
export declare const GetBlockWithTxsRequest: {
    typeUrl: "/cosmos.tx.v1beta1.GetBlockWithTxsRequest";
    aminoType: "cosmos-sdk/GetBlockWithTxsRequest";
    is(o: any): o is GetBlockWithTxsRequest;
    isSDK(o: any): o is GetBlockWithTxsRequestSDKType;
    encode(message: GetBlockWithTxsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GetBlockWithTxsRequest;
    fromJSON(object: any): GetBlockWithTxsRequest;
    toJSON(message: GetBlockWithTxsRequest): JsonSafe<GetBlockWithTxsRequest>;
    fromPartial(object: Partial<GetBlockWithTxsRequest>): GetBlockWithTxsRequest;
    fromProtoMsg(message: GetBlockWithTxsRequestProtoMsg): GetBlockWithTxsRequest;
    toProto(message: GetBlockWithTxsRequest): Uint8Array;
    toProtoMsg(message: GetBlockWithTxsRequest): GetBlockWithTxsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * GetBlockWithTxsResponse is the response type for the Service.GetBlockWithTxs
 * method.
 *
 * Since: cosmos-sdk 0.45.2
 * @name GetBlockWithTxsResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.GetBlockWithTxsResponse
 */
export declare const GetBlockWithTxsResponse: {
    typeUrl: "/cosmos.tx.v1beta1.GetBlockWithTxsResponse";
    aminoType: "cosmos-sdk/GetBlockWithTxsResponse";
    is(o: any): o is GetBlockWithTxsResponse;
    isSDK(o: any): o is GetBlockWithTxsResponseSDKType;
    encode(message: GetBlockWithTxsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): GetBlockWithTxsResponse;
    fromJSON(object: any): GetBlockWithTxsResponse;
    toJSON(message: GetBlockWithTxsResponse): JsonSafe<GetBlockWithTxsResponse>;
    fromPartial(object: Partial<GetBlockWithTxsResponse>): GetBlockWithTxsResponse;
    fromProtoMsg(message: GetBlockWithTxsResponseProtoMsg): GetBlockWithTxsResponse;
    toProto(message: GetBlockWithTxsResponse): Uint8Array;
    toProtoMsg(message: GetBlockWithTxsResponse): GetBlockWithTxsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TxDecodeRequest is the request type for the Service.TxDecode
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxDecodeRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxDecodeRequest
 */
export declare const TxDecodeRequest: {
    typeUrl: "/cosmos.tx.v1beta1.TxDecodeRequest";
    aminoType: "cosmos-sdk/TxDecodeRequest";
    is(o: any): o is TxDecodeRequest;
    isSDK(o: any): o is TxDecodeRequestSDKType;
    encode(message: TxDecodeRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TxDecodeRequest;
    fromJSON(object: any): TxDecodeRequest;
    toJSON(message: TxDecodeRequest): JsonSafe<TxDecodeRequest>;
    fromPartial(object: Partial<TxDecodeRequest>): TxDecodeRequest;
    fromProtoMsg(message: TxDecodeRequestProtoMsg): TxDecodeRequest;
    toProto(message: TxDecodeRequest): Uint8Array;
    toProtoMsg(message: TxDecodeRequest): TxDecodeRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TxDecodeResponse is the response type for the
 * Service.TxDecode method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxDecodeResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxDecodeResponse
 */
export declare const TxDecodeResponse: {
    typeUrl: "/cosmos.tx.v1beta1.TxDecodeResponse";
    aminoType: "cosmos-sdk/TxDecodeResponse";
    is(o: any): o is TxDecodeResponse;
    isSDK(o: any): o is TxDecodeResponseSDKType;
    encode(message: TxDecodeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TxDecodeResponse;
    fromJSON(object: any): TxDecodeResponse;
    toJSON(message: TxDecodeResponse): JsonSafe<TxDecodeResponse>;
    fromPartial(object: Partial<TxDecodeResponse>): TxDecodeResponse;
    fromProtoMsg(message: TxDecodeResponseProtoMsg): TxDecodeResponse;
    toProto(message: TxDecodeResponse): Uint8Array;
    toProtoMsg(message: TxDecodeResponse): TxDecodeResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TxEncodeRequest is the request type for the Service.TxEncode
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxEncodeRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxEncodeRequest
 */
export declare const TxEncodeRequest: {
    typeUrl: "/cosmos.tx.v1beta1.TxEncodeRequest";
    aminoType: "cosmos-sdk/TxEncodeRequest";
    is(o: any): o is TxEncodeRequest;
    isSDK(o: any): o is TxEncodeRequestSDKType;
    encode(message: TxEncodeRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TxEncodeRequest;
    fromJSON(object: any): TxEncodeRequest;
    toJSON(message: TxEncodeRequest): JsonSafe<TxEncodeRequest>;
    fromPartial(object: Partial<TxEncodeRequest>): TxEncodeRequest;
    fromProtoMsg(message: TxEncodeRequestProtoMsg): TxEncodeRequest;
    toProto(message: TxEncodeRequest): Uint8Array;
    toProtoMsg(message: TxEncodeRequest): TxEncodeRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TxEncodeResponse is the response type for the
 * Service.TxEncode method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxEncodeResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxEncodeResponse
 */
export declare const TxEncodeResponse: {
    typeUrl: "/cosmos.tx.v1beta1.TxEncodeResponse";
    aminoType: "cosmos-sdk/TxEncodeResponse";
    is(o: any): o is TxEncodeResponse;
    isSDK(o: any): o is TxEncodeResponseSDKType;
    encode(message: TxEncodeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TxEncodeResponse;
    fromJSON(object: any): TxEncodeResponse;
    toJSON(message: TxEncodeResponse): JsonSafe<TxEncodeResponse>;
    fromPartial(object: Partial<TxEncodeResponse>): TxEncodeResponse;
    fromProtoMsg(message: TxEncodeResponseProtoMsg): TxEncodeResponse;
    toProto(message: TxEncodeResponse): Uint8Array;
    toProtoMsg(message: TxEncodeResponse): TxEncodeResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TxEncodeAminoRequest is the request type for the Service.TxEncodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxEncodeAminoRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxEncodeAminoRequest
 */
export declare const TxEncodeAminoRequest: {
    typeUrl: "/cosmos.tx.v1beta1.TxEncodeAminoRequest";
    aminoType: "cosmos-sdk/TxEncodeAminoRequest";
    is(o: any): o is TxEncodeAminoRequest;
    isSDK(o: any): o is TxEncodeAminoRequestSDKType;
    encode(message: TxEncodeAminoRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TxEncodeAminoRequest;
    fromJSON(object: any): TxEncodeAminoRequest;
    toJSON(message: TxEncodeAminoRequest): JsonSafe<TxEncodeAminoRequest>;
    fromPartial(object: Partial<TxEncodeAminoRequest>): TxEncodeAminoRequest;
    fromProtoMsg(message: TxEncodeAminoRequestProtoMsg): TxEncodeAminoRequest;
    toProto(message: TxEncodeAminoRequest): Uint8Array;
    toProtoMsg(message: TxEncodeAminoRequest): TxEncodeAminoRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TxEncodeAminoResponse is the response type for the Service.TxEncodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxEncodeAminoResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxEncodeAminoResponse
 */
export declare const TxEncodeAminoResponse: {
    typeUrl: "/cosmos.tx.v1beta1.TxEncodeAminoResponse";
    aminoType: "cosmos-sdk/TxEncodeAminoResponse";
    is(o: any): o is TxEncodeAminoResponse;
    isSDK(o: any): o is TxEncodeAminoResponseSDKType;
    encode(message: TxEncodeAminoResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TxEncodeAminoResponse;
    fromJSON(object: any): TxEncodeAminoResponse;
    toJSON(message: TxEncodeAminoResponse): JsonSafe<TxEncodeAminoResponse>;
    fromPartial(object: Partial<TxEncodeAminoResponse>): TxEncodeAminoResponse;
    fromProtoMsg(message: TxEncodeAminoResponseProtoMsg): TxEncodeAminoResponse;
    toProto(message: TxEncodeAminoResponse): Uint8Array;
    toProtoMsg(message: TxEncodeAminoResponse): TxEncodeAminoResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TxDecodeAminoRequest is the request type for the Service.TxDecodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxDecodeAminoRequest
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxDecodeAminoRequest
 */
export declare const TxDecodeAminoRequest: {
    typeUrl: "/cosmos.tx.v1beta1.TxDecodeAminoRequest";
    aminoType: "cosmos-sdk/TxDecodeAminoRequest";
    is(o: any): o is TxDecodeAminoRequest;
    isSDK(o: any): o is TxDecodeAminoRequestSDKType;
    encode(message: TxDecodeAminoRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TxDecodeAminoRequest;
    fromJSON(object: any): TxDecodeAminoRequest;
    toJSON(message: TxDecodeAminoRequest): JsonSafe<TxDecodeAminoRequest>;
    fromPartial(object: Partial<TxDecodeAminoRequest>): TxDecodeAminoRequest;
    fromProtoMsg(message: TxDecodeAminoRequestProtoMsg): TxDecodeAminoRequest;
    toProto(message: TxDecodeAminoRequest): Uint8Array;
    toProtoMsg(message: TxDecodeAminoRequest): TxDecodeAminoRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * TxDecodeAminoResponse is the response type for the Service.TxDecodeAmino
 * RPC method.
 *
 * Since: cosmos-sdk 0.47
 * @name TxDecodeAminoResponse
 * @package cosmos.tx.v1beta1
 * @see proto type: cosmos.tx.v1beta1.TxDecodeAminoResponse
 */
export declare const TxDecodeAminoResponse: {
    typeUrl: "/cosmos.tx.v1beta1.TxDecodeAminoResponse";
    aminoType: "cosmos-sdk/TxDecodeAminoResponse";
    is(o: any): o is TxDecodeAminoResponse;
    isSDK(o: any): o is TxDecodeAminoResponseSDKType;
    encode(message: TxDecodeAminoResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): TxDecodeAminoResponse;
    fromJSON(object: any): TxDecodeAminoResponse;
    toJSON(message: TxDecodeAminoResponse): JsonSafe<TxDecodeAminoResponse>;
    fromPartial(object: Partial<TxDecodeAminoResponse>): TxDecodeAminoResponse;
    fromProtoMsg(message: TxDecodeAminoResponseProtoMsg): TxDecodeAminoResponse;
    toProto(message: TxDecodeAminoResponse): Uint8Array;
    toProtoMsg(message: TxDecodeAminoResponse): TxDecodeAminoResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=service.d.ts.map