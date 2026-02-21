import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../cosmos/base/query/v1beta1/pagination.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * QueryDataRequest is the vstorage path data query.
 * @name QueryDataRequest
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryDataRequest
 */
export interface QueryDataRequest {
    path: string;
}
export interface QueryDataRequestProtoMsg {
    typeUrl: '/agoric.vstorage.QueryDataRequest';
    value: Uint8Array;
}
/**
 * QueryDataRequest is the vstorage path data query.
 * @name QueryDataRequestSDKType
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryDataRequest
 */
export interface QueryDataRequestSDKType {
    path: string;
}
/**
 * QueryDataResponse is the vstorage path data response.
 * @name QueryDataResponse
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryDataResponse
 */
export interface QueryDataResponse {
    value: string;
}
export interface QueryDataResponseProtoMsg {
    typeUrl: '/agoric.vstorage.QueryDataResponse';
    value: Uint8Array;
}
/**
 * QueryDataResponse is the vstorage path data response.
 * @name QueryDataResponseSDKType
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryDataResponse
 */
export interface QueryDataResponseSDKType {
    value: string;
}
/**
 * QueryCapDataRequest contains a path and formatting configuration.
 * @name QueryCapDataRequest
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryCapDataRequest
 */
export interface QueryCapDataRequest {
    path: string;
    /**
     * mediaType must be an actual media type in the registry at
     * https://www.iana.org/assignments/media-types/media-types.xhtml
     * or a special value that does not conflict with the media type syntax.
     * The only valid value is "JSON Lines", which is also the default.
     */
    mediaType: string;
    /**
     * itemFormat, if present, must be the special value "flat" to indicate that
     * the deep structure of each item should be flattened into a single level
     * with kebab-case keys (e.g., `{ "metrics": { "min": 0, "max": 88 } }` as
     * `{ "metrics-min": 0, "metrics-max": 88 }`).
     */
    itemFormat: string;
    /**
     * remotableValueFormat indicates how to transform references to opaque but
     * distinguishable Remotables into readable embedded representations.
     * * "object" represents each Remotable as an `{ id, allegedName }` object, e.g. `{ "id": "board007", "allegedName":
     * "IST brand" }`.
     * * "string" represents each Remotable as a string with bracket-wrapped contents including its alleged name and id,
     * e.g. "[Alleged: IST brand <board007>]".
     */
    remotableValueFormat: string;
}
export interface QueryCapDataRequestProtoMsg {
    typeUrl: '/agoric.vstorage.QueryCapDataRequest';
    value: Uint8Array;
}
/**
 * QueryCapDataRequest contains a path and formatting configuration.
 * @name QueryCapDataRequestSDKType
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryCapDataRequest
 */
export interface QueryCapDataRequestSDKType {
    path: string;
    media_type: string;
    item_format: string;
    remotable_value_format: string;
}
/**
 * QueryCapDataResponse represents the result with the requested formatting,
 * reserving space for future metadata such as media type.
 * @name QueryCapDataResponse
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryCapDataResponse
 */
export interface QueryCapDataResponse {
    blockHeight: string;
    value: string;
}
export interface QueryCapDataResponseProtoMsg {
    typeUrl: '/agoric.vstorage.QueryCapDataResponse';
    value: Uint8Array;
}
/**
 * QueryCapDataResponse represents the result with the requested formatting,
 * reserving space for future metadata such as media type.
 * @name QueryCapDataResponseSDKType
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryCapDataResponse
 */
export interface QueryCapDataResponseSDKType {
    block_height: string;
    value: string;
}
/**
 * QueryChildrenRequest is the vstorage path children query.
 * @name QueryChildrenRequest
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryChildrenRequest
 */
export interface QueryChildrenRequest {
    path: string;
    pagination?: PageRequest;
}
export interface QueryChildrenRequestProtoMsg {
    typeUrl: '/agoric.vstorage.QueryChildrenRequest';
    value: Uint8Array;
}
/**
 * QueryChildrenRequest is the vstorage path children query.
 * @name QueryChildrenRequestSDKType
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryChildrenRequest
 */
export interface QueryChildrenRequestSDKType {
    path: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryChildrenResponse is the vstorage path children response.
 * @name QueryChildrenResponse
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryChildrenResponse
 */
export interface QueryChildrenResponse {
    children: string[];
    pagination?: PageResponse;
}
export interface QueryChildrenResponseProtoMsg {
    typeUrl: '/agoric.vstorage.QueryChildrenResponse';
    value: Uint8Array;
}
/**
 * QueryChildrenResponse is the vstorage path children response.
 * @name QueryChildrenResponseSDKType
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryChildrenResponse
 */
export interface QueryChildrenResponseSDKType {
    children: string[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryDataRequest is the vstorage path data query.
 * @name QueryDataRequest
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryDataRequest
 */
export declare const QueryDataRequest: {
    typeUrl: "/agoric.vstorage.QueryDataRequest";
    is(o: any): o is QueryDataRequest;
    isSDK(o: any): o is QueryDataRequestSDKType;
    encode(message: QueryDataRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDataRequest;
    fromJSON(object: any): QueryDataRequest;
    toJSON(message: QueryDataRequest): JsonSafe<QueryDataRequest>;
    fromPartial(object: Partial<QueryDataRequest>): QueryDataRequest;
    fromProtoMsg(message: QueryDataRequestProtoMsg): QueryDataRequest;
    toProto(message: QueryDataRequest): Uint8Array;
    toProtoMsg(message: QueryDataRequest): QueryDataRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDataResponse is the vstorage path data response.
 * @name QueryDataResponse
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryDataResponse
 */
export declare const QueryDataResponse: {
    typeUrl: "/agoric.vstorage.QueryDataResponse";
    is(o: any): o is QueryDataResponse;
    isSDK(o: any): o is QueryDataResponseSDKType;
    encode(message: QueryDataResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDataResponse;
    fromJSON(object: any): QueryDataResponse;
    toJSON(message: QueryDataResponse): JsonSafe<QueryDataResponse>;
    fromPartial(object: Partial<QueryDataResponse>): QueryDataResponse;
    fromProtoMsg(message: QueryDataResponseProtoMsg): QueryDataResponse;
    toProto(message: QueryDataResponse): Uint8Array;
    toProtoMsg(message: QueryDataResponse): QueryDataResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryCapDataRequest contains a path and formatting configuration.
 * @name QueryCapDataRequest
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryCapDataRequest
 */
export declare const QueryCapDataRequest: {
    typeUrl: "/agoric.vstorage.QueryCapDataRequest";
    is(o: any): o is QueryCapDataRequest;
    isSDK(o: any): o is QueryCapDataRequestSDKType;
    encode(message: QueryCapDataRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryCapDataRequest;
    fromJSON(object: any): QueryCapDataRequest;
    toJSON(message: QueryCapDataRequest): JsonSafe<QueryCapDataRequest>;
    fromPartial(object: Partial<QueryCapDataRequest>): QueryCapDataRequest;
    fromProtoMsg(message: QueryCapDataRequestProtoMsg): QueryCapDataRequest;
    toProto(message: QueryCapDataRequest): Uint8Array;
    toProtoMsg(message: QueryCapDataRequest): QueryCapDataRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryCapDataResponse represents the result with the requested formatting,
 * reserving space for future metadata such as media type.
 * @name QueryCapDataResponse
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryCapDataResponse
 */
export declare const QueryCapDataResponse: {
    typeUrl: "/agoric.vstorage.QueryCapDataResponse";
    is(o: any): o is QueryCapDataResponse;
    isSDK(o: any): o is QueryCapDataResponseSDKType;
    encode(message: QueryCapDataResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryCapDataResponse;
    fromJSON(object: any): QueryCapDataResponse;
    toJSON(message: QueryCapDataResponse): JsonSafe<QueryCapDataResponse>;
    fromPartial(object: Partial<QueryCapDataResponse>): QueryCapDataResponse;
    fromProtoMsg(message: QueryCapDataResponseProtoMsg): QueryCapDataResponse;
    toProto(message: QueryCapDataResponse): Uint8Array;
    toProtoMsg(message: QueryCapDataResponse): QueryCapDataResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryChildrenRequest is the vstorage path children query.
 * @name QueryChildrenRequest
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryChildrenRequest
 */
export declare const QueryChildrenRequest: {
    typeUrl: "/agoric.vstorage.QueryChildrenRequest";
    is(o: any): o is QueryChildrenRequest;
    isSDK(o: any): o is QueryChildrenRequestSDKType;
    encode(message: QueryChildrenRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChildrenRequest;
    fromJSON(object: any): QueryChildrenRequest;
    toJSON(message: QueryChildrenRequest): JsonSafe<QueryChildrenRequest>;
    fromPartial(object: Partial<QueryChildrenRequest>): QueryChildrenRequest;
    fromProtoMsg(message: QueryChildrenRequestProtoMsg): QueryChildrenRequest;
    toProto(message: QueryChildrenRequest): Uint8Array;
    toProtoMsg(message: QueryChildrenRequest): QueryChildrenRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryChildrenResponse is the vstorage path children response.
 * @name QueryChildrenResponse
 * @package agoric.vstorage
 * @see proto type: agoric.vstorage.QueryChildrenResponse
 */
export declare const QueryChildrenResponse: {
    typeUrl: "/agoric.vstorage.QueryChildrenResponse";
    is(o: any): o is QueryChildrenResponse;
    isSDK(o: any): o is QueryChildrenResponseSDKType;
    encode(message: QueryChildrenResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChildrenResponse;
    fromJSON(object: any): QueryChildrenResponse;
    toJSON(message: QueryChildrenResponse): JsonSafe<QueryChildrenResponse>;
    fromPartial(object: Partial<QueryChildrenResponse>): QueryChildrenResponse;
    fromProtoMsg(message: QueryChildrenResponseProtoMsg): QueryChildrenResponse;
    toProto(message: QueryChildrenResponse): Uint8Array;
    toProtoMsg(message: QueryChildrenResponse): QueryChildrenResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map