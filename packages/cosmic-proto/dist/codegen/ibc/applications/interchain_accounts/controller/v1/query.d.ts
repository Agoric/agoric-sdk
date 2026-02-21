import { Params, type ParamsSDKType } from './controller.js';
import { BinaryReader, BinaryWriter } from '../../../../../binary.js';
import { type JsonSafe } from '../../../../../json-safe.js';
/**
 * QueryInterchainAccountRequest is the request type for the Query/InterchainAccount RPC method.
 * @name QueryInterchainAccountRequest
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountRequest
 */
export interface QueryInterchainAccountRequest {
    owner: string;
    connectionId: string;
}
export interface QueryInterchainAccountRequestProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountRequest';
    value: Uint8Array;
}
/**
 * QueryInterchainAccountRequest is the request type for the Query/InterchainAccount RPC method.
 * @name QueryInterchainAccountRequestSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountRequest
 */
export interface QueryInterchainAccountRequestSDKType {
    owner: string;
    connection_id: string;
}
/**
 * QueryInterchainAccountResponse the response type for the Query/InterchainAccount RPC method.
 * @name QueryInterchainAccountResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountResponse
 */
export interface QueryInterchainAccountResponse {
    address: string;
}
export interface QueryInterchainAccountResponseProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountResponse';
    value: Uint8Array;
}
/**
 * QueryInterchainAccountResponse the response type for the Query/InterchainAccount RPC method.
 * @name QueryInterchainAccountResponseSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountResponse
 */
export interface QueryInterchainAccountResponseSDKType {
    address: string;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.controller.v1.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * params defines the parameters of the module.
     */
    params?: Params;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.controller.v1.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    params?: ParamsSDKType;
}
/**
 * QueryInterchainAccountRequest is the request type for the Query/InterchainAccount RPC method.
 * @name QueryInterchainAccountRequest
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountRequest
 */
export declare const QueryInterchainAccountRequest: {
    typeUrl: "/ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountRequest";
    aminoType: "cosmos-sdk/QueryInterchainAccountRequest";
    is(o: any): o is QueryInterchainAccountRequest;
    isSDK(o: any): o is QueryInterchainAccountRequestSDKType;
    encode(message: QueryInterchainAccountRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryInterchainAccountRequest;
    fromJSON(object: any): QueryInterchainAccountRequest;
    toJSON(message: QueryInterchainAccountRequest): JsonSafe<QueryInterchainAccountRequest>;
    fromPartial(object: Partial<QueryInterchainAccountRequest>): QueryInterchainAccountRequest;
    fromProtoMsg(message: QueryInterchainAccountRequestProtoMsg): QueryInterchainAccountRequest;
    toProto(message: QueryInterchainAccountRequest): Uint8Array;
    toProtoMsg(message: QueryInterchainAccountRequest): QueryInterchainAccountRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryInterchainAccountResponse the response type for the Query/InterchainAccount RPC method.
 * @name QueryInterchainAccountResponse
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountResponse
 */
export declare const QueryInterchainAccountResponse: {
    typeUrl: "/ibc.applications.interchain_accounts.controller.v1.QueryInterchainAccountResponse";
    aminoType: "cosmos-sdk/QueryInterchainAccountResponse";
    is(o: any): o is QueryInterchainAccountResponse;
    isSDK(o: any): o is QueryInterchainAccountResponseSDKType;
    encode(message: QueryInterchainAccountResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryInterchainAccountResponse;
    fromJSON(object: any): QueryInterchainAccountResponse;
    toJSON(message: QueryInterchainAccountResponse): JsonSafe<QueryInterchainAccountResponse>;
    fromPartial(object: Partial<QueryInterchainAccountResponse>): QueryInterchainAccountResponse;
    fromProtoMsg(message: QueryInterchainAccountResponseProtoMsg): QueryInterchainAccountResponse;
    toProto(message: QueryInterchainAccountResponse): Uint8Array;
    toProtoMsg(message: QueryInterchainAccountResponse): QueryInterchainAccountResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/ibc.applications.interchain_accounts.controller.v1.QueryParamsRequest";
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
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto type: ibc.applications.interchain_accounts.controller.v1.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/ibc.applications.interchain_accounts.controller.v1.QueryParamsResponse";
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
//# sourceMappingURL=query.d.ts.map