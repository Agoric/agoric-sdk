import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../cosmos/base/query/v1beta1/pagination.js';
import { Params, type ParamsSDKType } from './params.js';
import { Validator, type ValidatorSDKType } from './validator.js';
import { HostZone, type HostZoneSDKType } from './host_zone.js';
import { EpochTracker, type EpochTrackerSDKType } from './epoch_tracker.js';
import { AddressUnbonding, type AddressUnbondingSDKType } from './address_unbonding.js';
import { TradeRoute, type TradeRouteSDKType } from './trade_route.js';
import { BinaryReader, BinaryWriter } from '../../binary.js';
import { type JsonSafe } from '../../json-safe.js';
/**
 * QueryInterchainAccountFromAddressRequest is the request type for the
 * Query/InterchainAccountAddress RPC
 * @name QueryInterchainAccountFromAddressRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryInterchainAccountFromAddressRequest
 */
export interface QueryInterchainAccountFromAddressRequest {
    owner: string;
    connectionId: string;
}
export interface QueryInterchainAccountFromAddressRequestProtoMsg {
    typeUrl: '/stride.stakeibc.QueryInterchainAccountFromAddressRequest';
    value: Uint8Array;
}
/**
 * QueryInterchainAccountFromAddressRequest is the request type for the
 * Query/InterchainAccountAddress RPC
 * @name QueryInterchainAccountFromAddressRequestSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryInterchainAccountFromAddressRequest
 */
export interface QueryInterchainAccountFromAddressRequestSDKType {
    owner: string;
    connection_id: string;
}
/**
 * QueryInterchainAccountFromAddressResponse the response type for the
 * Query/InterchainAccountAddress RPC
 * @name QueryInterchainAccountFromAddressResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryInterchainAccountFromAddressResponse
 */
export interface QueryInterchainAccountFromAddressResponse {
    interchainAccountAddress: string;
}
export interface QueryInterchainAccountFromAddressResponseProtoMsg {
    typeUrl: '/stride.stakeibc.QueryInterchainAccountFromAddressResponse';
    value: Uint8Array;
}
/**
 * QueryInterchainAccountFromAddressResponse the response type for the
 * Query/InterchainAccountAddress RPC
 * @name QueryInterchainAccountFromAddressResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryInterchainAccountFromAddressResponse
 */
export interface QueryInterchainAccountFromAddressResponseSDKType {
    interchain_account_address: string;
}
/**
 * QueryParamsRequest is request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/stride.stakeibc.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest is request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
}
/**
 * QueryParamsResponse is response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * params holds all the parameters of this module.
     */
    params: Params;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/stride.stakeibc.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse is response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    params: ParamsSDKType;
}
/**
 * @name QueryGetValidatorsRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetValidatorsRequest
 */
export interface QueryGetValidatorsRequest {
    chainId: string;
}
export interface QueryGetValidatorsRequestProtoMsg {
    typeUrl: '/stride.stakeibc.QueryGetValidatorsRequest';
    value: Uint8Array;
}
/**
 * @name QueryGetValidatorsRequestSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetValidatorsRequest
 */
export interface QueryGetValidatorsRequestSDKType {
    chain_id: string;
}
/**
 * @name QueryGetValidatorsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetValidatorsResponse
 */
export interface QueryGetValidatorsResponse {
    validators: Validator[];
}
export interface QueryGetValidatorsResponseProtoMsg {
    typeUrl: '/stride.stakeibc.QueryGetValidatorsResponse';
    value: Uint8Array;
}
/**
 * @name QueryGetValidatorsResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetValidatorsResponse
 */
export interface QueryGetValidatorsResponseSDKType {
    validators: ValidatorSDKType[];
}
/**
 * @name QueryGetHostZoneRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetHostZoneRequest
 */
export interface QueryGetHostZoneRequest {
    chainId: string;
}
export interface QueryGetHostZoneRequestProtoMsg {
    typeUrl: '/stride.stakeibc.QueryGetHostZoneRequest';
    value: Uint8Array;
}
/**
 * @name QueryGetHostZoneRequestSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetHostZoneRequest
 */
export interface QueryGetHostZoneRequestSDKType {
    chain_id: string;
}
/**
 * @name QueryGetHostZoneResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetHostZoneResponse
 */
export interface QueryGetHostZoneResponse {
    hostZone: HostZone;
}
export interface QueryGetHostZoneResponseProtoMsg {
    typeUrl: '/stride.stakeibc.QueryGetHostZoneResponse';
    value: Uint8Array;
}
/**
 * @name QueryGetHostZoneResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetHostZoneResponse
 */
export interface QueryGetHostZoneResponseSDKType {
    host_zone: HostZoneSDKType;
}
/**
 * @name QueryAllHostZoneRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllHostZoneRequest
 */
export interface QueryAllHostZoneRequest {
    pagination?: PageRequest;
}
export interface QueryAllHostZoneRequestProtoMsg {
    typeUrl: '/stride.stakeibc.QueryAllHostZoneRequest';
    value: Uint8Array;
}
/**
 * @name QueryAllHostZoneRequestSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllHostZoneRequest
 */
export interface QueryAllHostZoneRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * @name QueryAllHostZoneResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllHostZoneResponse
 */
export interface QueryAllHostZoneResponse {
    hostZone: HostZone[];
    pagination?: PageResponse;
}
export interface QueryAllHostZoneResponseProtoMsg {
    typeUrl: '/stride.stakeibc.QueryAllHostZoneResponse';
    value: Uint8Array;
}
/**
 * @name QueryAllHostZoneResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllHostZoneResponse
 */
export interface QueryAllHostZoneResponseSDKType {
    host_zone: HostZoneSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * @name QueryModuleAddressRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryModuleAddressRequest
 */
export interface QueryModuleAddressRequest {
    name: string;
}
export interface QueryModuleAddressRequestProtoMsg {
    typeUrl: '/stride.stakeibc.QueryModuleAddressRequest';
    value: Uint8Array;
}
/**
 * @name QueryModuleAddressRequestSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryModuleAddressRequest
 */
export interface QueryModuleAddressRequestSDKType {
    name: string;
}
/**
 * @name QueryModuleAddressResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryModuleAddressResponse
 */
export interface QueryModuleAddressResponse {
    addr: string;
}
export interface QueryModuleAddressResponseProtoMsg {
    typeUrl: '/stride.stakeibc.QueryModuleAddressResponse';
    value: Uint8Array;
}
/**
 * @name QueryModuleAddressResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryModuleAddressResponse
 */
export interface QueryModuleAddressResponseSDKType {
    addr: string;
}
/**
 * @name QueryGetEpochTrackerRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetEpochTrackerRequest
 */
export interface QueryGetEpochTrackerRequest {
    epochIdentifier: string;
}
export interface QueryGetEpochTrackerRequestProtoMsg {
    typeUrl: '/stride.stakeibc.QueryGetEpochTrackerRequest';
    value: Uint8Array;
}
/**
 * @name QueryGetEpochTrackerRequestSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetEpochTrackerRequest
 */
export interface QueryGetEpochTrackerRequestSDKType {
    epoch_identifier: string;
}
/**
 * @name QueryGetEpochTrackerResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetEpochTrackerResponse
 */
export interface QueryGetEpochTrackerResponse {
    epochTracker: EpochTracker;
}
export interface QueryGetEpochTrackerResponseProtoMsg {
    typeUrl: '/stride.stakeibc.QueryGetEpochTrackerResponse';
    value: Uint8Array;
}
/**
 * @name QueryGetEpochTrackerResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetEpochTrackerResponse
 */
export interface QueryGetEpochTrackerResponseSDKType {
    epoch_tracker: EpochTrackerSDKType;
}
/**
 * @name QueryAllEpochTrackerRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllEpochTrackerRequest
 */
export interface QueryAllEpochTrackerRequest {
}
export interface QueryAllEpochTrackerRequestProtoMsg {
    typeUrl: '/stride.stakeibc.QueryAllEpochTrackerRequest';
    value: Uint8Array;
}
/**
 * @name QueryAllEpochTrackerRequestSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllEpochTrackerRequest
 */
export interface QueryAllEpochTrackerRequestSDKType {
}
/**
 * @name QueryAllEpochTrackerResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllEpochTrackerResponse
 */
export interface QueryAllEpochTrackerResponse {
    epochTracker: EpochTracker[];
}
export interface QueryAllEpochTrackerResponseProtoMsg {
    typeUrl: '/stride.stakeibc.QueryAllEpochTrackerResponse';
    value: Uint8Array;
}
/**
 * @name QueryAllEpochTrackerResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllEpochTrackerResponse
 */
export interface QueryAllEpochTrackerResponseSDKType {
    epoch_tracker: EpochTrackerSDKType[];
}
/**
 * @name QueryGetNextPacketSequenceRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetNextPacketSequenceRequest
 */
export interface QueryGetNextPacketSequenceRequest {
    channelId: string;
    portId: string;
}
export interface QueryGetNextPacketSequenceRequestProtoMsg {
    typeUrl: '/stride.stakeibc.QueryGetNextPacketSequenceRequest';
    value: Uint8Array;
}
/**
 * @name QueryGetNextPacketSequenceRequestSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetNextPacketSequenceRequest
 */
export interface QueryGetNextPacketSequenceRequestSDKType {
    channel_id: string;
    port_id: string;
}
/**
 * @name QueryGetNextPacketSequenceResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetNextPacketSequenceResponse
 */
export interface QueryGetNextPacketSequenceResponse {
    sequence: bigint;
}
export interface QueryGetNextPacketSequenceResponseProtoMsg {
    typeUrl: '/stride.stakeibc.QueryGetNextPacketSequenceResponse';
    value: Uint8Array;
}
/**
 * @name QueryGetNextPacketSequenceResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetNextPacketSequenceResponse
 */
export interface QueryGetNextPacketSequenceResponseSDKType {
    sequence: bigint;
}
/**
 * @name QueryAddressUnbondings
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAddressUnbondings
 */
export interface QueryAddressUnbondings {
    address: string;
}
export interface QueryAddressUnbondingsProtoMsg {
    typeUrl: '/stride.stakeibc.QueryAddressUnbondings';
    value: Uint8Array;
}
/**
 * @name QueryAddressUnbondingsSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAddressUnbondings
 */
export interface QueryAddressUnbondingsSDKType {
    address: string;
}
/**
 * @name QueryAddressUnbondingsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAddressUnbondingsResponse
 */
export interface QueryAddressUnbondingsResponse {
    addressUnbondings: AddressUnbonding[];
}
export interface QueryAddressUnbondingsResponseProtoMsg {
    typeUrl: '/stride.stakeibc.QueryAddressUnbondingsResponse';
    value: Uint8Array;
}
/**
 * @name QueryAddressUnbondingsResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAddressUnbondingsResponse
 */
export interface QueryAddressUnbondingsResponseSDKType {
    address_unbondings: AddressUnbondingSDKType[];
}
/**
 * @name QueryAllTradeRoutes
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllTradeRoutes
 */
export interface QueryAllTradeRoutes {
}
export interface QueryAllTradeRoutesProtoMsg {
    typeUrl: '/stride.stakeibc.QueryAllTradeRoutes';
    value: Uint8Array;
}
/**
 * @name QueryAllTradeRoutesSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllTradeRoutes
 */
export interface QueryAllTradeRoutesSDKType {
}
/**
 * @name QueryAllTradeRoutesResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllTradeRoutesResponse
 */
export interface QueryAllTradeRoutesResponse {
    tradeRoutes: TradeRoute[];
}
export interface QueryAllTradeRoutesResponseProtoMsg {
    typeUrl: '/stride.stakeibc.QueryAllTradeRoutesResponse';
    value: Uint8Array;
}
/**
 * @name QueryAllTradeRoutesResponseSDKType
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllTradeRoutesResponse
 */
export interface QueryAllTradeRoutesResponseSDKType {
    trade_routes: TradeRouteSDKType[];
}
/**
 * QueryInterchainAccountFromAddressRequest is the request type for the
 * Query/InterchainAccountAddress RPC
 * @name QueryInterchainAccountFromAddressRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryInterchainAccountFromAddressRequest
 */
export declare const QueryInterchainAccountFromAddressRequest: {
    typeUrl: "/stride.stakeibc.QueryInterchainAccountFromAddressRequest";
    is(o: any): o is QueryInterchainAccountFromAddressRequest;
    isSDK(o: any): o is QueryInterchainAccountFromAddressRequestSDKType;
    encode(message: QueryInterchainAccountFromAddressRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryInterchainAccountFromAddressRequest;
    fromJSON(object: any): QueryInterchainAccountFromAddressRequest;
    toJSON(message: QueryInterchainAccountFromAddressRequest): JsonSafe<QueryInterchainAccountFromAddressRequest>;
    fromPartial(object: Partial<QueryInterchainAccountFromAddressRequest>): QueryInterchainAccountFromAddressRequest;
    fromProtoMsg(message: QueryInterchainAccountFromAddressRequestProtoMsg): QueryInterchainAccountFromAddressRequest;
    toProto(message: QueryInterchainAccountFromAddressRequest): Uint8Array;
    toProtoMsg(message: QueryInterchainAccountFromAddressRequest): QueryInterchainAccountFromAddressRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryInterchainAccountFromAddressResponse the response type for the
 * Query/InterchainAccountAddress RPC
 * @name QueryInterchainAccountFromAddressResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryInterchainAccountFromAddressResponse
 */
export declare const QueryInterchainAccountFromAddressResponse: {
    typeUrl: "/stride.stakeibc.QueryInterchainAccountFromAddressResponse";
    is(o: any): o is QueryInterchainAccountFromAddressResponse;
    isSDK(o: any): o is QueryInterchainAccountFromAddressResponseSDKType;
    encode(message: QueryInterchainAccountFromAddressResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryInterchainAccountFromAddressResponse;
    fromJSON(object: any): QueryInterchainAccountFromAddressResponse;
    toJSON(message: QueryInterchainAccountFromAddressResponse): JsonSafe<QueryInterchainAccountFromAddressResponse>;
    fromPartial(object: Partial<QueryInterchainAccountFromAddressResponse>): QueryInterchainAccountFromAddressResponse;
    fromProtoMsg(message: QueryInterchainAccountFromAddressResponseProtoMsg): QueryInterchainAccountFromAddressResponse;
    toProto(message: QueryInterchainAccountFromAddressResponse): Uint8Array;
    toProtoMsg(message: QueryInterchainAccountFromAddressResponse): QueryInterchainAccountFromAddressResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryParamsRequest is request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/stride.stakeibc.QueryParamsRequest";
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
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/stride.stakeibc.QueryParamsResponse";
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
 * @name QueryGetValidatorsRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetValidatorsRequest
 */
export declare const QueryGetValidatorsRequest: {
    typeUrl: "/stride.stakeibc.QueryGetValidatorsRequest";
    is(o: any): o is QueryGetValidatorsRequest;
    isSDK(o: any): o is QueryGetValidatorsRequestSDKType;
    encode(message: QueryGetValidatorsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetValidatorsRequest;
    fromJSON(object: any): QueryGetValidatorsRequest;
    toJSON(message: QueryGetValidatorsRequest): JsonSafe<QueryGetValidatorsRequest>;
    fromPartial(object: Partial<QueryGetValidatorsRequest>): QueryGetValidatorsRequest;
    fromProtoMsg(message: QueryGetValidatorsRequestProtoMsg): QueryGetValidatorsRequest;
    toProto(message: QueryGetValidatorsRequest): Uint8Array;
    toProtoMsg(message: QueryGetValidatorsRequest): QueryGetValidatorsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryGetValidatorsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetValidatorsResponse
 */
export declare const QueryGetValidatorsResponse: {
    typeUrl: "/stride.stakeibc.QueryGetValidatorsResponse";
    is(o: any): o is QueryGetValidatorsResponse;
    isSDK(o: any): o is QueryGetValidatorsResponseSDKType;
    encode(message: QueryGetValidatorsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetValidatorsResponse;
    fromJSON(object: any): QueryGetValidatorsResponse;
    toJSON(message: QueryGetValidatorsResponse): JsonSafe<QueryGetValidatorsResponse>;
    fromPartial(object: Partial<QueryGetValidatorsResponse>): QueryGetValidatorsResponse;
    fromProtoMsg(message: QueryGetValidatorsResponseProtoMsg): QueryGetValidatorsResponse;
    toProto(message: QueryGetValidatorsResponse): Uint8Array;
    toProtoMsg(message: QueryGetValidatorsResponse): QueryGetValidatorsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryGetHostZoneRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetHostZoneRequest
 */
export declare const QueryGetHostZoneRequest: {
    typeUrl: "/stride.stakeibc.QueryGetHostZoneRequest";
    is(o: any): o is QueryGetHostZoneRequest;
    isSDK(o: any): o is QueryGetHostZoneRequestSDKType;
    encode(message: QueryGetHostZoneRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetHostZoneRequest;
    fromJSON(object: any): QueryGetHostZoneRequest;
    toJSON(message: QueryGetHostZoneRequest): JsonSafe<QueryGetHostZoneRequest>;
    fromPartial(object: Partial<QueryGetHostZoneRequest>): QueryGetHostZoneRequest;
    fromProtoMsg(message: QueryGetHostZoneRequestProtoMsg): QueryGetHostZoneRequest;
    toProto(message: QueryGetHostZoneRequest): Uint8Array;
    toProtoMsg(message: QueryGetHostZoneRequest): QueryGetHostZoneRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryGetHostZoneResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetHostZoneResponse
 */
export declare const QueryGetHostZoneResponse: {
    typeUrl: "/stride.stakeibc.QueryGetHostZoneResponse";
    is(o: any): o is QueryGetHostZoneResponse;
    isSDK(o: any): o is QueryGetHostZoneResponseSDKType;
    encode(message: QueryGetHostZoneResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetHostZoneResponse;
    fromJSON(object: any): QueryGetHostZoneResponse;
    toJSON(message: QueryGetHostZoneResponse): JsonSafe<QueryGetHostZoneResponse>;
    fromPartial(object: Partial<QueryGetHostZoneResponse>): QueryGetHostZoneResponse;
    fromProtoMsg(message: QueryGetHostZoneResponseProtoMsg): QueryGetHostZoneResponse;
    toProto(message: QueryGetHostZoneResponse): Uint8Array;
    toProtoMsg(message: QueryGetHostZoneResponse): QueryGetHostZoneResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllHostZoneRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllHostZoneRequest
 */
export declare const QueryAllHostZoneRequest: {
    typeUrl: "/stride.stakeibc.QueryAllHostZoneRequest";
    is(o: any): o is QueryAllHostZoneRequest;
    isSDK(o: any): o is QueryAllHostZoneRequestSDKType;
    encode(message: QueryAllHostZoneRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllHostZoneRequest;
    fromJSON(object: any): QueryAllHostZoneRequest;
    toJSON(message: QueryAllHostZoneRequest): JsonSafe<QueryAllHostZoneRequest>;
    fromPartial(object: Partial<QueryAllHostZoneRequest>): QueryAllHostZoneRequest;
    fromProtoMsg(message: QueryAllHostZoneRequestProtoMsg): QueryAllHostZoneRequest;
    toProto(message: QueryAllHostZoneRequest): Uint8Array;
    toProtoMsg(message: QueryAllHostZoneRequest): QueryAllHostZoneRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllHostZoneResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllHostZoneResponse
 */
export declare const QueryAllHostZoneResponse: {
    typeUrl: "/stride.stakeibc.QueryAllHostZoneResponse";
    is(o: any): o is QueryAllHostZoneResponse;
    isSDK(o: any): o is QueryAllHostZoneResponseSDKType;
    encode(message: QueryAllHostZoneResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllHostZoneResponse;
    fromJSON(object: any): QueryAllHostZoneResponse;
    toJSON(message: QueryAllHostZoneResponse): JsonSafe<QueryAllHostZoneResponse>;
    fromPartial(object: Partial<QueryAllHostZoneResponse>): QueryAllHostZoneResponse;
    fromProtoMsg(message: QueryAllHostZoneResponseProtoMsg): QueryAllHostZoneResponse;
    toProto(message: QueryAllHostZoneResponse): Uint8Array;
    toProtoMsg(message: QueryAllHostZoneResponse): QueryAllHostZoneResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryModuleAddressRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryModuleAddressRequest
 */
export declare const QueryModuleAddressRequest: {
    typeUrl: "/stride.stakeibc.QueryModuleAddressRequest";
    is(o: any): o is QueryModuleAddressRequest;
    isSDK(o: any): o is QueryModuleAddressRequestSDKType;
    encode(message: QueryModuleAddressRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryModuleAddressRequest;
    fromJSON(object: any): QueryModuleAddressRequest;
    toJSON(message: QueryModuleAddressRequest): JsonSafe<QueryModuleAddressRequest>;
    fromPartial(object: Partial<QueryModuleAddressRequest>): QueryModuleAddressRequest;
    fromProtoMsg(message: QueryModuleAddressRequestProtoMsg): QueryModuleAddressRequest;
    toProto(message: QueryModuleAddressRequest): Uint8Array;
    toProtoMsg(message: QueryModuleAddressRequest): QueryModuleAddressRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryModuleAddressResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryModuleAddressResponse
 */
export declare const QueryModuleAddressResponse: {
    typeUrl: "/stride.stakeibc.QueryModuleAddressResponse";
    is(o: any): o is QueryModuleAddressResponse;
    isSDK(o: any): o is QueryModuleAddressResponseSDKType;
    encode(message: QueryModuleAddressResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryModuleAddressResponse;
    fromJSON(object: any): QueryModuleAddressResponse;
    toJSON(message: QueryModuleAddressResponse): JsonSafe<QueryModuleAddressResponse>;
    fromPartial(object: Partial<QueryModuleAddressResponse>): QueryModuleAddressResponse;
    fromProtoMsg(message: QueryModuleAddressResponseProtoMsg): QueryModuleAddressResponse;
    toProto(message: QueryModuleAddressResponse): Uint8Array;
    toProtoMsg(message: QueryModuleAddressResponse): QueryModuleAddressResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryGetEpochTrackerRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetEpochTrackerRequest
 */
export declare const QueryGetEpochTrackerRequest: {
    typeUrl: "/stride.stakeibc.QueryGetEpochTrackerRequest";
    is(o: any): o is QueryGetEpochTrackerRequest;
    isSDK(o: any): o is QueryGetEpochTrackerRequestSDKType;
    encode(message: QueryGetEpochTrackerRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetEpochTrackerRequest;
    fromJSON(object: any): QueryGetEpochTrackerRequest;
    toJSON(message: QueryGetEpochTrackerRequest): JsonSafe<QueryGetEpochTrackerRequest>;
    fromPartial(object: Partial<QueryGetEpochTrackerRequest>): QueryGetEpochTrackerRequest;
    fromProtoMsg(message: QueryGetEpochTrackerRequestProtoMsg): QueryGetEpochTrackerRequest;
    toProto(message: QueryGetEpochTrackerRequest): Uint8Array;
    toProtoMsg(message: QueryGetEpochTrackerRequest): QueryGetEpochTrackerRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryGetEpochTrackerResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetEpochTrackerResponse
 */
export declare const QueryGetEpochTrackerResponse: {
    typeUrl: "/stride.stakeibc.QueryGetEpochTrackerResponse";
    is(o: any): o is QueryGetEpochTrackerResponse;
    isSDK(o: any): o is QueryGetEpochTrackerResponseSDKType;
    encode(message: QueryGetEpochTrackerResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetEpochTrackerResponse;
    fromJSON(object: any): QueryGetEpochTrackerResponse;
    toJSON(message: QueryGetEpochTrackerResponse): JsonSafe<QueryGetEpochTrackerResponse>;
    fromPartial(object: Partial<QueryGetEpochTrackerResponse>): QueryGetEpochTrackerResponse;
    fromProtoMsg(message: QueryGetEpochTrackerResponseProtoMsg): QueryGetEpochTrackerResponse;
    toProto(message: QueryGetEpochTrackerResponse): Uint8Array;
    toProtoMsg(message: QueryGetEpochTrackerResponse): QueryGetEpochTrackerResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllEpochTrackerRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllEpochTrackerRequest
 */
export declare const QueryAllEpochTrackerRequest: {
    typeUrl: "/stride.stakeibc.QueryAllEpochTrackerRequest";
    is(o: any): o is QueryAllEpochTrackerRequest;
    isSDK(o: any): o is QueryAllEpochTrackerRequestSDKType;
    encode(_: QueryAllEpochTrackerRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllEpochTrackerRequest;
    fromJSON(_: any): QueryAllEpochTrackerRequest;
    toJSON(_: QueryAllEpochTrackerRequest): JsonSafe<QueryAllEpochTrackerRequest>;
    fromPartial(_: Partial<QueryAllEpochTrackerRequest>): QueryAllEpochTrackerRequest;
    fromProtoMsg(message: QueryAllEpochTrackerRequestProtoMsg): QueryAllEpochTrackerRequest;
    toProto(message: QueryAllEpochTrackerRequest): Uint8Array;
    toProtoMsg(message: QueryAllEpochTrackerRequest): QueryAllEpochTrackerRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllEpochTrackerResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllEpochTrackerResponse
 */
export declare const QueryAllEpochTrackerResponse: {
    typeUrl: "/stride.stakeibc.QueryAllEpochTrackerResponse";
    is(o: any): o is QueryAllEpochTrackerResponse;
    isSDK(o: any): o is QueryAllEpochTrackerResponseSDKType;
    encode(message: QueryAllEpochTrackerResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllEpochTrackerResponse;
    fromJSON(object: any): QueryAllEpochTrackerResponse;
    toJSON(message: QueryAllEpochTrackerResponse): JsonSafe<QueryAllEpochTrackerResponse>;
    fromPartial(object: Partial<QueryAllEpochTrackerResponse>): QueryAllEpochTrackerResponse;
    fromProtoMsg(message: QueryAllEpochTrackerResponseProtoMsg): QueryAllEpochTrackerResponse;
    toProto(message: QueryAllEpochTrackerResponse): Uint8Array;
    toProtoMsg(message: QueryAllEpochTrackerResponse): QueryAllEpochTrackerResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryGetNextPacketSequenceRequest
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetNextPacketSequenceRequest
 */
export declare const QueryGetNextPacketSequenceRequest: {
    typeUrl: "/stride.stakeibc.QueryGetNextPacketSequenceRequest";
    is(o: any): o is QueryGetNextPacketSequenceRequest;
    isSDK(o: any): o is QueryGetNextPacketSequenceRequestSDKType;
    encode(message: QueryGetNextPacketSequenceRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetNextPacketSequenceRequest;
    fromJSON(object: any): QueryGetNextPacketSequenceRequest;
    toJSON(message: QueryGetNextPacketSequenceRequest): JsonSafe<QueryGetNextPacketSequenceRequest>;
    fromPartial(object: Partial<QueryGetNextPacketSequenceRequest>): QueryGetNextPacketSequenceRequest;
    fromProtoMsg(message: QueryGetNextPacketSequenceRequestProtoMsg): QueryGetNextPacketSequenceRequest;
    toProto(message: QueryGetNextPacketSequenceRequest): Uint8Array;
    toProtoMsg(message: QueryGetNextPacketSequenceRequest): QueryGetNextPacketSequenceRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryGetNextPacketSequenceResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryGetNextPacketSequenceResponse
 */
export declare const QueryGetNextPacketSequenceResponse: {
    typeUrl: "/stride.stakeibc.QueryGetNextPacketSequenceResponse";
    is(o: any): o is QueryGetNextPacketSequenceResponse;
    isSDK(o: any): o is QueryGetNextPacketSequenceResponseSDKType;
    encode(message: QueryGetNextPacketSequenceResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryGetNextPacketSequenceResponse;
    fromJSON(object: any): QueryGetNextPacketSequenceResponse;
    toJSON(message: QueryGetNextPacketSequenceResponse): JsonSafe<QueryGetNextPacketSequenceResponse>;
    fromPartial(object: Partial<QueryGetNextPacketSequenceResponse>): QueryGetNextPacketSequenceResponse;
    fromProtoMsg(message: QueryGetNextPacketSequenceResponseProtoMsg): QueryGetNextPacketSequenceResponse;
    toProto(message: QueryGetNextPacketSequenceResponse): Uint8Array;
    toProtoMsg(message: QueryGetNextPacketSequenceResponse): QueryGetNextPacketSequenceResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAddressUnbondings
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAddressUnbondings
 */
export declare const QueryAddressUnbondings: {
    typeUrl: "/stride.stakeibc.QueryAddressUnbondings";
    is(o: any): o is QueryAddressUnbondings;
    isSDK(o: any): o is QueryAddressUnbondingsSDKType;
    encode(message: QueryAddressUnbondings, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAddressUnbondings;
    fromJSON(object: any): QueryAddressUnbondings;
    toJSON(message: QueryAddressUnbondings): JsonSafe<QueryAddressUnbondings>;
    fromPartial(object: Partial<QueryAddressUnbondings>): QueryAddressUnbondings;
    fromProtoMsg(message: QueryAddressUnbondingsProtoMsg): QueryAddressUnbondings;
    toProto(message: QueryAddressUnbondings): Uint8Array;
    toProtoMsg(message: QueryAddressUnbondings): QueryAddressUnbondingsProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAddressUnbondingsResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAddressUnbondingsResponse
 */
export declare const QueryAddressUnbondingsResponse: {
    typeUrl: "/stride.stakeibc.QueryAddressUnbondingsResponse";
    is(o: any): o is QueryAddressUnbondingsResponse;
    isSDK(o: any): o is QueryAddressUnbondingsResponseSDKType;
    encode(message: QueryAddressUnbondingsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAddressUnbondingsResponse;
    fromJSON(object: any): QueryAddressUnbondingsResponse;
    toJSON(message: QueryAddressUnbondingsResponse): JsonSafe<QueryAddressUnbondingsResponse>;
    fromPartial(object: Partial<QueryAddressUnbondingsResponse>): QueryAddressUnbondingsResponse;
    fromProtoMsg(message: QueryAddressUnbondingsResponseProtoMsg): QueryAddressUnbondingsResponse;
    toProto(message: QueryAddressUnbondingsResponse): Uint8Array;
    toProtoMsg(message: QueryAddressUnbondingsResponse): QueryAddressUnbondingsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllTradeRoutes
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllTradeRoutes
 */
export declare const QueryAllTradeRoutes: {
    typeUrl: "/stride.stakeibc.QueryAllTradeRoutes";
    is(o: any): o is QueryAllTradeRoutes;
    isSDK(o: any): o is QueryAllTradeRoutesSDKType;
    encode(_: QueryAllTradeRoutes, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllTradeRoutes;
    fromJSON(_: any): QueryAllTradeRoutes;
    toJSON(_: QueryAllTradeRoutes): JsonSafe<QueryAllTradeRoutes>;
    fromPartial(_: Partial<QueryAllTradeRoutes>): QueryAllTradeRoutes;
    fromProtoMsg(message: QueryAllTradeRoutesProtoMsg): QueryAllTradeRoutes;
    toProto(message: QueryAllTradeRoutes): Uint8Array;
    toProtoMsg(message: QueryAllTradeRoutes): QueryAllTradeRoutesProtoMsg;
    registerTypeUrl(): void;
};
/**
 * @name QueryAllTradeRoutesResponse
 * @package stride.stakeibc
 * @see proto type: stride.stakeibc.QueryAllTradeRoutesResponse
 */
export declare const QueryAllTradeRoutesResponse: {
    typeUrl: "/stride.stakeibc.QueryAllTradeRoutesResponse";
    is(o: any): o is QueryAllTradeRoutesResponse;
    isSDK(o: any): o is QueryAllTradeRoutesResponseSDKType;
    encode(message: QueryAllTradeRoutesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllTradeRoutesResponse;
    fromJSON(object: any): QueryAllTradeRoutesResponse;
    toJSON(message: QueryAllTradeRoutesResponse): JsonSafe<QueryAllTradeRoutesResponse>;
    fromPartial(object: Partial<QueryAllTradeRoutesResponse>): QueryAllTradeRoutesResponse;
    fromProtoMsg(message: QueryAllTradeRoutesResponseProtoMsg): QueryAllTradeRoutesResponse;
    toProto(message: QueryAllTradeRoutesResponse): Uint8Array;
    toProtoMsg(message: QueryAllTradeRoutesResponse): QueryAllTradeRoutesResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map