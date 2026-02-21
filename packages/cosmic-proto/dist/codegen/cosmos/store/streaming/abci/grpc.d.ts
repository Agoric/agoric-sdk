import { RequestFinalizeBlock, type RequestFinalizeBlockSDKType, ResponseFinalizeBlock, type ResponseFinalizeBlockSDKType, ResponseCommit, type ResponseCommitSDKType } from '../../../../tendermint/abci/types.js';
import { StoreKVPair, type StoreKVPairSDKType } from '../../v1beta1/listening.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * ListenEndBlockRequest is the request type for the ListenEndBlock RPC method
 * @name ListenFinalizeBlockRequest
 * @package cosmos.store.streaming.abci
 * @see proto type: cosmos.store.streaming.abci.ListenFinalizeBlockRequest
 */
export interface ListenFinalizeBlockRequest {
    req?: RequestFinalizeBlock;
    res?: ResponseFinalizeBlock;
}
export interface ListenFinalizeBlockRequestProtoMsg {
    typeUrl: '/cosmos.store.streaming.abci.ListenFinalizeBlockRequest';
    value: Uint8Array;
}
/**
 * ListenEndBlockRequest is the request type for the ListenEndBlock RPC method
 * @name ListenFinalizeBlockRequestSDKType
 * @package cosmos.store.streaming.abci
 * @see proto type: cosmos.store.streaming.abci.ListenFinalizeBlockRequest
 */
export interface ListenFinalizeBlockRequestSDKType {
    req?: RequestFinalizeBlockSDKType;
    res?: ResponseFinalizeBlockSDKType;
}
/**
 * ListenEndBlockResponse is the response type for the ListenEndBlock RPC method
 * @name ListenFinalizeBlockResponse
 * @package cosmos.store.streaming.abci
 * @see proto type: cosmos.store.streaming.abci.ListenFinalizeBlockResponse
 */
export interface ListenFinalizeBlockResponse {
}
export interface ListenFinalizeBlockResponseProtoMsg {
    typeUrl: '/cosmos.store.streaming.abci.ListenFinalizeBlockResponse';
    value: Uint8Array;
}
/**
 * ListenEndBlockResponse is the response type for the ListenEndBlock RPC method
 * @name ListenFinalizeBlockResponseSDKType
 * @package cosmos.store.streaming.abci
 * @see proto type: cosmos.store.streaming.abci.ListenFinalizeBlockResponse
 */
export interface ListenFinalizeBlockResponseSDKType {
}
/**
 * ListenCommitRequest is the request type for the ListenCommit RPC method
 * @name ListenCommitRequest
 * @package cosmos.store.streaming.abci
 * @see proto type: cosmos.store.streaming.abci.ListenCommitRequest
 */
export interface ListenCommitRequest {
    /**
     * explicitly pass in block height as ResponseCommit does not contain this info
     */
    blockHeight: bigint;
    res?: ResponseCommit;
    changeSet: StoreKVPair[];
}
export interface ListenCommitRequestProtoMsg {
    typeUrl: '/cosmos.store.streaming.abci.ListenCommitRequest';
    value: Uint8Array;
}
/**
 * ListenCommitRequest is the request type for the ListenCommit RPC method
 * @name ListenCommitRequestSDKType
 * @package cosmos.store.streaming.abci
 * @see proto type: cosmos.store.streaming.abci.ListenCommitRequest
 */
export interface ListenCommitRequestSDKType {
    block_height: bigint;
    res?: ResponseCommitSDKType;
    change_set: StoreKVPairSDKType[];
}
/**
 * ListenCommitResponse is the response type for the ListenCommit RPC method
 * @name ListenCommitResponse
 * @package cosmos.store.streaming.abci
 * @see proto type: cosmos.store.streaming.abci.ListenCommitResponse
 */
export interface ListenCommitResponse {
}
export interface ListenCommitResponseProtoMsg {
    typeUrl: '/cosmos.store.streaming.abci.ListenCommitResponse';
    value: Uint8Array;
}
/**
 * ListenCommitResponse is the response type for the ListenCommit RPC method
 * @name ListenCommitResponseSDKType
 * @package cosmos.store.streaming.abci
 * @see proto type: cosmos.store.streaming.abci.ListenCommitResponse
 */
export interface ListenCommitResponseSDKType {
}
/**
 * ListenEndBlockRequest is the request type for the ListenEndBlock RPC method
 * @name ListenFinalizeBlockRequest
 * @package cosmos.store.streaming.abci
 * @see proto type: cosmos.store.streaming.abci.ListenFinalizeBlockRequest
 */
export declare const ListenFinalizeBlockRequest: {
    typeUrl: "/cosmos.store.streaming.abci.ListenFinalizeBlockRequest";
    aminoType: "cosmos-sdk/ListenFinalizeBlockRequest";
    is(o: any): o is ListenFinalizeBlockRequest;
    isSDK(o: any): o is ListenFinalizeBlockRequestSDKType;
    encode(message: ListenFinalizeBlockRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ListenFinalizeBlockRequest;
    fromJSON(object: any): ListenFinalizeBlockRequest;
    toJSON(message: ListenFinalizeBlockRequest): JsonSafe<ListenFinalizeBlockRequest>;
    fromPartial(object: Partial<ListenFinalizeBlockRequest>): ListenFinalizeBlockRequest;
    fromProtoMsg(message: ListenFinalizeBlockRequestProtoMsg): ListenFinalizeBlockRequest;
    toProto(message: ListenFinalizeBlockRequest): Uint8Array;
    toProtoMsg(message: ListenFinalizeBlockRequest): ListenFinalizeBlockRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ListenEndBlockResponse is the response type for the ListenEndBlock RPC method
 * @name ListenFinalizeBlockResponse
 * @package cosmos.store.streaming.abci
 * @see proto type: cosmos.store.streaming.abci.ListenFinalizeBlockResponse
 */
export declare const ListenFinalizeBlockResponse: {
    typeUrl: "/cosmos.store.streaming.abci.ListenFinalizeBlockResponse";
    aminoType: "cosmos-sdk/ListenFinalizeBlockResponse";
    is(o: any): o is ListenFinalizeBlockResponse;
    isSDK(o: any): o is ListenFinalizeBlockResponseSDKType;
    encode(_: ListenFinalizeBlockResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ListenFinalizeBlockResponse;
    fromJSON(_: any): ListenFinalizeBlockResponse;
    toJSON(_: ListenFinalizeBlockResponse): JsonSafe<ListenFinalizeBlockResponse>;
    fromPartial(_: Partial<ListenFinalizeBlockResponse>): ListenFinalizeBlockResponse;
    fromProtoMsg(message: ListenFinalizeBlockResponseProtoMsg): ListenFinalizeBlockResponse;
    toProto(message: ListenFinalizeBlockResponse): Uint8Array;
    toProtoMsg(message: ListenFinalizeBlockResponse): ListenFinalizeBlockResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ListenCommitRequest is the request type for the ListenCommit RPC method
 * @name ListenCommitRequest
 * @package cosmos.store.streaming.abci
 * @see proto type: cosmos.store.streaming.abci.ListenCommitRequest
 */
export declare const ListenCommitRequest: {
    typeUrl: "/cosmos.store.streaming.abci.ListenCommitRequest";
    aminoType: "cosmos-sdk/ListenCommitRequest";
    is(o: any): o is ListenCommitRequest;
    isSDK(o: any): o is ListenCommitRequestSDKType;
    encode(message: ListenCommitRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ListenCommitRequest;
    fromJSON(object: any): ListenCommitRequest;
    toJSON(message: ListenCommitRequest): JsonSafe<ListenCommitRequest>;
    fromPartial(object: Partial<ListenCommitRequest>): ListenCommitRequest;
    fromProtoMsg(message: ListenCommitRequestProtoMsg): ListenCommitRequest;
    toProto(message: ListenCommitRequest): Uint8Array;
    toProtoMsg(message: ListenCommitRequest): ListenCommitRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * ListenCommitResponse is the response type for the ListenCommit RPC method
 * @name ListenCommitResponse
 * @package cosmos.store.streaming.abci
 * @see proto type: cosmos.store.streaming.abci.ListenCommitResponse
 */
export declare const ListenCommitResponse: {
    typeUrl: "/cosmos.store.streaming.abci.ListenCommitResponse";
    aminoType: "cosmos-sdk/ListenCommitResponse";
    is(o: any): o is ListenCommitResponse;
    isSDK(o: any): o is ListenCommitResponseSDKType;
    encode(_: ListenCommitResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): ListenCommitResponse;
    fromJSON(_: any): ListenCommitResponse;
    toJSON(_: ListenCommitResponse): JsonSafe<ListenCommitResponse>;
    fromPartial(_: Partial<ListenCommitResponse>): ListenCommitResponse;
    fromProtoMsg(message: ListenCommitResponseProtoMsg): ListenCommitResponse;
    toProto(message: ListenCommitResponse): Uint8Array;
    toProtoMsg(message: ListenCommitResponse): ListenCommitResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=grpc.d.ts.map