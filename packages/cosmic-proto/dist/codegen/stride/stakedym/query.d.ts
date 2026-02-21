import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../cosmos/base/query/v1beta1/pagination.js';
import { HostZone, type HostZoneSDKType, DelegationRecord, type DelegationRecordSDKType, UnbondingRecord, type UnbondingRecordSDKType, SlashRecord, type SlashRecordSDKType, RedemptionRecord, type RedemptionRecordSDKType } from './stakedym.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * Host Zone
 * @name QueryHostZoneRequest
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryHostZoneRequest
 */
export interface QueryHostZoneRequest {
}
export interface QueryHostZoneRequestProtoMsg {
    typeUrl: '/stride.stakedym.QueryHostZoneRequest';
    value: Uint8Array;
}
/**
 * Host Zone
 * @name QueryHostZoneRequestSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryHostZoneRequest
 */
export interface QueryHostZoneRequestSDKType {
}
/**
 * @name QueryHostZoneResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryHostZoneResponse
 */
export interface QueryHostZoneResponse {
    hostZone?: HostZone;
}
export interface QueryHostZoneResponseProtoMsg {
    typeUrl: '/stride.stakedym.QueryHostZoneResponse';
    value: Uint8Array;
}
/**
 * @name QueryHostZoneResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryHostZoneResponse
 */
export interface QueryHostZoneResponseSDKType {
    host_zone?: HostZoneSDKType;
}
/**
 * All Delegation Records
 * @name QueryDelegationRecordsRequest
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryDelegationRecordsRequest
 */
export interface QueryDelegationRecordsRequest {
    includeArchived: boolean;
}
export interface QueryDelegationRecordsRequestProtoMsg {
    typeUrl: '/stride.stakedym.QueryDelegationRecordsRequest';
    value: Uint8Array;
}
/**
 * All Delegation Records
 * @name QueryDelegationRecordsRequestSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryDelegationRecordsRequest
 */
export interface QueryDelegationRecordsRequestSDKType {
    include_archived: boolean;
}
/**
 * @name QueryDelegationRecordsResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryDelegationRecordsResponse
 */
export interface QueryDelegationRecordsResponse {
    delegationRecords: DelegationRecord[];
}
export interface QueryDelegationRecordsResponseProtoMsg {
    typeUrl: '/stride.stakedym.QueryDelegationRecordsResponse';
    value: Uint8Array;
}
/**
 * @name QueryDelegationRecordsResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryDelegationRecordsResponse
 */
export interface QueryDelegationRecordsResponseSDKType {
    delegation_records: DelegationRecordSDKType[];
}
/**
 * All Unbonding Records
 * @name QueryUnbondingRecordsRequest
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryUnbondingRecordsRequest
 */
export interface QueryUnbondingRecordsRequest {
    includeArchived: boolean;
}
export interface QueryUnbondingRecordsRequestProtoMsg {
    typeUrl: '/stride.stakedym.QueryUnbondingRecordsRequest';
    value: Uint8Array;
}
/**
 * All Unbonding Records
 * @name QueryUnbondingRecordsRequestSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryUnbondingRecordsRequest
 */
export interface QueryUnbondingRecordsRequestSDKType {
    include_archived: boolean;
}
/**
 * @name QueryUnbondingRecordsResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryUnbondingRecordsResponse
 */
export interface QueryUnbondingRecordsResponse {
    unbondingRecords: UnbondingRecord[];
}
export interface QueryUnbondingRecordsResponseProtoMsg {
    typeUrl: '/stride.stakedym.QueryUnbondingRecordsResponse';
    value: Uint8Array;
}
/**
 * @name QueryUnbondingRecordsResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryUnbondingRecordsResponse
 */
export interface QueryUnbondingRecordsResponseSDKType {
    unbonding_records: UnbondingRecordSDKType[];
}
/**
 * Single Redemption Record
 * @name QueryRedemptionRecordRequest
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryRedemptionRecordRequest
 */
export interface QueryRedemptionRecordRequest {
    unbondingRecordId: bigint;
    address: string;
}
export interface QueryRedemptionRecordRequestProtoMsg {
    typeUrl: '/stride.stakedym.QueryRedemptionRecordRequest';
    value: Uint8Array;
}
/**
 * Single Redemption Record
 * @name QueryRedemptionRecordRequestSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryRedemptionRecordRequest
 */
export interface QueryRedemptionRecordRequestSDKType {
    unbonding_record_id: bigint;
    address: string;
}
/**
 * @name QueryRedemptionRecordResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryRedemptionRecordResponse
 */
export interface QueryRedemptionRecordResponse {
    redemptionRecordResponse?: RedemptionRecordResponse;
}
export interface QueryRedemptionRecordResponseProtoMsg {
    typeUrl: '/stride.stakedym.QueryRedemptionRecordResponse';
    value: Uint8Array;
}
/**
 * @name QueryRedemptionRecordResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryRedemptionRecordResponse
 */
export interface QueryRedemptionRecordResponseSDKType {
    redemption_record_response?: RedemptionRecordResponseSDKType;
}
/**
 * All Redemption Records
 * @name QueryRedemptionRecordsRequest
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryRedemptionRecordsRequest
 */
export interface QueryRedemptionRecordsRequest {
    address: string;
    unbondingRecordId: bigint;
    pagination?: PageRequest;
}
export interface QueryRedemptionRecordsRequestProtoMsg {
    typeUrl: '/stride.stakedym.QueryRedemptionRecordsRequest';
    value: Uint8Array;
}
/**
 * All Redemption Records
 * @name QueryRedemptionRecordsRequestSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryRedemptionRecordsRequest
 */
export interface QueryRedemptionRecordsRequestSDKType {
    address: string;
    unbonding_record_id: bigint;
    pagination?: PageRequestSDKType;
}
/**
 * @name QueryRedemptionRecordsResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryRedemptionRecordsResponse
 */
export interface QueryRedemptionRecordsResponse {
    redemptionRecordResponses: RedemptionRecordResponse[];
    pagination?: PageResponse;
}
export interface QueryRedemptionRecordsResponseProtoMsg {
    typeUrl: '/stride.stakedym.QueryRedemptionRecordsResponse';
    value: Uint8Array;
}
/**
 * @name QueryRedemptionRecordsResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryRedemptionRecordsResponse
 */
export interface QueryRedemptionRecordsResponseSDKType {
    redemption_record_responses: RedemptionRecordResponseSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * All Slash Records
 * @name QuerySlashRecordsRequest
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QuerySlashRecordsRequest
 */
export interface QuerySlashRecordsRequest {
}
export interface QuerySlashRecordsRequestProtoMsg {
    typeUrl: '/stride.stakedym.QuerySlashRecordsRequest';
    value: Uint8Array;
}
/**
 * All Slash Records
 * @name QuerySlashRecordsRequestSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QuerySlashRecordsRequest
 */
export interface QuerySlashRecordsRequestSDKType {
}
/**
 * @name QuerySlashRecordsResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QuerySlashRecordsResponse
 */
export interface QuerySlashRecordsResponse {
    slashRecords: SlashRecord[];
}
export interface QuerySlashRecordsResponseProtoMsg {
    typeUrl: '/stride.stakedym.QuerySlashRecordsResponse';
    value: Uint8Array;
}
/**
 * @name QuerySlashRecordsResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QuerySlashRecordsResponse
 */
export interface QuerySlashRecordsResponseSDKType {
    slash_records: SlashRecordSDKType[];
}
/**
 * Data structure for frontend to consume
 * @name RedemptionRecordResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.RedemptionRecordResponse
 */
export interface RedemptionRecordResponse {
    /**
     * Redemption record
     */
    redemptionRecord?: RedemptionRecord;
    /**
     * The Unix timestamp (in seconds) at which the unbonding for the UR
     * associated with this RR completes
     */
    unbondingCompletionTimeSeconds: bigint;
}
export interface RedemptionRecordResponseProtoMsg {
    typeUrl: '/stride.stakedym.RedemptionRecordResponse';
    value: Uint8Array;
}
/**
 * Data structure for frontend to consume
 * @name RedemptionRecordResponseSDKType
 * @package stride.stakedym
 * @see proto type: stride.stakedym.RedemptionRecordResponse
 */
export interface RedemptionRecordResponseSDKType {
    redemption_record?: RedemptionRecordSDKType;
    unbonding_completion_time_seconds: bigint;
}
/**
 * Host Zone
 * @name QueryHostZoneRequest
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryHostZoneRequest
 */
export declare const QueryHostZoneRequest: {
    typeUrl: "/stride.stakedym.QueryHostZoneRequest";
    is(o: any): o is QueryHostZoneRequest;
    isSDK(o: any): o is QueryHostZoneRequestSDKType;
    encode(_: QueryHostZoneRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryHostZoneRequest;
    fromJSON(_: any): QueryHostZoneRequest;
    toJSON(_: QueryHostZoneRequest): JsonSafe<QueryHostZoneRequest>;
    fromPartial(_: Partial<QueryHostZoneRequest>): QueryHostZoneRequest;
    fromProtoMsg(message: QueryHostZoneRequestProtoMsg): QueryHostZoneRequest;
    toProto(message: QueryHostZoneRequest): Uint8Array;
    toProtoMsg(message: QueryHostZoneRequest): QueryHostZoneRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryHostZoneResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryHostZoneResponse
 */
export declare const QueryHostZoneResponse: {
    typeUrl: "/stride.stakedym.QueryHostZoneResponse";
    is(o: any): o is QueryHostZoneResponse;
    isSDK(o: any): o is QueryHostZoneResponseSDKType;
    encode(message: QueryHostZoneResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryHostZoneResponse;
    fromJSON(object: any): QueryHostZoneResponse;
    toJSON(message: QueryHostZoneResponse): JsonSafe<QueryHostZoneResponse>;
    fromPartial(object: Partial<QueryHostZoneResponse>): QueryHostZoneResponse;
    fromProtoMsg(message: QueryHostZoneResponseProtoMsg): QueryHostZoneResponse;
    toProto(message: QueryHostZoneResponse): Uint8Array;
    toProtoMsg(message: QueryHostZoneResponse): QueryHostZoneResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * All Delegation Records
 * @name QueryDelegationRecordsRequest
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryDelegationRecordsRequest
 */
export declare const QueryDelegationRecordsRequest: {
    typeUrl: "/stride.stakedym.QueryDelegationRecordsRequest";
    is(o: any): o is QueryDelegationRecordsRequest;
    isSDK(o: any): o is QueryDelegationRecordsRequestSDKType;
    encode(message: QueryDelegationRecordsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegationRecordsRequest;
    fromJSON(object: any): QueryDelegationRecordsRequest;
    toJSON(message: QueryDelegationRecordsRequest): JsonSafe<QueryDelegationRecordsRequest>;
    fromPartial(object: Partial<QueryDelegationRecordsRequest>): QueryDelegationRecordsRequest;
    fromProtoMsg(message: QueryDelegationRecordsRequestProtoMsg): QueryDelegationRecordsRequest;
    toProto(message: QueryDelegationRecordsRequest): Uint8Array;
    toProtoMsg(message: QueryDelegationRecordsRequest): QueryDelegationRecordsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryDelegationRecordsResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryDelegationRecordsResponse
 */
export declare const QueryDelegationRecordsResponse: {
    typeUrl: "/stride.stakedym.QueryDelegationRecordsResponse";
    is(o: any): o is QueryDelegationRecordsResponse;
    isSDK(o: any): o is QueryDelegationRecordsResponseSDKType;
    encode(message: QueryDelegationRecordsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDelegationRecordsResponse;
    fromJSON(object: any): QueryDelegationRecordsResponse;
    toJSON(message: QueryDelegationRecordsResponse): JsonSafe<QueryDelegationRecordsResponse>;
    fromPartial(object: Partial<QueryDelegationRecordsResponse>): QueryDelegationRecordsResponse;
    fromProtoMsg(message: QueryDelegationRecordsResponseProtoMsg): QueryDelegationRecordsResponse;
    toProto(message: QueryDelegationRecordsResponse): Uint8Array;
    toProtoMsg(message: QueryDelegationRecordsResponse): QueryDelegationRecordsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * All Unbonding Records
 * @name QueryUnbondingRecordsRequest
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryUnbondingRecordsRequest
 */
export declare const QueryUnbondingRecordsRequest: {
    typeUrl: "/stride.stakedym.QueryUnbondingRecordsRequest";
    is(o: any): o is QueryUnbondingRecordsRequest;
    isSDK(o: any): o is QueryUnbondingRecordsRequestSDKType;
    encode(message: QueryUnbondingRecordsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUnbondingRecordsRequest;
    fromJSON(object: any): QueryUnbondingRecordsRequest;
    toJSON(message: QueryUnbondingRecordsRequest): JsonSafe<QueryUnbondingRecordsRequest>;
    fromPartial(object: Partial<QueryUnbondingRecordsRequest>): QueryUnbondingRecordsRequest;
    fromProtoMsg(message: QueryUnbondingRecordsRequestProtoMsg): QueryUnbondingRecordsRequest;
    toProto(message: QueryUnbondingRecordsRequest): Uint8Array;
    toProtoMsg(message: QueryUnbondingRecordsRequest): QueryUnbondingRecordsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryUnbondingRecordsResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryUnbondingRecordsResponse
 */
export declare const QueryUnbondingRecordsResponse: {
    typeUrl: "/stride.stakedym.QueryUnbondingRecordsResponse";
    is(o: any): o is QueryUnbondingRecordsResponse;
    isSDK(o: any): o is QueryUnbondingRecordsResponseSDKType;
    encode(message: QueryUnbondingRecordsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUnbondingRecordsResponse;
    fromJSON(object: any): QueryUnbondingRecordsResponse;
    toJSON(message: QueryUnbondingRecordsResponse): JsonSafe<QueryUnbondingRecordsResponse>;
    fromPartial(object: Partial<QueryUnbondingRecordsResponse>): QueryUnbondingRecordsResponse;
    fromProtoMsg(message: QueryUnbondingRecordsResponseProtoMsg): QueryUnbondingRecordsResponse;
    toProto(message: QueryUnbondingRecordsResponse): Uint8Array;
    toProtoMsg(message: QueryUnbondingRecordsResponse): QueryUnbondingRecordsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Single Redemption Record
 * @name QueryRedemptionRecordRequest
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryRedemptionRecordRequest
 */
export declare const QueryRedemptionRecordRequest: {
    typeUrl: "/stride.stakedym.QueryRedemptionRecordRequest";
    is(o: any): o is QueryRedemptionRecordRequest;
    isSDK(o: any): o is QueryRedemptionRecordRequestSDKType;
    encode(message: QueryRedemptionRecordRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRedemptionRecordRequest;
    fromJSON(object: any): QueryRedemptionRecordRequest;
    toJSON(message: QueryRedemptionRecordRequest): JsonSafe<QueryRedemptionRecordRequest>;
    fromPartial(object: Partial<QueryRedemptionRecordRequest>): QueryRedemptionRecordRequest;
    fromProtoMsg(message: QueryRedemptionRecordRequestProtoMsg): QueryRedemptionRecordRequest;
    toProto(message: QueryRedemptionRecordRequest): Uint8Array;
    toProtoMsg(message: QueryRedemptionRecordRequest): QueryRedemptionRecordRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryRedemptionRecordResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryRedemptionRecordResponse
 */
export declare const QueryRedemptionRecordResponse: {
    typeUrl: "/stride.stakedym.QueryRedemptionRecordResponse";
    is(o: any): o is QueryRedemptionRecordResponse;
    isSDK(o: any): o is QueryRedemptionRecordResponseSDKType;
    encode(message: QueryRedemptionRecordResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRedemptionRecordResponse;
    fromJSON(object: any): QueryRedemptionRecordResponse;
    toJSON(message: QueryRedemptionRecordResponse): JsonSafe<QueryRedemptionRecordResponse>;
    fromPartial(object: Partial<QueryRedemptionRecordResponse>): QueryRedemptionRecordResponse;
    fromProtoMsg(message: QueryRedemptionRecordResponseProtoMsg): QueryRedemptionRecordResponse;
    toProto(message: QueryRedemptionRecordResponse): Uint8Array;
    toProtoMsg(message: QueryRedemptionRecordResponse): QueryRedemptionRecordResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * All Redemption Records
 * @name QueryRedemptionRecordsRequest
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryRedemptionRecordsRequest
 */
export declare const QueryRedemptionRecordsRequest: {
    typeUrl: "/stride.stakedym.QueryRedemptionRecordsRequest";
    is(o: any): o is QueryRedemptionRecordsRequest;
    isSDK(o: any): o is QueryRedemptionRecordsRequestSDKType;
    encode(message: QueryRedemptionRecordsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRedemptionRecordsRequest;
    fromJSON(object: any): QueryRedemptionRecordsRequest;
    toJSON(message: QueryRedemptionRecordsRequest): JsonSafe<QueryRedemptionRecordsRequest>;
    fromPartial(object: Partial<QueryRedemptionRecordsRequest>): QueryRedemptionRecordsRequest;
    fromProtoMsg(message: QueryRedemptionRecordsRequestProtoMsg): QueryRedemptionRecordsRequest;
    toProto(message: QueryRedemptionRecordsRequest): Uint8Array;
    toProtoMsg(message: QueryRedemptionRecordsRequest): QueryRedemptionRecordsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryRedemptionRecordsResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QueryRedemptionRecordsResponse
 */
export declare const QueryRedemptionRecordsResponse: {
    typeUrl: "/stride.stakedym.QueryRedemptionRecordsResponse";
    is(o: any): o is QueryRedemptionRecordsResponse;
    isSDK(o: any): o is QueryRedemptionRecordsResponseSDKType;
    encode(message: QueryRedemptionRecordsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryRedemptionRecordsResponse;
    fromJSON(object: any): QueryRedemptionRecordsResponse;
    toJSON(message: QueryRedemptionRecordsResponse): JsonSafe<QueryRedemptionRecordsResponse>;
    fromPartial(object: Partial<QueryRedemptionRecordsResponse>): QueryRedemptionRecordsResponse;
    fromProtoMsg(message: QueryRedemptionRecordsResponseProtoMsg): QueryRedemptionRecordsResponse;
    toProto(message: QueryRedemptionRecordsResponse): Uint8Array;
    toProtoMsg(message: QueryRedemptionRecordsResponse): QueryRedemptionRecordsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * All Slash Records
 * @name QuerySlashRecordsRequest
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QuerySlashRecordsRequest
 */
export declare const QuerySlashRecordsRequest: {
    typeUrl: "/stride.stakedym.QuerySlashRecordsRequest";
    is(o: any): o is QuerySlashRecordsRequest;
    isSDK(o: any): o is QuerySlashRecordsRequestSDKType;
    encode(_: QuerySlashRecordsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QuerySlashRecordsRequest;
    fromJSON(_: any): QuerySlashRecordsRequest;
    toJSON(_: QuerySlashRecordsRequest): JsonSafe<QuerySlashRecordsRequest>;
    fromPartial(_: Partial<QuerySlashRecordsRequest>): QuerySlashRecordsRequest;
    fromProtoMsg(message: QuerySlashRecordsRequestProtoMsg): QuerySlashRecordsRequest;
    toProto(message: QuerySlashRecordsRequest): Uint8Array;
    toProtoMsg(message: QuerySlashRecordsRequest): QuerySlashRecordsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QuerySlashRecordsResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.QuerySlashRecordsResponse
 */
export declare const QuerySlashRecordsResponse: {
    typeUrl: "/stride.stakedym.QuerySlashRecordsResponse";
    is(o: any): o is QuerySlashRecordsResponse;
    isSDK(o: any): o is QuerySlashRecordsResponseSDKType;
    encode(message: QuerySlashRecordsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QuerySlashRecordsResponse;
    fromJSON(object: any): QuerySlashRecordsResponse;
    toJSON(message: QuerySlashRecordsResponse): JsonSafe<QuerySlashRecordsResponse>;
    fromPartial(object: Partial<QuerySlashRecordsResponse>): QuerySlashRecordsResponse;
    fromProtoMsg(message: QuerySlashRecordsResponseProtoMsg): QuerySlashRecordsResponse;
    toProto(message: QuerySlashRecordsResponse): Uint8Array;
    toProtoMsg(message: QuerySlashRecordsResponse): QuerySlashRecordsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Data structure for frontend to consume
 * @name RedemptionRecordResponse
 * @package stride.stakedym
 * @see proto type: stride.stakedym.RedemptionRecordResponse
 */
export declare const RedemptionRecordResponse: {
    typeUrl: "/stride.stakedym.RedemptionRecordResponse";
    is(o: any): o is RedemptionRecordResponse;
    isSDK(o: any): o is RedemptionRecordResponseSDKType;
    encode(message: RedemptionRecordResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): RedemptionRecordResponse;
    fromJSON(object: any): RedemptionRecordResponse;
    toJSON(message: RedemptionRecordResponse): JsonSafe<RedemptionRecordResponse>;
    fromPartial(object: Partial<RedemptionRecordResponse>): RedemptionRecordResponse;
    fromProtoMsg(message: RedemptionRecordResponseProtoMsg): RedemptionRecordResponse;
    toProto(message: RedemptionRecordResponse): Uint8Array;
    toProtoMsg(message: RedemptionRecordResponse): RedemptionRecordResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map