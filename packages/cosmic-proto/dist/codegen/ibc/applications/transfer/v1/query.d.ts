import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../../../cosmos/base/query/v1beta1/pagination.js';
import { DenomTrace, type DenomTraceSDKType, Params, type ParamsSDKType } from './transfer.js';
import { Coin, type CoinSDKType } from '../../../../cosmos/base/v1beta1/coin.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * QueryDenomTraceRequest is the request type for the Query/DenomTrace RPC
 * method
 * @name QueryDenomTraceRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomTraceRequest
 */
export interface QueryDenomTraceRequest {
    /**
     * hash (in hex format) or denom (full denom with ibc prefix) of the denomination trace information.
     */
    hash: string;
}
export interface QueryDenomTraceRequestProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.QueryDenomTraceRequest';
    value: Uint8Array;
}
/**
 * QueryDenomTraceRequest is the request type for the Query/DenomTrace RPC
 * method
 * @name QueryDenomTraceRequestSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomTraceRequest
 */
export interface QueryDenomTraceRequestSDKType {
    hash: string;
}
/**
 * QueryDenomTraceResponse is the response type for the Query/DenomTrace RPC
 * method.
 * @name QueryDenomTraceResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomTraceResponse
 */
export interface QueryDenomTraceResponse {
    /**
     * denom_trace returns the requested denomination trace information.
     */
    denomTrace?: DenomTrace;
}
export interface QueryDenomTraceResponseProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.QueryDenomTraceResponse';
    value: Uint8Array;
}
/**
 * QueryDenomTraceResponse is the response type for the Query/DenomTrace RPC
 * method.
 * @name QueryDenomTraceResponseSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomTraceResponse
 */
export interface QueryDenomTraceResponseSDKType {
    denom_trace?: DenomTraceSDKType;
}
/**
 * QueryConnectionsRequest is the request type for the Query/DenomTraces RPC
 * method
 * @name QueryDenomTracesRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomTracesRequest
 */
export interface QueryDenomTracesRequest {
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryDenomTracesRequestProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.QueryDenomTracesRequest';
    value: Uint8Array;
}
/**
 * QueryConnectionsRequest is the request type for the Query/DenomTraces RPC
 * method
 * @name QueryDenomTracesRequestSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomTracesRequest
 */
export interface QueryDenomTracesRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * QueryConnectionsResponse is the response type for the Query/DenomTraces RPC
 * method.
 * @name QueryDenomTracesResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomTracesResponse
 */
export interface QueryDenomTracesResponse {
    /**
     * denom_traces returns all denominations trace information.
     */
    denomTraces: DenomTrace[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryDenomTracesResponseProtoMsg {
    typeUrl: '/ibc.applications.transfer.v1.QueryDenomTracesResponse';
    value: Uint8Array;
}
/**
 * QueryConnectionsResponse is the response type for the Query/DenomTraces RPC
 * method.
 * @name QueryDenomTracesResponseSDKType
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomTracesResponse
 */
export interface QueryDenomTracesResponseSDKType {
    denom_traces: DenomTraceSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
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
export interface QueryParamsRequestSDKType {
}
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
/**
 * QueryDenomTraceRequest is the request type for the Query/DenomTrace RPC
 * method
 * @name QueryDenomTraceRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomTraceRequest
 */
export declare const QueryDenomTraceRequest: {
    typeUrl: "/ibc.applications.transfer.v1.QueryDenomTraceRequest";
    aminoType: "cosmos-sdk/QueryDenomTraceRequest";
    is(o: any): o is QueryDenomTraceRequest;
    isSDK(o: any): o is QueryDenomTraceRequestSDKType;
    encode(message: QueryDenomTraceRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomTraceRequest;
    fromJSON(object: any): QueryDenomTraceRequest;
    toJSON(message: QueryDenomTraceRequest): JsonSafe<QueryDenomTraceRequest>;
    fromPartial(object: Partial<QueryDenomTraceRequest>): QueryDenomTraceRequest;
    fromProtoMsg(message: QueryDenomTraceRequestProtoMsg): QueryDenomTraceRequest;
    toProto(message: QueryDenomTraceRequest): Uint8Array;
    toProtoMsg(message: QueryDenomTraceRequest): QueryDenomTraceRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDenomTraceResponse is the response type for the Query/DenomTrace RPC
 * method.
 * @name QueryDenomTraceResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomTraceResponse
 */
export declare const QueryDenomTraceResponse: {
    typeUrl: "/ibc.applications.transfer.v1.QueryDenomTraceResponse";
    aminoType: "cosmos-sdk/QueryDenomTraceResponse";
    is(o: any): o is QueryDenomTraceResponse;
    isSDK(o: any): o is QueryDenomTraceResponseSDKType;
    encode(message: QueryDenomTraceResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomTraceResponse;
    fromJSON(object: any): QueryDenomTraceResponse;
    toJSON(message: QueryDenomTraceResponse): JsonSafe<QueryDenomTraceResponse>;
    fromPartial(object: Partial<QueryDenomTraceResponse>): QueryDenomTraceResponse;
    fromProtoMsg(message: QueryDenomTraceResponseProtoMsg): QueryDenomTraceResponse;
    toProto(message: QueryDenomTraceResponse): Uint8Array;
    toProtoMsg(message: QueryDenomTraceResponse): QueryDenomTraceResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryConnectionsRequest is the request type for the Query/DenomTraces RPC
 * method
 * @name QueryDenomTracesRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomTracesRequest
 */
export declare const QueryDenomTracesRequest: {
    typeUrl: "/ibc.applications.transfer.v1.QueryDenomTracesRequest";
    aminoType: "cosmos-sdk/QueryDenomTracesRequest";
    is(o: any): o is QueryDenomTracesRequest;
    isSDK(o: any): o is QueryDenomTracesRequestSDKType;
    encode(message: QueryDenomTracesRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomTracesRequest;
    fromJSON(object: any): QueryDenomTracesRequest;
    toJSON(message: QueryDenomTracesRequest): JsonSafe<QueryDenomTracesRequest>;
    fromPartial(object: Partial<QueryDenomTracesRequest>): QueryDenomTracesRequest;
    fromProtoMsg(message: QueryDenomTracesRequestProtoMsg): QueryDenomTracesRequest;
    toProto(message: QueryDenomTracesRequest): Uint8Array;
    toProtoMsg(message: QueryDenomTracesRequest): QueryDenomTracesRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryConnectionsResponse is the response type for the Query/DenomTraces RPC
 * method.
 * @name QueryDenomTracesResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomTracesResponse
 */
export declare const QueryDenomTracesResponse: {
    typeUrl: "/ibc.applications.transfer.v1.QueryDenomTracesResponse";
    aminoType: "cosmos-sdk/QueryDenomTracesResponse";
    is(o: any): o is QueryDenomTracesResponse;
    isSDK(o: any): o is QueryDenomTracesResponseSDKType;
    encode(message: QueryDenomTracesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomTracesResponse;
    fromJSON(object: any): QueryDenomTracesResponse;
    toJSON(message: QueryDenomTracesResponse): JsonSafe<QueryDenomTracesResponse>;
    fromPartial(object: Partial<QueryDenomTracesResponse>): QueryDenomTracesResponse;
    fromProtoMsg(message: QueryDenomTracesResponseProtoMsg): QueryDenomTracesResponse;
    toProto(message: QueryDenomTracesResponse): Uint8Array;
    toProtoMsg(message: QueryDenomTracesResponse): QueryDenomTracesResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/ibc.applications.transfer.v1.QueryParamsRequest";
    aminoType: "cosmos-sdk/QueryParamsRequest";
    is(o: any): o is QueryParamsRequest;
    isSDK(o: any): o is QueryParamsRequestSDKType;
    encode(_: QueryParamsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryParamsRequest;
    fromJSON(_: any): QueryParamsRequest;
    toJSON(_: QueryParamsRequest): JsonSafe<QueryParamsRequest>;
    fromPartial(_: Partial<QueryParamsRequest>): QueryParamsRequest;
    fromProtoMsg(message: QueryParamsRequestProtoMsg): QueryParamsRequest;
    toProto(message: QueryParamsRequest): Uint8Array;
    toProtoMsg(message: QueryParamsRequest): QueryParamsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/ibc.applications.transfer.v1.QueryParamsResponse";
    aminoType: "cosmos-sdk/QueryParamsResponse";
    is(o: any): o is QueryParamsResponse;
    isSDK(o: any): o is QueryParamsResponseSDKType;
    encode(message: QueryParamsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryParamsResponse;
    fromJSON(object: any): QueryParamsResponse;
    toJSON(message: QueryParamsResponse): JsonSafe<QueryParamsResponse>;
    fromPartial(object: Partial<QueryParamsResponse>): QueryParamsResponse;
    fromProtoMsg(message: QueryParamsResponseProtoMsg): QueryParamsResponse;
    toProto(message: QueryParamsResponse): Uint8Array;
    toProtoMsg(message: QueryParamsResponse): QueryParamsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDenomHashRequest is the request type for the Query/DenomHash RPC
 * method
 * @name QueryDenomHashRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomHashRequest
 */
export declare const QueryDenomHashRequest: {
    typeUrl: "/ibc.applications.transfer.v1.QueryDenomHashRequest";
    aminoType: "cosmos-sdk/QueryDenomHashRequest";
    is(o: any): o is QueryDenomHashRequest;
    isSDK(o: any): o is QueryDenomHashRequestSDKType;
    encode(message: QueryDenomHashRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomHashRequest;
    fromJSON(object: any): QueryDenomHashRequest;
    toJSON(message: QueryDenomHashRequest): JsonSafe<QueryDenomHashRequest>;
    fromPartial(object: Partial<QueryDenomHashRequest>): QueryDenomHashRequest;
    fromProtoMsg(message: QueryDenomHashRequestProtoMsg): QueryDenomHashRequest;
    toProto(message: QueryDenomHashRequest): Uint8Array;
    toProtoMsg(message: QueryDenomHashRequest): QueryDenomHashRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDenomHashResponse is the response type for the Query/DenomHash RPC
 * method.
 * @name QueryDenomHashResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryDenomHashResponse
 */
export declare const QueryDenomHashResponse: {
    typeUrl: "/ibc.applications.transfer.v1.QueryDenomHashResponse";
    aminoType: "cosmos-sdk/QueryDenomHashResponse";
    is(o: any): o is QueryDenomHashResponse;
    isSDK(o: any): o is QueryDenomHashResponseSDKType;
    encode(message: QueryDenomHashResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomHashResponse;
    fromJSON(object: any): QueryDenomHashResponse;
    toJSON(message: QueryDenomHashResponse): JsonSafe<QueryDenomHashResponse>;
    fromPartial(object: Partial<QueryDenomHashResponse>): QueryDenomHashResponse;
    fromProtoMsg(message: QueryDenomHashResponseProtoMsg): QueryDenomHashResponse;
    toProto(message: QueryDenomHashResponse): Uint8Array;
    toProtoMsg(message: QueryDenomHashResponse): QueryDenomHashResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryEscrowAddressRequest is the request type for the EscrowAddress RPC method.
 * @name QueryEscrowAddressRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryEscrowAddressRequest
 */
export declare const QueryEscrowAddressRequest: {
    typeUrl: "/ibc.applications.transfer.v1.QueryEscrowAddressRequest";
    aminoType: "cosmos-sdk/QueryEscrowAddressRequest";
    is(o: any): o is QueryEscrowAddressRequest;
    isSDK(o: any): o is QueryEscrowAddressRequestSDKType;
    encode(message: QueryEscrowAddressRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryEscrowAddressRequest;
    fromJSON(object: any): QueryEscrowAddressRequest;
    toJSON(message: QueryEscrowAddressRequest): JsonSafe<QueryEscrowAddressRequest>;
    fromPartial(object: Partial<QueryEscrowAddressRequest>): QueryEscrowAddressRequest;
    fromProtoMsg(message: QueryEscrowAddressRequestProtoMsg): QueryEscrowAddressRequest;
    toProto(message: QueryEscrowAddressRequest): Uint8Array;
    toProtoMsg(message: QueryEscrowAddressRequest): QueryEscrowAddressRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryEscrowAddressResponse is the response type of the EscrowAddress RPC method.
 * @name QueryEscrowAddressResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryEscrowAddressResponse
 */
export declare const QueryEscrowAddressResponse: {
    typeUrl: "/ibc.applications.transfer.v1.QueryEscrowAddressResponse";
    aminoType: "cosmos-sdk/QueryEscrowAddressResponse";
    is(o: any): o is QueryEscrowAddressResponse;
    isSDK(o: any): o is QueryEscrowAddressResponseSDKType;
    encode(message: QueryEscrowAddressResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryEscrowAddressResponse;
    fromJSON(object: any): QueryEscrowAddressResponse;
    toJSON(message: QueryEscrowAddressResponse): JsonSafe<QueryEscrowAddressResponse>;
    fromPartial(object: Partial<QueryEscrowAddressResponse>): QueryEscrowAddressResponse;
    fromProtoMsg(message: QueryEscrowAddressResponseProtoMsg): QueryEscrowAddressResponse;
    toProto(message: QueryEscrowAddressResponse): Uint8Array;
    toProtoMsg(message: QueryEscrowAddressResponse): QueryEscrowAddressResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryTotalEscrowForDenomRequest is the request type for TotalEscrowForDenom RPC method.
 * @name QueryTotalEscrowForDenomRequest
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryTotalEscrowForDenomRequest
 */
export declare const QueryTotalEscrowForDenomRequest: {
    typeUrl: "/ibc.applications.transfer.v1.QueryTotalEscrowForDenomRequest";
    aminoType: "cosmos-sdk/QueryTotalEscrowForDenomRequest";
    is(o: any): o is QueryTotalEscrowForDenomRequest;
    isSDK(o: any): o is QueryTotalEscrowForDenomRequestSDKType;
    encode(message: QueryTotalEscrowForDenomRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryTotalEscrowForDenomRequest;
    fromJSON(object: any): QueryTotalEscrowForDenomRequest;
    toJSON(message: QueryTotalEscrowForDenomRequest): JsonSafe<QueryTotalEscrowForDenomRequest>;
    fromPartial(object: Partial<QueryTotalEscrowForDenomRequest>): QueryTotalEscrowForDenomRequest;
    fromProtoMsg(message: QueryTotalEscrowForDenomRequestProtoMsg): QueryTotalEscrowForDenomRequest;
    toProto(message: QueryTotalEscrowForDenomRequest): Uint8Array;
    toProtoMsg(message: QueryTotalEscrowForDenomRequest): QueryTotalEscrowForDenomRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryTotalEscrowForDenomResponse is the response type for TotalEscrowForDenom RPC method.
 * @name QueryTotalEscrowForDenomResponse
 * @package ibc.applications.transfer.v1
 * @see proto type: ibc.applications.transfer.v1.QueryTotalEscrowForDenomResponse
 */
export declare const QueryTotalEscrowForDenomResponse: {
    typeUrl: "/ibc.applications.transfer.v1.QueryTotalEscrowForDenomResponse";
    aminoType: "cosmos-sdk/QueryTotalEscrowForDenomResponse";
    is(o: any): o is QueryTotalEscrowForDenomResponse;
    isSDK(o: any): o is QueryTotalEscrowForDenomResponseSDKType;
    encode(message: QueryTotalEscrowForDenomResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryTotalEscrowForDenomResponse;
    fromJSON(object: any): QueryTotalEscrowForDenomResponse;
    toJSON(message: QueryTotalEscrowForDenomResponse): JsonSafe<QueryTotalEscrowForDenomResponse>;
    fromPartial(object: Partial<QueryTotalEscrowForDenomResponse>): QueryTotalEscrowForDenomResponse;
    fromProtoMsg(message: QueryTotalEscrowForDenomResponseProtoMsg): QueryTotalEscrowForDenomResponse;
    toProto(message: QueryTotalEscrowForDenomResponse): Uint8Array;
    toProtoMsg(message: QueryTotalEscrowForDenomResponse): QueryTotalEscrowForDenomResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map