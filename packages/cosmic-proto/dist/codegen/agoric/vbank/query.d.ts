import { Params, type ParamsSDKType, State, type StateSDKType } from './vbank.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package agoric.vbank
 * @see proto type: agoric.vbank.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/agoric.vbank.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package agoric.vbank
 * @see proto type: agoric.vbank.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package agoric.vbank
 * @see proto type: agoric.vbank.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * params defines the parameters of the module.
     */
    params: Params;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/agoric.vbank.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package agoric.vbank
 * @see proto type: agoric.vbank.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    params: ParamsSDKType;
}
/**
 * QueryStateRequest is the request type for the Query/State RPC method.
 * @name QueryStateRequest
 * @package agoric.vbank
 * @see proto type: agoric.vbank.QueryStateRequest
 */
export interface QueryStateRequest {
}
export interface QueryStateRequestProtoMsg {
    typeUrl: '/agoric.vbank.QueryStateRequest';
    value: Uint8Array;
}
/**
 * QueryStateRequest is the request type for the Query/State RPC method.
 * @name QueryStateRequestSDKType
 * @package agoric.vbank
 * @see proto type: agoric.vbank.QueryStateRequest
 */
export interface QueryStateRequestSDKType {
}
/**
 * QueryStateResponse is the response type for the Query/State RPC method.
 * @name QueryStateResponse
 * @package agoric.vbank
 * @see proto type: agoric.vbank.QueryStateResponse
 */
export interface QueryStateResponse {
    /**
     * state defines the parameters of the module.
     */
    state: State;
}
export interface QueryStateResponseProtoMsg {
    typeUrl: '/agoric.vbank.QueryStateResponse';
    value: Uint8Array;
}
/**
 * QueryStateResponse is the response type for the Query/State RPC method.
 * @name QueryStateResponseSDKType
 * @package agoric.vbank
 * @see proto type: agoric.vbank.QueryStateResponse
 */
export interface QueryStateResponseSDKType {
    state: StateSDKType;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package agoric.vbank
 * @see proto type: agoric.vbank.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/agoric.vbank.QueryParamsRequest";
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
 * @package agoric.vbank
 * @see proto type: agoric.vbank.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/agoric.vbank.QueryParamsResponse";
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
 * QueryStateRequest is the request type for the Query/State RPC method.
 * @name QueryStateRequest
 * @package agoric.vbank
 * @see proto type: agoric.vbank.QueryStateRequest
 */
export declare const QueryStateRequest: {
    typeUrl: "/agoric.vbank.QueryStateRequest";
    is(o: any): o is QueryStateRequest;
    isSDK(o: any): o is QueryStateRequestSDKType;
    encode(_: QueryStateRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryStateRequest;
    fromJSON(_: any): QueryStateRequest;
    toJSON(_: QueryStateRequest): JsonSafe<QueryStateRequest>;
    fromPartial(_: Partial<QueryStateRequest>): QueryStateRequest;
    fromProtoMsg(message: QueryStateRequestProtoMsg): QueryStateRequest;
    toProto(message: QueryStateRequest): Uint8Array;
    toProtoMsg(message: QueryStateRequest): QueryStateRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryStateResponse is the response type for the Query/State RPC method.
 * @name QueryStateResponse
 * @package agoric.vbank
 * @see proto type: agoric.vbank.QueryStateResponse
 */
export declare const QueryStateResponse: {
    typeUrl: "/agoric.vbank.QueryStateResponse";
    is(o: any): o is QueryStateResponse;
    isSDK(o: any): o is QueryStateResponseSDKType;
    encode(message: QueryStateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryStateResponse;
    fromJSON(object: any): QueryStateResponse;
    toJSON(message: QueryStateResponse): JsonSafe<QueryStateResponse>;
    fromPartial(object: Partial<QueryStateResponse>): QueryStateResponse;
    fromProtoMsg(message: QueryStateResponseProtoMsg): QueryStateResponse;
    toProto(message: QueryStateResponse): Uint8Array;
    toProtoMsg(message: QueryStateResponse): QueryStateResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map