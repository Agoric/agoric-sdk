import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../cosmos/base/query/v1beta1/pagination.js';
import { EpochInfo, type EpochInfoSDKType } from './genesis.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * @name QueryEpochsInfoRequest
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryEpochsInfoRequest
 */
export interface QueryEpochsInfoRequest {
    pagination?: PageRequest;
}
export interface QueryEpochsInfoRequestProtoMsg {
    typeUrl: '/stride.epochs.QueryEpochsInfoRequest';
    value: Uint8Array;
}
/**
 * @name QueryEpochsInfoRequestSDKType
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryEpochsInfoRequest
 */
export interface QueryEpochsInfoRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * @name QueryEpochsInfoResponse
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryEpochsInfoResponse
 */
export interface QueryEpochsInfoResponse {
    epochs: EpochInfo[];
    pagination?: PageResponse;
}
export interface QueryEpochsInfoResponseProtoMsg {
    typeUrl: '/stride.epochs.QueryEpochsInfoResponse';
    value: Uint8Array;
}
/**
 * @name QueryEpochsInfoResponseSDKType
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryEpochsInfoResponse
 */
export interface QueryEpochsInfoResponseSDKType {
    epochs: EpochInfoSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * @name QueryCurrentEpochRequest
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryCurrentEpochRequest
 */
export interface QueryCurrentEpochRequest {
    identifier: string;
}
export interface QueryCurrentEpochRequestProtoMsg {
    typeUrl: '/stride.epochs.QueryCurrentEpochRequest';
    value: Uint8Array;
}
/**
 * @name QueryCurrentEpochRequestSDKType
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryCurrentEpochRequest
 */
export interface QueryCurrentEpochRequestSDKType {
    identifier: string;
}
/**
 * @name QueryCurrentEpochResponse
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryCurrentEpochResponse
 */
export interface QueryCurrentEpochResponse {
    currentEpoch: bigint;
}
export interface QueryCurrentEpochResponseProtoMsg {
    typeUrl: '/stride.epochs.QueryCurrentEpochResponse';
    value: Uint8Array;
}
/**
 * @name QueryCurrentEpochResponseSDKType
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryCurrentEpochResponse
 */
export interface QueryCurrentEpochResponseSDKType {
    current_epoch: bigint;
}
/**
 * @name QueryEpochInfoRequest
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryEpochInfoRequest
 */
export interface QueryEpochInfoRequest {
    identifier: string;
}
export interface QueryEpochInfoRequestProtoMsg {
    typeUrl: '/stride.epochs.QueryEpochInfoRequest';
    value: Uint8Array;
}
/**
 * @name QueryEpochInfoRequestSDKType
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryEpochInfoRequest
 */
export interface QueryEpochInfoRequestSDKType {
    identifier: string;
}
/**
 * @name QueryEpochInfoResponse
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryEpochInfoResponse
 */
export interface QueryEpochInfoResponse {
    epoch: EpochInfo;
}
export interface QueryEpochInfoResponseProtoMsg {
    typeUrl: '/stride.epochs.QueryEpochInfoResponse';
    value: Uint8Array;
}
/**
 * @name QueryEpochInfoResponseSDKType
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryEpochInfoResponse
 */
export interface QueryEpochInfoResponseSDKType {
    epoch: EpochInfoSDKType;
}
/**
 * @name QueryEpochsInfoRequest
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryEpochsInfoRequest
 */
export declare const QueryEpochsInfoRequest: {
    typeUrl: "/stride.epochs.QueryEpochsInfoRequest";
    is(o: any): o is QueryEpochsInfoRequest;
    isSDK(o: any): o is QueryEpochsInfoRequestSDKType;
    encode(message: QueryEpochsInfoRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryEpochsInfoRequest;
    fromJSON(object: any): QueryEpochsInfoRequest;
    toJSON(message: QueryEpochsInfoRequest): JsonSafe<QueryEpochsInfoRequest>;
    fromPartial(object: Partial<QueryEpochsInfoRequest>): QueryEpochsInfoRequest;
    fromProtoMsg(message: QueryEpochsInfoRequestProtoMsg): QueryEpochsInfoRequest;
    toProto(message: QueryEpochsInfoRequest): Uint8Array;
    toProtoMsg(message: QueryEpochsInfoRequest): QueryEpochsInfoRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryEpochsInfoResponse
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryEpochsInfoResponse
 */
export declare const QueryEpochsInfoResponse: {
    typeUrl: "/stride.epochs.QueryEpochsInfoResponse";
    is(o: any): o is QueryEpochsInfoResponse;
    isSDK(o: any): o is QueryEpochsInfoResponseSDKType;
    encode(message: QueryEpochsInfoResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryEpochsInfoResponse;
    fromJSON(object: any): QueryEpochsInfoResponse;
    toJSON(message: QueryEpochsInfoResponse): JsonSafe<QueryEpochsInfoResponse>;
    fromPartial(object: Partial<QueryEpochsInfoResponse>): QueryEpochsInfoResponse;
    fromProtoMsg(message: QueryEpochsInfoResponseProtoMsg): QueryEpochsInfoResponse;
    toProto(message: QueryEpochsInfoResponse): Uint8Array;
    toProtoMsg(message: QueryEpochsInfoResponse): QueryEpochsInfoResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryCurrentEpochRequest
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryCurrentEpochRequest
 */
export declare const QueryCurrentEpochRequest: {
    typeUrl: "/stride.epochs.QueryCurrentEpochRequest";
    is(o: any): o is QueryCurrentEpochRequest;
    isSDK(o: any): o is QueryCurrentEpochRequestSDKType;
    encode(message: QueryCurrentEpochRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryCurrentEpochRequest;
    fromJSON(object: any): QueryCurrentEpochRequest;
    toJSON(message: QueryCurrentEpochRequest): JsonSafe<QueryCurrentEpochRequest>;
    fromPartial(object: Partial<QueryCurrentEpochRequest>): QueryCurrentEpochRequest;
    fromProtoMsg(message: QueryCurrentEpochRequestProtoMsg): QueryCurrentEpochRequest;
    toProto(message: QueryCurrentEpochRequest): Uint8Array;
    toProtoMsg(message: QueryCurrentEpochRequest): QueryCurrentEpochRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryCurrentEpochResponse
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryCurrentEpochResponse
 */
export declare const QueryCurrentEpochResponse: {
    typeUrl: "/stride.epochs.QueryCurrentEpochResponse";
    is(o: any): o is QueryCurrentEpochResponse;
    isSDK(o: any): o is QueryCurrentEpochResponseSDKType;
    encode(message: QueryCurrentEpochResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryCurrentEpochResponse;
    fromJSON(object: any): QueryCurrentEpochResponse;
    toJSON(message: QueryCurrentEpochResponse): JsonSafe<QueryCurrentEpochResponse>;
    fromPartial(object: Partial<QueryCurrentEpochResponse>): QueryCurrentEpochResponse;
    fromProtoMsg(message: QueryCurrentEpochResponseProtoMsg): QueryCurrentEpochResponse;
    toProto(message: QueryCurrentEpochResponse): Uint8Array;
    toProtoMsg(message: QueryCurrentEpochResponse): QueryCurrentEpochResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryEpochInfoRequest
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryEpochInfoRequest
 */
export declare const QueryEpochInfoRequest: {
    typeUrl: "/stride.epochs.QueryEpochInfoRequest";
    is(o: any): o is QueryEpochInfoRequest;
    isSDK(o: any): o is QueryEpochInfoRequestSDKType;
    encode(message: QueryEpochInfoRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryEpochInfoRequest;
    fromJSON(object: any): QueryEpochInfoRequest;
    toJSON(message: QueryEpochInfoRequest): JsonSafe<QueryEpochInfoRequest>;
    fromPartial(object: Partial<QueryEpochInfoRequest>): QueryEpochInfoRequest;
    fromProtoMsg(message: QueryEpochInfoRequestProtoMsg): QueryEpochInfoRequest;
    toProto(message: QueryEpochInfoRequest): Uint8Array;
    toProtoMsg(message: QueryEpochInfoRequest): QueryEpochInfoRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryEpochInfoResponse
 * @package stride.epochs
 * @see proto type: stride.epochs.QueryEpochInfoResponse
 */
export declare const QueryEpochInfoResponse: {
    typeUrl: "/stride.epochs.QueryEpochInfoResponse";
    is(o: any): o is QueryEpochInfoResponse;
    isSDK(o: any): o is QueryEpochInfoResponseSDKType;
    encode(message: QueryEpochInfoResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryEpochInfoResponse;
    fromJSON(object: any): QueryEpochInfoResponse;
    toJSON(message: QueryEpochInfoResponse): JsonSafe<QueryEpochInfoResponse>;
    fromPartial(object: Partial<QueryEpochInfoResponse>): QueryEpochInfoResponse;
    fromProtoMsg(message: QueryEpochInfoResponseProtoMsg): QueryEpochInfoResponse;
    toProto(message: QueryEpochInfoResponse): Uint8Array;
    toProtoMsg(message: QueryEpochInfoResponse): QueryEpochInfoResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map