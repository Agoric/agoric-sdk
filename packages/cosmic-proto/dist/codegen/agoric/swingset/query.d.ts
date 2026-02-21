import { Params, type ParamsSDKType, Egress, type EgressSDKType } from './swingset.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/agoric.swingset.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * params defines the parameters of the module.
     */
    params: Params;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/agoric.swingset.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    params: ParamsSDKType;
}
/**
 * QueryEgressRequest is the request type for the Query/Egress RPC method
 * @name QueryEgressRequest
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryEgressRequest
 */
export interface QueryEgressRequest {
    peer: Uint8Array;
}
export interface QueryEgressRequestProtoMsg {
    typeUrl: '/agoric.swingset.QueryEgressRequest';
    value: Uint8Array;
}
/**
 * QueryEgressRequest is the request type for the Query/Egress RPC method
 * @name QueryEgressRequestSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryEgressRequest
 */
export interface QueryEgressRequestSDKType {
    peer: Uint8Array;
}
/**
 * QueryEgressResponse is the egress response.
 * @name QueryEgressResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryEgressResponse
 */
export interface QueryEgressResponse {
    egress?: Egress;
}
export interface QueryEgressResponseProtoMsg {
    typeUrl: '/agoric.swingset.QueryEgressResponse';
    value: Uint8Array;
}
/**
 * QueryEgressResponse is the egress response.
 * @name QueryEgressResponseSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryEgressResponse
 */
export interface QueryEgressResponseSDKType {
    egress?: EgressSDKType;
}
/**
 * QueryMailboxRequest is the mailbox query.
 * @name QueryMailboxRequest
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryMailboxRequest
 */
export interface QueryMailboxRequest {
    peer: Uint8Array;
}
export interface QueryMailboxRequestProtoMsg {
    typeUrl: '/agoric.swingset.QueryMailboxRequest';
    value: Uint8Array;
}
/**
 * QueryMailboxRequest is the mailbox query.
 * @name QueryMailboxRequestSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryMailboxRequest
 */
export interface QueryMailboxRequestSDKType {
    peer: Uint8Array;
}
/**
 * QueryMailboxResponse is the mailbox response.
 * @name QueryMailboxResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryMailboxResponse
 */
export interface QueryMailboxResponse {
    value: string;
}
export interface QueryMailboxResponseProtoMsg {
    typeUrl: '/agoric.swingset.QueryMailboxResponse';
    value: Uint8Array;
}
/**
 * QueryMailboxResponse is the mailbox response.
 * @name QueryMailboxResponseSDKType
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryMailboxResponse
 */
export interface QueryMailboxResponseSDKType {
    value: string;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/agoric.swingset.QueryParamsRequest";
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
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/agoric.swingset.QueryParamsResponse";
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
 * QueryEgressRequest is the request type for the Query/Egress RPC method
 * @name QueryEgressRequest
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryEgressRequest
 */
export declare const QueryEgressRequest: {
    typeUrl: "/agoric.swingset.QueryEgressRequest";
    is(o: any): o is QueryEgressRequest;
    isSDK(o: any): o is QueryEgressRequestSDKType;
    encode(message: QueryEgressRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryEgressRequest;
    fromJSON(object: any): QueryEgressRequest;
    toJSON(message: QueryEgressRequest): JsonSafe<QueryEgressRequest>;
    fromPartial(object: Partial<QueryEgressRequest>): QueryEgressRequest;
    fromProtoMsg(message: QueryEgressRequestProtoMsg): QueryEgressRequest;
    toProto(message: QueryEgressRequest): Uint8Array;
    toProtoMsg(message: QueryEgressRequest): QueryEgressRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryEgressResponse is the egress response.
 * @name QueryEgressResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryEgressResponse
 */
export declare const QueryEgressResponse: {
    typeUrl: "/agoric.swingset.QueryEgressResponse";
    is(o: any): o is QueryEgressResponse;
    isSDK(o: any): o is QueryEgressResponseSDKType;
    encode(message: QueryEgressResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryEgressResponse;
    fromJSON(object: any): QueryEgressResponse;
    toJSON(message: QueryEgressResponse): JsonSafe<QueryEgressResponse>;
    fromPartial(object: Partial<QueryEgressResponse>): QueryEgressResponse;
    fromProtoMsg(message: QueryEgressResponseProtoMsg): QueryEgressResponse;
    toProto(message: QueryEgressResponse): Uint8Array;
    toProtoMsg(message: QueryEgressResponse): QueryEgressResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryMailboxRequest is the mailbox query.
 * @name QueryMailboxRequest
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryMailboxRequest
 */
export declare const QueryMailboxRequest: {
    typeUrl: "/agoric.swingset.QueryMailboxRequest";
    is(o: any): o is QueryMailboxRequest;
    isSDK(o: any): o is QueryMailboxRequestSDKType;
    encode(message: QueryMailboxRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryMailboxRequest;
    fromJSON(object: any): QueryMailboxRequest;
    toJSON(message: QueryMailboxRequest): JsonSafe<QueryMailboxRequest>;
    fromPartial(object: Partial<QueryMailboxRequest>): QueryMailboxRequest;
    fromProtoMsg(message: QueryMailboxRequestProtoMsg): QueryMailboxRequest;
    toProto(message: QueryMailboxRequest): Uint8Array;
    toProtoMsg(message: QueryMailboxRequest): QueryMailboxRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryMailboxResponse is the mailbox response.
 * @name QueryMailboxResponse
 * @package agoric.swingset
 * @see proto type: agoric.swingset.QueryMailboxResponse
 */
export declare const QueryMailboxResponse: {
    typeUrl: "/agoric.swingset.QueryMailboxResponse";
    is(o: any): o is QueryMailboxResponse;
    isSDK(o: any): o is QueryMailboxResponseSDKType;
    encode(message: QueryMailboxResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryMailboxResponse;
    fromJSON(object: any): QueryMailboxResponse;
    toJSON(message: QueryMailboxResponse): JsonSafe<QueryMailboxResponse>;
    fromPartial(object: Partial<QueryMailboxResponse>): QueryMailboxResponse;
    fromProtoMsg(message: QueryMailboxResponseProtoMsg): QueryMailboxResponse;
    toProto(message: QueryMailboxResponse): Uint8Array;
    toProtoMsg(message: QueryMailboxResponse): QueryMailboxResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map