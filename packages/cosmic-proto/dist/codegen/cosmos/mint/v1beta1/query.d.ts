import { Params, type ParamsSDKType } from './mint.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/cosmos.mint.v1beta1.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * params defines the parameters of the module.
     */
    params: Params;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/cosmos.mint.v1beta1.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    params: ParamsSDKType;
}
/**
 * QueryInflationRequest is the request type for the Query/Inflation RPC method.
 * @name QueryInflationRequest
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryInflationRequest
 */
export interface QueryInflationRequest {
}
export interface QueryInflationRequestProtoMsg {
    typeUrl: '/cosmos.mint.v1beta1.QueryInflationRequest';
    value: Uint8Array;
}
/**
 * QueryInflationRequest is the request type for the Query/Inflation RPC method.
 * @name QueryInflationRequestSDKType
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryInflationRequest
 */
export interface QueryInflationRequestSDKType {
}
/**
 * QueryInflationResponse is the response type for the Query/Inflation RPC
 * method.
 * @name QueryInflationResponse
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryInflationResponse
 */
export interface QueryInflationResponse {
    /**
     * inflation is the current minting inflation value.
     */
    inflation: Uint8Array;
}
export interface QueryInflationResponseProtoMsg {
    typeUrl: '/cosmos.mint.v1beta1.QueryInflationResponse';
    value: Uint8Array;
}
/**
 * QueryInflationResponse is the response type for the Query/Inflation RPC
 * method.
 * @name QueryInflationResponseSDKType
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryInflationResponse
 */
export interface QueryInflationResponseSDKType {
    inflation: Uint8Array;
}
/**
 * QueryAnnualProvisionsRequest is the request type for the
 * Query/AnnualProvisions RPC method.
 * @name QueryAnnualProvisionsRequest
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryAnnualProvisionsRequest
 */
export interface QueryAnnualProvisionsRequest {
}
export interface QueryAnnualProvisionsRequestProtoMsg {
    typeUrl: '/cosmos.mint.v1beta1.QueryAnnualProvisionsRequest';
    value: Uint8Array;
}
/**
 * QueryAnnualProvisionsRequest is the request type for the
 * Query/AnnualProvisions RPC method.
 * @name QueryAnnualProvisionsRequestSDKType
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryAnnualProvisionsRequest
 */
export interface QueryAnnualProvisionsRequestSDKType {
}
/**
 * QueryAnnualProvisionsResponse is the response type for the
 * Query/AnnualProvisions RPC method.
 * @name QueryAnnualProvisionsResponse
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryAnnualProvisionsResponse
 */
export interface QueryAnnualProvisionsResponse {
    /**
     * annual_provisions is the current minting annual provisions value.
     */
    annualProvisions: Uint8Array;
}
export interface QueryAnnualProvisionsResponseProtoMsg {
    typeUrl: '/cosmos.mint.v1beta1.QueryAnnualProvisionsResponse';
    value: Uint8Array;
}
/**
 * QueryAnnualProvisionsResponse is the response type for the
 * Query/AnnualProvisions RPC method.
 * @name QueryAnnualProvisionsResponseSDKType
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryAnnualProvisionsResponse
 */
export interface QueryAnnualProvisionsResponseSDKType {
    annual_provisions: Uint8Array;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/cosmos.mint.v1beta1.QueryParamsRequest";
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
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/cosmos.mint.v1beta1.QueryParamsResponse";
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
 * QueryInflationRequest is the request type for the Query/Inflation RPC method.
 * @name QueryInflationRequest
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryInflationRequest
 */
export declare const QueryInflationRequest: {
    typeUrl: "/cosmos.mint.v1beta1.QueryInflationRequest";
    aminoType: "cosmos-sdk/QueryInflationRequest";
    is(o: any): o is QueryInflationRequest;
    isSDK(o: any): o is QueryInflationRequestSDKType;
    encode(_: QueryInflationRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryInflationRequest;
    fromJSON(_: any): QueryInflationRequest;
    toJSON(_: QueryInflationRequest): JsonSafe<QueryInflationRequest>;
    fromPartial(_: Partial<QueryInflationRequest>): QueryInflationRequest;
    fromProtoMsg(message: QueryInflationRequestProtoMsg): QueryInflationRequest;
    toProto(message: QueryInflationRequest): Uint8Array;
    toProtoMsg(message: QueryInflationRequest): QueryInflationRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryInflationResponse is the response type for the Query/Inflation RPC
 * method.
 * @name QueryInflationResponse
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryInflationResponse
 */
export declare const QueryInflationResponse: {
    typeUrl: "/cosmos.mint.v1beta1.QueryInflationResponse";
    aminoType: "cosmos-sdk/QueryInflationResponse";
    is(o: any): o is QueryInflationResponse;
    isSDK(o: any): o is QueryInflationResponseSDKType;
    encode(message: QueryInflationResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryInflationResponse;
    fromJSON(object: any): QueryInflationResponse;
    toJSON(message: QueryInflationResponse): JsonSafe<QueryInflationResponse>;
    fromPartial(object: Partial<QueryInflationResponse>): QueryInflationResponse;
    fromProtoMsg(message: QueryInflationResponseProtoMsg): QueryInflationResponse;
    toProto(message: QueryInflationResponse): Uint8Array;
    toProtoMsg(message: QueryInflationResponse): QueryInflationResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAnnualProvisionsRequest is the request type for the
 * Query/AnnualProvisions RPC method.
 * @name QueryAnnualProvisionsRequest
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryAnnualProvisionsRequest
 */
export declare const QueryAnnualProvisionsRequest: {
    typeUrl: "/cosmos.mint.v1beta1.QueryAnnualProvisionsRequest";
    aminoType: "cosmos-sdk/QueryAnnualProvisionsRequest";
    is(o: any): o is QueryAnnualProvisionsRequest;
    isSDK(o: any): o is QueryAnnualProvisionsRequestSDKType;
    encode(_: QueryAnnualProvisionsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAnnualProvisionsRequest;
    fromJSON(_: any): QueryAnnualProvisionsRequest;
    toJSON(_: QueryAnnualProvisionsRequest): JsonSafe<QueryAnnualProvisionsRequest>;
    fromPartial(_: Partial<QueryAnnualProvisionsRequest>): QueryAnnualProvisionsRequest;
    fromProtoMsg(message: QueryAnnualProvisionsRequestProtoMsg): QueryAnnualProvisionsRequest;
    toProto(message: QueryAnnualProvisionsRequest): Uint8Array;
    toProtoMsg(message: QueryAnnualProvisionsRequest): QueryAnnualProvisionsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAnnualProvisionsResponse is the response type for the
 * Query/AnnualProvisions RPC method.
 * @name QueryAnnualProvisionsResponse
 * @package cosmos.mint.v1beta1
 * @see proto type: cosmos.mint.v1beta1.QueryAnnualProvisionsResponse
 */
export declare const QueryAnnualProvisionsResponse: {
    typeUrl: "/cosmos.mint.v1beta1.QueryAnnualProvisionsResponse";
    aminoType: "cosmos-sdk/QueryAnnualProvisionsResponse";
    is(o: any): o is QueryAnnualProvisionsResponse;
    isSDK(o: any): o is QueryAnnualProvisionsResponseSDKType;
    encode(message: QueryAnnualProvisionsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAnnualProvisionsResponse;
    fromJSON(object: any): QueryAnnualProvisionsResponse;
    toJSON(message: QueryAnnualProvisionsResponse): JsonSafe<QueryAnnualProvisionsResponse>;
    fromPartial(object: Partial<QueryAnnualProvisionsResponse>): QueryAnnualProvisionsResponse;
    fromProtoMsg(message: QueryAnnualProvisionsResponseProtoMsg): QueryAnnualProvisionsResponse;
    toProto(message: QueryAnnualProvisionsResponse): Uint8Array;
    toProtoMsg(message: QueryAnnualProvisionsResponse): QueryAnnualProvisionsResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map