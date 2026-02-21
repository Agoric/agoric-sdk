import { Any, type AnySDKType } from '../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * CosmosTx contains a list of sdk.Msg's. It should be used when sending
 * transactions to a local chain.
 * @name CosmosTx
 * @package agoric.vlocalchain
 * @see proto type: agoric.vlocalchain.CosmosTx
 */
export interface CosmosTx {
    messages: Any[];
}
export interface CosmosTxProtoMsg {
    typeUrl: '/agoric.vlocalchain.CosmosTx';
    value: Uint8Array;
}
/**
 * CosmosTx contains a list of sdk.Msg's. It should be used when sending
 * transactions to a local chain.
 * @name CosmosTxSDKType
 * @package agoric.vlocalchain
 * @see proto type: agoric.vlocalchain.CosmosTx
 */
export interface CosmosTxSDKType {
    messages: AnySDKType[];
}
/**
 * QueryRequest is used internally to describe a query for the local chain.
 * @name QueryRequest
 * @package agoric.vlocalchain
 * @see proto type: agoric.vlocalchain.QueryRequest
 */
export interface QueryRequest {
    fullMethod: string;
    request?: Any;
    replyType: string;
}
export interface QueryRequestProtoMsg {
    typeUrl: '/agoric.vlocalchain.QueryRequest';
    value: Uint8Array;
}
/**
 * QueryRequest is used internally to describe a query for the local chain.
 * @name QueryRequestSDKType
 * @package agoric.vlocalchain
 * @see proto type: agoric.vlocalchain.QueryRequest
 */
export interface QueryRequestSDKType {
    full_method: string;
    request?: AnySDKType;
    reply_type: string;
}
/**
 * QueryResponse is used internally to describe a response from the local chain.
 * @name QueryResponse
 * @package agoric.vlocalchain
 * @see proto type: agoric.vlocalchain.QueryResponse
 */
export interface QueryResponse {
    height: bigint;
    reply?: Any;
    error: string;
}
export interface QueryResponseProtoMsg {
    typeUrl: '/agoric.vlocalchain.QueryResponse';
    value: Uint8Array;
}
/**
 * QueryResponse is used internally to describe a response from the local chain.
 * @name QueryResponseSDKType
 * @package agoric.vlocalchain
 * @see proto type: agoric.vlocalchain.QueryResponse
 */
export interface QueryResponseSDKType {
    height: bigint;
    reply?: AnySDKType;
    error: string;
}
/**
 * QueryResponses is used to group multiple QueryResponse messages.
 * @name QueryResponses
 * @package agoric.vlocalchain
 * @see proto type: agoric.vlocalchain.QueryResponses
 */
export interface QueryResponses {
    responses: QueryResponse[];
}
export interface QueryResponsesProtoMsg {
    typeUrl: '/agoric.vlocalchain.QueryResponses';
    value: Uint8Array;
}
/**
 * QueryResponses is used to group multiple QueryResponse messages.
 * @name QueryResponsesSDKType
 * @package agoric.vlocalchain
 * @see proto type: agoric.vlocalchain.QueryResponses
 */
export interface QueryResponsesSDKType {
    responses: QueryResponseSDKType[];
}
/**
 * CosmosTx contains a list of sdk.Msg's. It should be used when sending
 * transactions to a local chain.
 * @name CosmosTx
 * @package agoric.vlocalchain
 * @see proto type: agoric.vlocalchain.CosmosTx
 */
export declare const CosmosTx: {
    typeUrl: "/agoric.vlocalchain.CosmosTx";
    is(o: any): o is CosmosTx;
    isSDK(o: any): o is CosmosTxSDKType;
    encode(message: CosmosTx, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): CosmosTx;
    fromJSON(object: any): CosmosTx;
    toJSON(message: CosmosTx): JsonSafe<CosmosTx>;
    fromPartial(object: Partial<CosmosTx>): CosmosTx;
    fromProtoMsg(message: CosmosTxProtoMsg): CosmosTx;
    toProto(message: CosmosTx): Uint8Array;
    toProtoMsg(message: CosmosTx): CosmosTxProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryRequest is used internally to describe a query for the local chain.
 * @name QueryRequest
 * @package agoric.vlocalchain
 * @see proto type: agoric.vlocalchain.QueryRequest
 */
export declare const QueryRequest: {
    typeUrl: "/agoric.vlocalchain.QueryRequest";
    is(o: any): o is QueryRequest;
    isSDK(o: any): o is QueryRequestSDKType;
    encode(message: QueryRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRequest;
    fromJSON(object: any): QueryRequest;
    toJSON(message: QueryRequest): JsonSafe<QueryRequest>;
    fromPartial(object: Partial<QueryRequest>): QueryRequest;
    fromProtoMsg(message: QueryRequestProtoMsg): QueryRequest;
    toProto(message: QueryRequest): Uint8Array;
    toProtoMsg(message: QueryRequest): QueryRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryResponse is used internally to describe a response from the local chain.
 * @name QueryResponse
 * @package agoric.vlocalchain
 * @see proto type: agoric.vlocalchain.QueryResponse
 */
export declare const QueryResponse: {
    typeUrl: "/agoric.vlocalchain.QueryResponse";
    is(o: any): o is QueryResponse;
    isSDK(o: any): o is QueryResponseSDKType;
    encode(message: QueryResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryResponse;
    fromJSON(object: any): QueryResponse;
    toJSON(message: QueryResponse): JsonSafe<QueryResponse>;
    fromPartial(object: Partial<QueryResponse>): QueryResponse;
    fromProtoMsg(message: QueryResponseProtoMsg): QueryResponse;
    toProto(message: QueryResponse): Uint8Array;
    toProtoMsg(message: QueryResponse): QueryResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryResponses is used to group multiple QueryResponse messages.
 * @name QueryResponses
 * @package agoric.vlocalchain
 * @see proto type: agoric.vlocalchain.QueryResponses
 */
export declare const QueryResponses: {
    typeUrl: "/agoric.vlocalchain.QueryResponses";
    is(o: any): o is QueryResponses;
    isSDK(o: any): o is QueryResponsesSDKType;
    encode(message: QueryResponses, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryResponses;
    fromJSON(object: any): QueryResponses;
    toJSON(message: QueryResponses): JsonSafe<QueryResponses>;
    fromPartial(object: Partial<QueryResponses>): QueryResponses;
    fromProtoMsg(message: QueryResponsesProtoMsg): QueryResponses;
    toProto(message: QueryResponses): Uint8Array;
    toProtoMsg(message: QueryResponses): QueryResponsesProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=vlocalchain.d.ts.map