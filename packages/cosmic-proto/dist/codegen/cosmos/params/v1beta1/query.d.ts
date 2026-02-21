import { ParamChange, type ParamChangeSDKType } from './params.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * QueryParamsRequest is request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.QueryParamsRequest
 */
export interface QueryParamsRequest {
    /**
     * subspace defines the module to query the parameter for.
     */
    subspace: string;
    /**
     * key defines the key of the parameter in the subspace.
     */
    key: string;
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/cosmos.params.v1beta1.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest is request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
    subspace: string;
    key: string;
}
/**
 * QueryParamsResponse is response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * param defines the queried parameter.
     */
    param: ParamChange;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/cosmos.params.v1beta1.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse is response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    param: ParamChangeSDKType;
}
/**
 * QuerySubspacesRequest defines a request type for querying for all registered
 * subspaces and all keys for a subspace.
 *
 * Since: cosmos-sdk 0.46
 * @name QuerySubspacesRequest
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.QuerySubspacesRequest
 */
export interface QuerySubspacesRequest {
}
export interface QuerySubspacesRequestProtoMsg {
    typeUrl: '/cosmos.params.v1beta1.QuerySubspacesRequest';
    value: Uint8Array;
}
/**
 * QuerySubspacesRequest defines a request type for querying for all registered
 * subspaces and all keys for a subspace.
 *
 * Since: cosmos-sdk 0.46
 * @name QuerySubspacesRequestSDKType
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.QuerySubspacesRequest
 */
export interface QuerySubspacesRequestSDKType {
}
/**
 * QuerySubspacesResponse defines the response types for querying for all
 * registered subspaces and all keys for a subspace.
 *
 * Since: cosmos-sdk 0.46
 * @name QuerySubspacesResponse
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.QuerySubspacesResponse
 */
export interface QuerySubspacesResponse {
    subspaces: Subspace[];
}
export interface QuerySubspacesResponseProtoMsg {
    typeUrl: '/cosmos.params.v1beta1.QuerySubspacesResponse';
    value: Uint8Array;
}
/**
 * QuerySubspacesResponse defines the response types for querying for all
 * registered subspaces and all keys for a subspace.
 *
 * Since: cosmos-sdk 0.46
 * @name QuerySubspacesResponseSDKType
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.QuerySubspacesResponse
 */
export interface QuerySubspacesResponseSDKType {
    subspaces: SubspaceSDKType[];
}
/**
 * Subspace defines a parameter subspace name and all the keys that exist for
 * the subspace.
 *
 * Since: cosmos-sdk 0.46
 * @name Subspace
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.Subspace
 */
export interface Subspace {
    subspace: string;
    keys: string[];
}
export interface SubspaceProtoMsg {
    typeUrl: '/cosmos.params.v1beta1.Subspace';
    value: Uint8Array;
}
/**
 * Subspace defines a parameter subspace name and all the keys that exist for
 * the subspace.
 *
 * Since: cosmos-sdk 0.46
 * @name SubspaceSDKType
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.Subspace
 */
export interface SubspaceSDKType {
    subspace: string;
    keys: string[];
}
/**
 * QueryParamsRequest is request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/cosmos.params.v1beta1.QueryParamsRequest";
    aminoType: "cosmos-sdk/QueryParamsRequest";
    is(o: any): o is QueryParamsRequest;
    isSDK(o: any): o is QueryParamsRequestSDKType;
    encode(message: QueryParamsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryParamsRequest;
    fromJSON(object: any): QueryParamsRequest;
    toJSON(message: QueryParamsRequest): JsonSafe<QueryParamsRequest>;
    fromPartial(object: Partial<QueryParamsRequest>): QueryParamsRequest;
    fromProtoMsg(message: QueryParamsRequestProtoMsg): QueryParamsRequest;
    toProto(message: QueryParamsRequest): Uint8Array;
    toProtoMsg(message: QueryParamsRequest): QueryParamsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryParamsResponse is response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/cosmos.params.v1beta1.QueryParamsResponse";
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
 * QuerySubspacesRequest defines a request type for querying for all registered
 * subspaces and all keys for a subspace.
 *
 * Since: cosmos-sdk 0.46
 * @name QuerySubspacesRequest
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.QuerySubspacesRequest
 */
export declare const QuerySubspacesRequest: {
    typeUrl: "/cosmos.params.v1beta1.QuerySubspacesRequest";
    aminoType: "cosmos-sdk/QuerySubspacesRequest";
    is(o: any): o is QuerySubspacesRequest;
    isSDK(o: any): o is QuerySubspacesRequestSDKType;
    encode(_: QuerySubspacesRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QuerySubspacesRequest;
    fromJSON(_: any): QuerySubspacesRequest;
    toJSON(_: QuerySubspacesRequest): JsonSafe<QuerySubspacesRequest>;
    fromPartial(_: Partial<QuerySubspacesRequest>): QuerySubspacesRequest;
    fromProtoMsg(message: QuerySubspacesRequestProtoMsg): QuerySubspacesRequest;
    toProto(message: QuerySubspacesRequest): Uint8Array;
    toProtoMsg(message: QuerySubspacesRequest): QuerySubspacesRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySubspacesResponse defines the response types for querying for all
 * registered subspaces and all keys for a subspace.
 *
 * Since: cosmos-sdk 0.46
 * @name QuerySubspacesResponse
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.QuerySubspacesResponse
 */
export declare const QuerySubspacesResponse: {
    typeUrl: "/cosmos.params.v1beta1.QuerySubspacesResponse";
    aminoType: "cosmos-sdk/QuerySubspacesResponse";
    is(o: any): o is QuerySubspacesResponse;
    isSDK(o: any): o is QuerySubspacesResponseSDKType;
    encode(message: QuerySubspacesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QuerySubspacesResponse;
    fromJSON(object: any): QuerySubspacesResponse;
    toJSON(message: QuerySubspacesResponse): JsonSafe<QuerySubspacesResponse>;
    fromPartial(object: Partial<QuerySubspacesResponse>): QuerySubspacesResponse;
    fromProtoMsg(message: QuerySubspacesResponseProtoMsg): QuerySubspacesResponse;
    toProto(message: QuerySubspacesResponse): Uint8Array;
    toProtoMsg(message: QuerySubspacesResponse): QuerySubspacesResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Subspace defines a parameter subspace name and all the keys that exist for
 * the subspace.
 *
 * Since: cosmos-sdk 0.46
 * @name Subspace
 * @package cosmos.params.v1beta1
 * @see proto type: cosmos.params.v1beta1.Subspace
 */
export declare const Subspace: {
    typeUrl: "/cosmos.params.v1beta1.Subspace";
    aminoType: "cosmos-sdk/Subspace";
    is(o: any): o is Subspace;
    isSDK(o: any): o is SubspaceSDKType;
    encode(message: Subspace, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Subspace;
    fromJSON(object: any): Subspace;
    toJSON(message: Subspace): JsonSafe<Subspace>;
    fromPartial(object: Partial<Subspace>): Subspace;
    fromProtoMsg(message: SubspaceProtoMsg): Subspace;
    toProto(message: Subspace): Uint8Array;
    toProtoMsg(message: Subspace): SubspaceProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map