import { Params, type ParamsSDKType } from './host.js';
import { BinaryReader, BinaryWriter } from '../../../../../binary.js';
import { type JsonSafe } from '../../../../../json-safe.js';
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.host.v1.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * params defines the parameters of the module.
     */
    params?: Params;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/ibc.applications.interchain_accounts.host.v1.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    params?: ParamsSDKType;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/ibc.applications.interchain_accounts.host.v1.QueryParamsRequest";
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
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto type: ibc.applications.interchain_accounts.host.v1.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/ibc.applications.interchain_accounts.host.v1.QueryParamsResponse";
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