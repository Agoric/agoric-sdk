import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../../../cosmos/base/query/v1beta1/pagination.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * QueryChecksumsRequest is the request type for the Query/Checksums RPC method.
 * @name QueryChecksumsRequest
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.QueryChecksumsRequest
 */
export interface QueryChecksumsRequest {
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryChecksumsRequestProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.QueryChecksumsRequest';
    value: Uint8Array;
}
/**
 * QueryChecksumsRequest is the request type for the Query/Checksums RPC method.
 * @name QueryChecksumsRequestSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.QueryChecksumsRequest
 */
export interface QueryChecksumsRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * QueryChecksumsResponse is the response type for the Query/Checksums RPC method.
 * @name QueryChecksumsResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.QueryChecksumsResponse
 */
export interface QueryChecksumsResponse {
    /**
     * checksums is a list of the hex encoded checksums of all wasm codes stored.
     */
    checksums: string[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryChecksumsResponseProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.QueryChecksumsResponse';
    value: Uint8Array;
}
/**
 * QueryChecksumsResponse is the response type for the Query/Checksums RPC method.
 * @name QueryChecksumsResponseSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.QueryChecksumsResponse
 */
export interface QueryChecksumsResponseSDKType {
    checksums: string[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryCodeRequest is the request type for the Query/Code RPC method.
 * @name QueryCodeRequest
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.QueryCodeRequest
 */
export interface QueryCodeRequest {
    /**
     * checksum is a hex encoded string of the code stored.
     */
    checksum: string;
}
export interface QueryCodeRequestProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.QueryCodeRequest';
    value: Uint8Array;
}
/**
 * QueryCodeRequest is the request type for the Query/Code RPC method.
 * @name QueryCodeRequestSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.QueryCodeRequest
 */
export interface QueryCodeRequestSDKType {
    checksum: string;
}
/**
 * QueryCodeResponse is the response type for the Query/Code RPC method.
 * @name QueryCodeResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.QueryCodeResponse
 */
export interface QueryCodeResponse {
    data: Uint8Array;
}
export interface QueryCodeResponseProtoMsg {
    typeUrl: '/ibc.lightclients.wasm.v1.QueryCodeResponse';
    value: Uint8Array;
}
/**
 * QueryCodeResponse is the response type for the Query/Code RPC method.
 * @name QueryCodeResponseSDKType
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.QueryCodeResponse
 */
export interface QueryCodeResponseSDKType {
    data: Uint8Array;
}
/**
 * QueryChecksumsRequest is the request type for the Query/Checksums RPC method.
 * @name QueryChecksumsRequest
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.QueryChecksumsRequest
 */
export declare const QueryChecksumsRequest: {
    typeUrl: "/ibc.lightclients.wasm.v1.QueryChecksumsRequest";
    aminoType: "cosmos-sdk/QueryChecksumsRequest";
    is(o: any): o is QueryChecksumsRequest;
    isSDK(o: any): o is QueryChecksumsRequestSDKType;
    encode(message: QueryChecksumsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChecksumsRequest;
    fromJSON(object: any): QueryChecksumsRequest;
    toJSON(message: QueryChecksumsRequest): JsonSafe<QueryChecksumsRequest>;
    fromPartial(object: Partial<QueryChecksumsRequest>): QueryChecksumsRequest;
    fromProtoMsg(message: QueryChecksumsRequestProtoMsg): QueryChecksumsRequest;
    toProto(message: QueryChecksumsRequest): Uint8Array;
    toProtoMsg(message: QueryChecksumsRequest): QueryChecksumsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryChecksumsResponse is the response type for the Query/Checksums RPC method.
 * @name QueryChecksumsResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.QueryChecksumsResponse
 */
export declare const QueryChecksumsResponse: {
    typeUrl: "/ibc.lightclients.wasm.v1.QueryChecksumsResponse";
    aminoType: "cosmos-sdk/QueryChecksumsResponse";
    is(o: any): o is QueryChecksumsResponse;
    isSDK(o: any): o is QueryChecksumsResponseSDKType;
    encode(message: QueryChecksumsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChecksumsResponse;
    fromJSON(object: any): QueryChecksumsResponse;
    toJSON(message: QueryChecksumsResponse): JsonSafe<QueryChecksumsResponse>;
    fromPartial(object: Partial<QueryChecksumsResponse>): QueryChecksumsResponse;
    fromProtoMsg(message: QueryChecksumsResponseProtoMsg): QueryChecksumsResponse;
    toProto(message: QueryChecksumsResponse): Uint8Array;
    toProtoMsg(message: QueryChecksumsResponse): QueryChecksumsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryCodeRequest is the request type for the Query/Code RPC method.
 * @name QueryCodeRequest
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.QueryCodeRequest
 */
export declare const QueryCodeRequest: {
    typeUrl: "/ibc.lightclients.wasm.v1.QueryCodeRequest";
    aminoType: "cosmos-sdk/QueryCodeRequest";
    is(o: any): o is QueryCodeRequest;
    isSDK(o: any): o is QueryCodeRequestSDKType;
    encode(message: QueryCodeRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryCodeRequest;
    fromJSON(object: any): QueryCodeRequest;
    toJSON(message: QueryCodeRequest): JsonSafe<QueryCodeRequest>;
    fromPartial(object: Partial<QueryCodeRequest>): QueryCodeRequest;
    fromProtoMsg(message: QueryCodeRequestProtoMsg): QueryCodeRequest;
    toProto(message: QueryCodeRequest): Uint8Array;
    toProtoMsg(message: QueryCodeRequest): QueryCodeRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryCodeResponse is the response type for the Query/Code RPC method.
 * @name QueryCodeResponse
 * @package ibc.lightclients.wasm.v1
 * @see proto type: ibc.lightclients.wasm.v1.QueryCodeResponse
 */
export declare const QueryCodeResponse: {
    typeUrl: "/ibc.lightclients.wasm.v1.QueryCodeResponse";
    aminoType: "cosmos-sdk/QueryCodeResponse";
    is(o: any): o is QueryCodeResponse;
    isSDK(o: any): o is QueryCodeResponseSDKType;
    encode(message: QueryCodeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryCodeResponse;
    fromJSON(object: any): QueryCodeResponse;
    toJSON(message: QueryCodeResponse): JsonSafe<QueryCodeResponse>;
    fromPartial(object: Partial<QueryCodeResponse>): QueryCodeResponse;
    fromProtoMsg(message: QueryCodeResponseProtoMsg): QueryCodeResponse;
    toProto(message: QueryCodeResponse): Uint8Array;
    toProtoMsg(message: QueryCodeResponse): QueryCodeResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map