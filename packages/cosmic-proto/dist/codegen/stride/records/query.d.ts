import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../cosmos/base/query/v1beta1/pagination.js';
import { Params, type ParamsSDKType } from './params.js';
import { DepositRecord, type DepositRecordSDKType, UserRedemptionRecord, type UserRedemptionRecordSDKType, EpochUnbondingRecord, type EpochUnbondingRecordSDKType, LSMTokenDeposit, type LSMTokenDepositSDKType } from './records.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * QueryParamsRequest is request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package stride.records
 * @see proto type: stride.records.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/stride.records.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest is request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
}
/**
 * QueryParamsResponse is response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package stride.records
 * @see proto type: stride.records.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * params holds all the parameters of this module.
     */
    params: Params;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/stride.records.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse is response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    params: ParamsSDKType;
}
/**
 * @name QueryGetDepositRecordRequest
 * @package stride.records
 * @see proto type: stride.records.QueryGetDepositRecordRequest
 */
export interface QueryGetDepositRecordRequest {
    id: bigint;
}
export interface QueryGetDepositRecordRequestProtoMsg {
    typeUrl: '/stride.records.QueryGetDepositRecordRequest';
    value: Uint8Array;
}
/**
 * @name QueryGetDepositRecordRequestSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryGetDepositRecordRequest
 */
export interface QueryGetDepositRecordRequestSDKType {
    id: bigint;
}
/**
 * @name QueryGetDepositRecordResponse
 * @package stride.records
 * @see proto type: stride.records.QueryGetDepositRecordResponse
 */
export interface QueryGetDepositRecordResponse {
    depositRecord: DepositRecord;
}
export interface QueryGetDepositRecordResponseProtoMsg {
    typeUrl: '/stride.records.QueryGetDepositRecordResponse';
    value: Uint8Array;
}
/**
 * @name QueryGetDepositRecordResponseSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryGetDepositRecordResponse
 */
export interface QueryGetDepositRecordResponseSDKType {
    deposit_record: DepositRecordSDKType;
}
/**
 * @name QueryAllDepositRecordRequest
 * @package stride.records
 * @see proto type: stride.records.QueryAllDepositRecordRequest
 */
export interface QueryAllDepositRecordRequest {
    pagination?: PageRequest;
}
export interface QueryAllDepositRecordRequestProtoMsg {
    typeUrl: '/stride.records.QueryAllDepositRecordRequest';
    value: Uint8Array;
}
/**
 * @name QueryAllDepositRecordRequestSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryAllDepositRecordRequest
 */
export interface QueryAllDepositRecordRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * @name QueryAllDepositRecordResponse
 * @package stride.records
 * @see proto type: stride.records.QueryAllDepositRecordResponse
 */
export interface QueryAllDepositRecordResponse {
    depositRecord: DepositRecord[];
    pagination?: PageResponse;
}
export interface QueryAllDepositRecordResponseProtoMsg {
    typeUrl: '/stride.records.QueryAllDepositRecordResponse';
    value: Uint8Array;
}
/**
 * @name QueryAllDepositRecordResponseSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryAllDepositRecordResponse
 */
export interface QueryAllDepositRecordResponseSDKType {
    deposit_record: DepositRecordSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * @name QueryDepositRecordByHostRequest
 * @package stride.records
 * @see proto type: stride.records.QueryDepositRecordByHostRequest
 */
export interface QueryDepositRecordByHostRequest {
    hostZoneId: string;
}
export interface QueryDepositRecordByHostRequestProtoMsg {
    typeUrl: '/stride.records.QueryDepositRecordByHostRequest';
    value: Uint8Array;
}
/**
 * @name QueryDepositRecordByHostRequestSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryDepositRecordByHostRequest
 */
export interface QueryDepositRecordByHostRequestSDKType {
    host_zone_id: string;
}
/**
 * @name QueryDepositRecordByHostResponse
 * @package stride.records
 * @see proto type: stride.records.QueryDepositRecordByHostResponse
 */
export interface QueryDepositRecordByHostResponse {
    depositRecord: DepositRecord[];
}
export interface QueryDepositRecordByHostResponseProtoMsg {
    typeUrl: '/stride.records.QueryDepositRecordByHostResponse';
    value: Uint8Array;
}
/**
 * @name QueryDepositRecordByHostResponseSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryDepositRecordByHostResponse
 */
export interface QueryDepositRecordByHostResponseSDKType {
    deposit_record: DepositRecordSDKType[];
}
/**
 * @name QueryGetUserRedemptionRecordRequest
 * @package stride.records
 * @see proto type: stride.records.QueryGetUserRedemptionRecordRequest
 */
export interface QueryGetUserRedemptionRecordRequest {
    id: string;
}
export interface QueryGetUserRedemptionRecordRequestProtoMsg {
    typeUrl: '/stride.records.QueryGetUserRedemptionRecordRequest';
    value: Uint8Array;
}
/**
 * @name QueryGetUserRedemptionRecordRequestSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryGetUserRedemptionRecordRequest
 */
export interface QueryGetUserRedemptionRecordRequestSDKType {
    id: string;
}
/**
 * @name QueryGetUserRedemptionRecordResponse
 * @package stride.records
 * @see proto type: stride.records.QueryGetUserRedemptionRecordResponse
 */
export interface QueryGetUserRedemptionRecordResponse {
    userRedemptionRecord: UserRedemptionRecord;
}
export interface QueryGetUserRedemptionRecordResponseProtoMsg {
    typeUrl: '/stride.records.QueryGetUserRedemptionRecordResponse';
    value: Uint8Array;
}
/**
 * @name QueryGetUserRedemptionRecordResponseSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryGetUserRedemptionRecordResponse
 */
export interface QueryGetUserRedemptionRecordResponseSDKType {
    user_redemption_record: UserRedemptionRecordSDKType;
}
/**
 * @name QueryAllUserRedemptionRecordRequest
 * @package stride.records
 * @see proto type: stride.records.QueryAllUserRedemptionRecordRequest
 */
export interface QueryAllUserRedemptionRecordRequest {
    pagination?: PageRequest;
}
export interface QueryAllUserRedemptionRecordRequestProtoMsg {
    typeUrl: '/stride.records.QueryAllUserRedemptionRecordRequest';
    value: Uint8Array;
}
/**
 * @name QueryAllUserRedemptionRecordRequestSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryAllUserRedemptionRecordRequest
 */
export interface QueryAllUserRedemptionRecordRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * @name QueryAllUserRedemptionRecordResponse
 * @package stride.records
 * @see proto type: stride.records.QueryAllUserRedemptionRecordResponse
 */
export interface QueryAllUserRedemptionRecordResponse {
    userRedemptionRecord: UserRedemptionRecord[];
    pagination?: PageResponse;
}
export interface QueryAllUserRedemptionRecordResponseProtoMsg {
    typeUrl: '/stride.records.QueryAllUserRedemptionRecordResponse';
    value: Uint8Array;
}
/**
 * @name QueryAllUserRedemptionRecordResponseSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryAllUserRedemptionRecordResponse
 */
export interface QueryAllUserRedemptionRecordResponseSDKType {
    user_redemption_record: UserRedemptionRecordSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * Query UserRedemptionRecords by chainId / userId pair
 * @name QueryAllUserRedemptionRecordForUserRequest
 * @package stride.records
 * @see proto type: stride.records.QueryAllUserRedemptionRecordForUserRequest
 */
export interface QueryAllUserRedemptionRecordForUserRequest {
    chainId: string;
    day: bigint;
    address: string;
    limit: bigint;
    pagination?: PageRequest;
}
export interface QueryAllUserRedemptionRecordForUserRequestProtoMsg {
    typeUrl: '/stride.records.QueryAllUserRedemptionRecordForUserRequest';
    value: Uint8Array;
}
/**
 * Query UserRedemptionRecords by chainId / userId pair
 * @name QueryAllUserRedemptionRecordForUserRequestSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryAllUserRedemptionRecordForUserRequest
 */
export interface QueryAllUserRedemptionRecordForUserRequestSDKType {
    chain_id: string;
    day: bigint;
    address: string;
    limit: bigint;
    pagination?: PageRequestSDKType;
}
/**
 * @name QueryAllUserRedemptionRecordForUserResponse
 * @package stride.records
 * @see proto type: stride.records.QueryAllUserRedemptionRecordForUserResponse
 */
export interface QueryAllUserRedemptionRecordForUserResponse {
    userRedemptionRecord: UserRedemptionRecord[];
    pagination?: PageResponse;
}
export interface QueryAllUserRedemptionRecordForUserResponseProtoMsg {
    typeUrl: '/stride.records.QueryAllUserRedemptionRecordForUserResponse';
    value: Uint8Array;
}
/**
 * @name QueryAllUserRedemptionRecordForUserResponseSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryAllUserRedemptionRecordForUserResponse
 */
export interface QueryAllUserRedemptionRecordForUserResponseSDKType {
    user_redemption_record: UserRedemptionRecordSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * @name QueryGetEpochUnbondingRecordRequest
 * @package stride.records
 * @see proto type: stride.records.QueryGetEpochUnbondingRecordRequest
 */
export interface QueryGetEpochUnbondingRecordRequest {
    epochNumber: bigint;
}
export interface QueryGetEpochUnbondingRecordRequestProtoMsg {
    typeUrl: '/stride.records.QueryGetEpochUnbondingRecordRequest';
    value: Uint8Array;
}
/**
 * @name QueryGetEpochUnbondingRecordRequestSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryGetEpochUnbondingRecordRequest
 */
export interface QueryGetEpochUnbondingRecordRequestSDKType {
    epoch_number: bigint;
}
/**
 * @name QueryGetEpochUnbondingRecordResponse
 * @package stride.records
 * @see proto type: stride.records.QueryGetEpochUnbondingRecordResponse
 */
export interface QueryGetEpochUnbondingRecordResponse {
    epochUnbondingRecord: EpochUnbondingRecord;
}
export interface QueryGetEpochUnbondingRecordResponseProtoMsg {
    typeUrl: '/stride.records.QueryGetEpochUnbondingRecordResponse';
    value: Uint8Array;
}
/**
 * @name QueryGetEpochUnbondingRecordResponseSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryGetEpochUnbondingRecordResponse
 */
export interface QueryGetEpochUnbondingRecordResponseSDKType {
    epoch_unbonding_record: EpochUnbondingRecordSDKType;
}
/**
 * @name QueryAllEpochUnbondingRecordRequest
 * @package stride.records
 * @see proto type: stride.records.QueryAllEpochUnbondingRecordRequest
 */
export interface QueryAllEpochUnbondingRecordRequest {
    pagination?: PageRequest;
}
export interface QueryAllEpochUnbondingRecordRequestProtoMsg {
    typeUrl: '/stride.records.QueryAllEpochUnbondingRecordRequest';
    value: Uint8Array;
}
/**
 * @name QueryAllEpochUnbondingRecordRequestSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryAllEpochUnbondingRecordRequest
 */
export interface QueryAllEpochUnbondingRecordRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * @name QueryAllEpochUnbondingRecordResponse
 * @package stride.records
 * @see proto type: stride.records.QueryAllEpochUnbondingRecordResponse
 */
export interface QueryAllEpochUnbondingRecordResponse {
    epochUnbondingRecord: EpochUnbondingRecord[];
    pagination?: PageResponse;
}
export interface QueryAllEpochUnbondingRecordResponseProtoMsg {
    typeUrl: '/stride.records.QueryAllEpochUnbondingRecordResponse';
    value: Uint8Array;
}
/**
 * @name QueryAllEpochUnbondingRecordResponseSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryAllEpochUnbondingRecordResponse
 */
export interface QueryAllEpochUnbondingRecordResponseSDKType {
    epoch_unbonding_record: EpochUnbondingRecordSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * @name QueryLSMDepositRequest
 * @package stride.records
 * @see proto type: stride.records.QueryLSMDepositRequest
 */
export interface QueryLSMDepositRequest {
    chainId: string;
    denom: string;
}
export interface QueryLSMDepositRequestProtoMsg {
    typeUrl: '/stride.records.QueryLSMDepositRequest';
    value: Uint8Array;
}
/**
 * @name QueryLSMDepositRequestSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryLSMDepositRequest
 */
export interface QueryLSMDepositRequestSDKType {
    chain_id: string;
    denom: string;
}
/**
 * @name QueryLSMDepositResponse
 * @package stride.records
 * @see proto type: stride.records.QueryLSMDepositResponse
 */
export interface QueryLSMDepositResponse {
    deposit: LSMTokenDeposit;
}
export interface QueryLSMDepositResponseProtoMsg {
    typeUrl: '/stride.records.QueryLSMDepositResponse';
    value: Uint8Array;
}
/**
 * @name QueryLSMDepositResponseSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryLSMDepositResponse
 */
export interface QueryLSMDepositResponseSDKType {
    deposit: LSMTokenDepositSDKType;
}
/**
 * @name QueryLSMDepositsRequest
 * @package stride.records
 * @see proto type: stride.records.QueryLSMDepositsRequest
 */
export interface QueryLSMDepositsRequest {
    chainId: string;
    validatorAddress: string;
    status: string;
}
export interface QueryLSMDepositsRequestProtoMsg {
    typeUrl: '/stride.records.QueryLSMDepositsRequest';
    value: Uint8Array;
}
/**
 * @name QueryLSMDepositsRequestSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryLSMDepositsRequest
 */
export interface QueryLSMDepositsRequestSDKType {
    chain_id: string;
    validator_address: string;
    status: string;
}
/**
 * @name QueryLSMDepositsResponse
 * @package stride.records
 * @see proto type: stride.records.QueryLSMDepositsResponse
 */
export interface QueryLSMDepositsResponse {
    deposits: LSMTokenDeposit[];
}
export interface QueryLSMDepositsResponseProtoMsg {
    typeUrl: '/stride.records.QueryLSMDepositsResponse';
    value: Uint8Array;
}
/**
 * @name QueryLSMDepositsResponseSDKType
 * @package stride.records
 * @see proto type: stride.records.QueryLSMDepositsResponse
 */
export interface QueryLSMDepositsResponseSDKType {
    deposits: LSMTokenDepositSDKType[];
}
/**
 * QueryParamsRequest is request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package stride.records
 * @see proto type: stride.records.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/stride.records.QueryParamsRequest";
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
 * QueryParamsResponse is response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package stride.records
 * @see proto type: stride.records.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/stride.records.QueryParamsResponse";
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
 * @name QueryGetDepositRecordRequest
 * @package stride.records
 * @see proto type: stride.records.QueryGetDepositRecordRequest
 */
export declare const QueryGetDepositRecordRequest: {
    typeUrl: "/stride.records.QueryGetDepositRecordRequest";
    is(o: any): o is QueryGetDepositRecordRequest;
    isSDK(o: any): o is QueryGetDepositRecordRequestSDKType;
    encode(message: QueryGetDepositRecordRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetDepositRecordRequest;
    fromJSON(object: any): QueryGetDepositRecordRequest;
    toJSON(message: QueryGetDepositRecordRequest): JsonSafe<QueryGetDepositRecordRequest>;
    fromPartial(object: Partial<QueryGetDepositRecordRequest>): QueryGetDepositRecordRequest;
    fromProtoMsg(message: QueryGetDepositRecordRequestProtoMsg): QueryGetDepositRecordRequest;
    toProto(message: QueryGetDepositRecordRequest): Uint8Array;
    toProtoMsg(message: QueryGetDepositRecordRequest): QueryGetDepositRecordRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryGetDepositRecordResponse
 * @package stride.records
 * @see proto type: stride.records.QueryGetDepositRecordResponse
 */
export declare const QueryGetDepositRecordResponse: {
    typeUrl: "/stride.records.QueryGetDepositRecordResponse";
    is(o: any): o is QueryGetDepositRecordResponse;
    isSDK(o: any): o is QueryGetDepositRecordResponseSDKType;
    encode(message: QueryGetDepositRecordResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetDepositRecordResponse;
    fromJSON(object: any): QueryGetDepositRecordResponse;
    toJSON(message: QueryGetDepositRecordResponse): JsonSafe<QueryGetDepositRecordResponse>;
    fromPartial(object: Partial<QueryGetDepositRecordResponse>): QueryGetDepositRecordResponse;
    fromProtoMsg(message: QueryGetDepositRecordResponseProtoMsg): QueryGetDepositRecordResponse;
    toProto(message: QueryGetDepositRecordResponse): Uint8Array;
    toProtoMsg(message: QueryGetDepositRecordResponse): QueryGetDepositRecordResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllDepositRecordRequest
 * @package stride.records
 * @see proto type: stride.records.QueryAllDepositRecordRequest
 */
export declare const QueryAllDepositRecordRequest: {
    typeUrl: "/stride.records.QueryAllDepositRecordRequest";
    is(o: any): o is QueryAllDepositRecordRequest;
    isSDK(o: any): o is QueryAllDepositRecordRequestSDKType;
    encode(message: QueryAllDepositRecordRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllDepositRecordRequest;
    fromJSON(object: any): QueryAllDepositRecordRequest;
    toJSON(message: QueryAllDepositRecordRequest): JsonSafe<QueryAllDepositRecordRequest>;
    fromPartial(object: Partial<QueryAllDepositRecordRequest>): QueryAllDepositRecordRequest;
    fromProtoMsg(message: QueryAllDepositRecordRequestProtoMsg): QueryAllDepositRecordRequest;
    toProto(message: QueryAllDepositRecordRequest): Uint8Array;
    toProtoMsg(message: QueryAllDepositRecordRequest): QueryAllDepositRecordRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllDepositRecordResponse
 * @package stride.records
 * @see proto type: stride.records.QueryAllDepositRecordResponse
 */
export declare const QueryAllDepositRecordResponse: {
    typeUrl: "/stride.records.QueryAllDepositRecordResponse";
    is(o: any): o is QueryAllDepositRecordResponse;
    isSDK(o: any): o is QueryAllDepositRecordResponseSDKType;
    encode(message: QueryAllDepositRecordResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllDepositRecordResponse;
    fromJSON(object: any): QueryAllDepositRecordResponse;
    toJSON(message: QueryAllDepositRecordResponse): JsonSafe<QueryAllDepositRecordResponse>;
    fromPartial(object: Partial<QueryAllDepositRecordResponse>): QueryAllDepositRecordResponse;
    fromProtoMsg(message: QueryAllDepositRecordResponseProtoMsg): QueryAllDepositRecordResponse;
    toProto(message: QueryAllDepositRecordResponse): Uint8Array;
    toProtoMsg(message: QueryAllDepositRecordResponse): QueryAllDepositRecordResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryDepositRecordByHostRequest
 * @package stride.records
 * @see proto type: stride.records.QueryDepositRecordByHostRequest
 */
export declare const QueryDepositRecordByHostRequest: {
    typeUrl: "/stride.records.QueryDepositRecordByHostRequest";
    is(o: any): o is QueryDepositRecordByHostRequest;
    isSDK(o: any): o is QueryDepositRecordByHostRequestSDKType;
    encode(message: QueryDepositRecordByHostRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDepositRecordByHostRequest;
    fromJSON(object: any): QueryDepositRecordByHostRequest;
    toJSON(message: QueryDepositRecordByHostRequest): JsonSafe<QueryDepositRecordByHostRequest>;
    fromPartial(object: Partial<QueryDepositRecordByHostRequest>): QueryDepositRecordByHostRequest;
    fromProtoMsg(message: QueryDepositRecordByHostRequestProtoMsg): QueryDepositRecordByHostRequest;
    toProto(message: QueryDepositRecordByHostRequest): Uint8Array;
    toProtoMsg(message: QueryDepositRecordByHostRequest): QueryDepositRecordByHostRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryDepositRecordByHostResponse
 * @package stride.records
 * @see proto type: stride.records.QueryDepositRecordByHostResponse
 */
export declare const QueryDepositRecordByHostResponse: {
    typeUrl: "/stride.records.QueryDepositRecordByHostResponse";
    is(o: any): o is QueryDepositRecordByHostResponse;
    isSDK(o: any): o is QueryDepositRecordByHostResponseSDKType;
    encode(message: QueryDepositRecordByHostResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDepositRecordByHostResponse;
    fromJSON(object: any): QueryDepositRecordByHostResponse;
    toJSON(message: QueryDepositRecordByHostResponse): JsonSafe<QueryDepositRecordByHostResponse>;
    fromPartial(object: Partial<QueryDepositRecordByHostResponse>): QueryDepositRecordByHostResponse;
    fromProtoMsg(message: QueryDepositRecordByHostResponseProtoMsg): QueryDepositRecordByHostResponse;
    toProto(message: QueryDepositRecordByHostResponse): Uint8Array;
    toProtoMsg(message: QueryDepositRecordByHostResponse): QueryDepositRecordByHostResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryGetUserRedemptionRecordRequest
 * @package stride.records
 * @see proto type: stride.records.QueryGetUserRedemptionRecordRequest
 */
export declare const QueryGetUserRedemptionRecordRequest: {
    typeUrl: "/stride.records.QueryGetUserRedemptionRecordRequest";
    is(o: any): o is QueryGetUserRedemptionRecordRequest;
    isSDK(o: any): o is QueryGetUserRedemptionRecordRequestSDKType;
    encode(message: QueryGetUserRedemptionRecordRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetUserRedemptionRecordRequest;
    fromJSON(object: any): QueryGetUserRedemptionRecordRequest;
    toJSON(message: QueryGetUserRedemptionRecordRequest): JsonSafe<QueryGetUserRedemptionRecordRequest>;
    fromPartial(object: Partial<QueryGetUserRedemptionRecordRequest>): QueryGetUserRedemptionRecordRequest;
    fromProtoMsg(message: QueryGetUserRedemptionRecordRequestProtoMsg): QueryGetUserRedemptionRecordRequest;
    toProto(message: QueryGetUserRedemptionRecordRequest): Uint8Array;
    toProtoMsg(message: QueryGetUserRedemptionRecordRequest): QueryGetUserRedemptionRecordRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryGetUserRedemptionRecordResponse
 * @package stride.records
 * @see proto type: stride.records.QueryGetUserRedemptionRecordResponse
 */
export declare const QueryGetUserRedemptionRecordResponse: {
    typeUrl: "/stride.records.QueryGetUserRedemptionRecordResponse";
    is(o: any): o is QueryGetUserRedemptionRecordResponse;
    isSDK(o: any): o is QueryGetUserRedemptionRecordResponseSDKType;
    encode(message: QueryGetUserRedemptionRecordResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetUserRedemptionRecordResponse;
    fromJSON(object: any): QueryGetUserRedemptionRecordResponse;
    toJSON(message: QueryGetUserRedemptionRecordResponse): JsonSafe<QueryGetUserRedemptionRecordResponse>;
    fromPartial(object: Partial<QueryGetUserRedemptionRecordResponse>): QueryGetUserRedemptionRecordResponse;
    fromProtoMsg(message: QueryGetUserRedemptionRecordResponseProtoMsg): QueryGetUserRedemptionRecordResponse;
    toProto(message: QueryGetUserRedemptionRecordResponse): Uint8Array;
    toProtoMsg(message: QueryGetUserRedemptionRecordResponse): QueryGetUserRedemptionRecordResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllUserRedemptionRecordRequest
 * @package stride.records
 * @see proto type: stride.records.QueryAllUserRedemptionRecordRequest
 */
export declare const QueryAllUserRedemptionRecordRequest: {
    typeUrl: "/stride.records.QueryAllUserRedemptionRecordRequest";
    is(o: any): o is QueryAllUserRedemptionRecordRequest;
    isSDK(o: any): o is QueryAllUserRedemptionRecordRequestSDKType;
    encode(message: QueryAllUserRedemptionRecordRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllUserRedemptionRecordRequest;
    fromJSON(object: any): QueryAllUserRedemptionRecordRequest;
    toJSON(message: QueryAllUserRedemptionRecordRequest): JsonSafe<QueryAllUserRedemptionRecordRequest>;
    fromPartial(object: Partial<QueryAllUserRedemptionRecordRequest>): QueryAllUserRedemptionRecordRequest;
    fromProtoMsg(message: QueryAllUserRedemptionRecordRequestProtoMsg): QueryAllUserRedemptionRecordRequest;
    toProto(message: QueryAllUserRedemptionRecordRequest): Uint8Array;
    toProtoMsg(message: QueryAllUserRedemptionRecordRequest): QueryAllUserRedemptionRecordRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllUserRedemptionRecordResponse
 * @package stride.records
 * @see proto type: stride.records.QueryAllUserRedemptionRecordResponse
 */
export declare const QueryAllUserRedemptionRecordResponse: {
    typeUrl: "/stride.records.QueryAllUserRedemptionRecordResponse";
    is(o: any): o is QueryAllUserRedemptionRecordResponse;
    isSDK(o: any): o is QueryAllUserRedemptionRecordResponseSDKType;
    encode(message: QueryAllUserRedemptionRecordResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllUserRedemptionRecordResponse;
    fromJSON(object: any): QueryAllUserRedemptionRecordResponse;
    toJSON(message: QueryAllUserRedemptionRecordResponse): JsonSafe<QueryAllUserRedemptionRecordResponse>;
    fromPartial(object: Partial<QueryAllUserRedemptionRecordResponse>): QueryAllUserRedemptionRecordResponse;
    fromProtoMsg(message: QueryAllUserRedemptionRecordResponseProtoMsg): QueryAllUserRedemptionRecordResponse;
    toProto(message: QueryAllUserRedemptionRecordResponse): Uint8Array;
    toProtoMsg(message: QueryAllUserRedemptionRecordResponse): QueryAllUserRedemptionRecordResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Query UserRedemptionRecords by chainId / userId pair
 * @name QueryAllUserRedemptionRecordForUserRequest
 * @package stride.records
 * @see proto type: stride.records.QueryAllUserRedemptionRecordForUserRequest
 */
export declare const QueryAllUserRedemptionRecordForUserRequest: {
    typeUrl: "/stride.records.QueryAllUserRedemptionRecordForUserRequest";
    is(o: any): o is QueryAllUserRedemptionRecordForUserRequest;
    isSDK(o: any): o is QueryAllUserRedemptionRecordForUserRequestSDKType;
    encode(message: QueryAllUserRedemptionRecordForUserRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllUserRedemptionRecordForUserRequest;
    fromJSON(object: any): QueryAllUserRedemptionRecordForUserRequest;
    toJSON(message: QueryAllUserRedemptionRecordForUserRequest): JsonSafe<QueryAllUserRedemptionRecordForUserRequest>;
    fromPartial(object: Partial<QueryAllUserRedemptionRecordForUserRequest>): QueryAllUserRedemptionRecordForUserRequest;
    fromProtoMsg(message: QueryAllUserRedemptionRecordForUserRequestProtoMsg): QueryAllUserRedemptionRecordForUserRequest;
    toProto(message: QueryAllUserRedemptionRecordForUserRequest): Uint8Array;
    toProtoMsg(message: QueryAllUserRedemptionRecordForUserRequest): QueryAllUserRedemptionRecordForUserRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllUserRedemptionRecordForUserResponse
 * @package stride.records
 * @see proto type: stride.records.QueryAllUserRedemptionRecordForUserResponse
 */
export declare const QueryAllUserRedemptionRecordForUserResponse: {
    typeUrl: "/stride.records.QueryAllUserRedemptionRecordForUserResponse";
    is(o: any): o is QueryAllUserRedemptionRecordForUserResponse;
    isSDK(o: any): o is QueryAllUserRedemptionRecordForUserResponseSDKType;
    encode(message: QueryAllUserRedemptionRecordForUserResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllUserRedemptionRecordForUserResponse;
    fromJSON(object: any): QueryAllUserRedemptionRecordForUserResponse;
    toJSON(message: QueryAllUserRedemptionRecordForUserResponse): JsonSafe<QueryAllUserRedemptionRecordForUserResponse>;
    fromPartial(object: Partial<QueryAllUserRedemptionRecordForUserResponse>): QueryAllUserRedemptionRecordForUserResponse;
    fromProtoMsg(message: QueryAllUserRedemptionRecordForUserResponseProtoMsg): QueryAllUserRedemptionRecordForUserResponse;
    toProto(message: QueryAllUserRedemptionRecordForUserResponse): Uint8Array;
    toProtoMsg(message: QueryAllUserRedemptionRecordForUserResponse): QueryAllUserRedemptionRecordForUserResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryGetEpochUnbondingRecordRequest
 * @package stride.records
 * @see proto type: stride.records.QueryGetEpochUnbondingRecordRequest
 */
export declare const QueryGetEpochUnbondingRecordRequest: {
    typeUrl: "/stride.records.QueryGetEpochUnbondingRecordRequest";
    is(o: any): o is QueryGetEpochUnbondingRecordRequest;
    isSDK(o: any): o is QueryGetEpochUnbondingRecordRequestSDKType;
    encode(message: QueryGetEpochUnbondingRecordRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetEpochUnbondingRecordRequest;
    fromJSON(object: any): QueryGetEpochUnbondingRecordRequest;
    toJSON(message: QueryGetEpochUnbondingRecordRequest): JsonSafe<QueryGetEpochUnbondingRecordRequest>;
    fromPartial(object: Partial<QueryGetEpochUnbondingRecordRequest>): QueryGetEpochUnbondingRecordRequest;
    fromProtoMsg(message: QueryGetEpochUnbondingRecordRequestProtoMsg): QueryGetEpochUnbondingRecordRequest;
    toProto(message: QueryGetEpochUnbondingRecordRequest): Uint8Array;
    toProtoMsg(message: QueryGetEpochUnbondingRecordRequest): QueryGetEpochUnbondingRecordRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryGetEpochUnbondingRecordResponse
 * @package stride.records
 * @see proto type: stride.records.QueryGetEpochUnbondingRecordResponse
 */
export declare const QueryGetEpochUnbondingRecordResponse: {
    typeUrl: "/stride.records.QueryGetEpochUnbondingRecordResponse";
    is(o: any): o is QueryGetEpochUnbondingRecordResponse;
    isSDK(o: any): o is QueryGetEpochUnbondingRecordResponseSDKType;
    encode(message: QueryGetEpochUnbondingRecordResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetEpochUnbondingRecordResponse;
    fromJSON(object: any): QueryGetEpochUnbondingRecordResponse;
    toJSON(message: QueryGetEpochUnbondingRecordResponse): JsonSafe<QueryGetEpochUnbondingRecordResponse>;
    fromPartial(object: Partial<QueryGetEpochUnbondingRecordResponse>): QueryGetEpochUnbondingRecordResponse;
    fromProtoMsg(message: QueryGetEpochUnbondingRecordResponseProtoMsg): QueryGetEpochUnbondingRecordResponse;
    toProto(message: QueryGetEpochUnbondingRecordResponse): Uint8Array;
    toProtoMsg(message: QueryGetEpochUnbondingRecordResponse): QueryGetEpochUnbondingRecordResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllEpochUnbondingRecordRequest
 * @package stride.records
 * @see proto type: stride.records.QueryAllEpochUnbondingRecordRequest
 */
export declare const QueryAllEpochUnbondingRecordRequest: {
    typeUrl: "/stride.records.QueryAllEpochUnbondingRecordRequest";
    is(o: any): o is QueryAllEpochUnbondingRecordRequest;
    isSDK(o: any): o is QueryAllEpochUnbondingRecordRequestSDKType;
    encode(message: QueryAllEpochUnbondingRecordRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllEpochUnbondingRecordRequest;
    fromJSON(object: any): QueryAllEpochUnbondingRecordRequest;
    toJSON(message: QueryAllEpochUnbondingRecordRequest): JsonSafe<QueryAllEpochUnbondingRecordRequest>;
    fromPartial(object: Partial<QueryAllEpochUnbondingRecordRequest>): QueryAllEpochUnbondingRecordRequest;
    fromProtoMsg(message: QueryAllEpochUnbondingRecordRequestProtoMsg): QueryAllEpochUnbondingRecordRequest;
    toProto(message: QueryAllEpochUnbondingRecordRequest): Uint8Array;
    toProtoMsg(message: QueryAllEpochUnbondingRecordRequest): QueryAllEpochUnbondingRecordRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllEpochUnbondingRecordResponse
 * @package stride.records
 * @see proto type: stride.records.QueryAllEpochUnbondingRecordResponse
 */
export declare const QueryAllEpochUnbondingRecordResponse: {
    typeUrl: "/stride.records.QueryAllEpochUnbondingRecordResponse";
    is(o: any): o is QueryAllEpochUnbondingRecordResponse;
    isSDK(o: any): o is QueryAllEpochUnbondingRecordResponseSDKType;
    encode(message: QueryAllEpochUnbondingRecordResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllEpochUnbondingRecordResponse;
    fromJSON(object: any): QueryAllEpochUnbondingRecordResponse;
    toJSON(message: QueryAllEpochUnbondingRecordResponse): JsonSafe<QueryAllEpochUnbondingRecordResponse>;
    fromPartial(object: Partial<QueryAllEpochUnbondingRecordResponse>): QueryAllEpochUnbondingRecordResponse;
    fromProtoMsg(message: QueryAllEpochUnbondingRecordResponseProtoMsg): QueryAllEpochUnbondingRecordResponse;
    toProto(message: QueryAllEpochUnbondingRecordResponse): Uint8Array;
    toProtoMsg(message: QueryAllEpochUnbondingRecordResponse): QueryAllEpochUnbondingRecordResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryLSMDepositRequest
 * @package stride.records
 * @see proto type: stride.records.QueryLSMDepositRequest
 */
export declare const QueryLSMDepositRequest: {
    typeUrl: "/stride.records.QueryLSMDepositRequest";
    is(o: any): o is QueryLSMDepositRequest;
    isSDK(o: any): o is QueryLSMDepositRequestSDKType;
    encode(message: QueryLSMDepositRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryLSMDepositRequest;
    fromJSON(object: any): QueryLSMDepositRequest;
    toJSON(message: QueryLSMDepositRequest): JsonSafe<QueryLSMDepositRequest>;
    fromPartial(object: Partial<QueryLSMDepositRequest>): QueryLSMDepositRequest;
    fromProtoMsg(message: QueryLSMDepositRequestProtoMsg): QueryLSMDepositRequest;
    toProto(message: QueryLSMDepositRequest): Uint8Array;
    toProtoMsg(message: QueryLSMDepositRequest): QueryLSMDepositRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryLSMDepositResponse
 * @package stride.records
 * @see proto type: stride.records.QueryLSMDepositResponse
 */
export declare const QueryLSMDepositResponse: {
    typeUrl: "/stride.records.QueryLSMDepositResponse";
    is(o: any): o is QueryLSMDepositResponse;
    isSDK(o: any): o is QueryLSMDepositResponseSDKType;
    encode(message: QueryLSMDepositResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryLSMDepositResponse;
    fromJSON(object: any): QueryLSMDepositResponse;
    toJSON(message: QueryLSMDepositResponse): JsonSafe<QueryLSMDepositResponse>;
    fromPartial(object: Partial<QueryLSMDepositResponse>): QueryLSMDepositResponse;
    fromProtoMsg(message: QueryLSMDepositResponseProtoMsg): QueryLSMDepositResponse;
    toProto(message: QueryLSMDepositResponse): Uint8Array;
    toProtoMsg(message: QueryLSMDepositResponse): QueryLSMDepositResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryLSMDepositsRequest
 * @package stride.records
 * @see proto type: stride.records.QueryLSMDepositsRequest
 */
export declare const QueryLSMDepositsRequest: {
    typeUrl: "/stride.records.QueryLSMDepositsRequest";
    is(o: any): o is QueryLSMDepositsRequest;
    isSDK(o: any): o is QueryLSMDepositsRequestSDKType;
    encode(message: QueryLSMDepositsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryLSMDepositsRequest;
    fromJSON(object: any): QueryLSMDepositsRequest;
    toJSON(message: QueryLSMDepositsRequest): JsonSafe<QueryLSMDepositsRequest>;
    fromPartial(object: Partial<QueryLSMDepositsRequest>): QueryLSMDepositsRequest;
    fromProtoMsg(message: QueryLSMDepositsRequestProtoMsg): QueryLSMDepositsRequest;
    toProto(message: QueryLSMDepositsRequest): Uint8Array;
    toProtoMsg(message: QueryLSMDepositsRequest): QueryLSMDepositsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryLSMDepositsResponse
 * @package stride.records
 * @see proto type: stride.records.QueryLSMDepositsResponse
 */
export declare const QueryLSMDepositsResponse: {
    typeUrl: "/stride.records.QueryLSMDepositsResponse";
    is(o: any): o is QueryLSMDepositsResponse;
    isSDK(o: any): o is QueryLSMDepositsResponseSDKType;
    encode(message: QueryLSMDepositsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryLSMDepositsResponse;
    fromJSON(object: any): QueryLSMDepositsResponse;
    toJSON(message: QueryLSMDepositsResponse): JsonSafe<QueryLSMDepositsResponse>;
    fromPartial(object: Partial<QueryLSMDepositsResponse>): QueryLSMDepositsResponse;
    fromProtoMsg(message: QueryLSMDepositsResponseProtoMsg): QueryLSMDepositsResponse;
    toProto(message: QueryLSMDepositsResponse): Uint8Array;
    toProtoMsg(message: QueryLSMDepositsResponse): QueryLSMDepositsResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map