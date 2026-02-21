import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../base/query/v1beta1/pagination.js';
import { Any, type AnySDKType } from '../../../google/protobuf/any.js';
import { Params, type ParamsSDKType, BaseAccount, type BaseAccountSDKType, ModuleAccount, type ModuleAccountSDKType } from './auth.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * QueryAccountsRequest is the request type for the Query/Accounts RPC method.
 *
 * Since: cosmos-sdk 0.43
 * @name QueryAccountsRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountsRequest
 */
export interface QueryAccountsRequest {
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryAccountsRequestProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryAccountsRequest';
    value: Uint8Array;
}
/**
 * QueryAccountsRequest is the request type for the Query/Accounts RPC method.
 *
 * Since: cosmos-sdk 0.43
 * @name QueryAccountsRequestSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountsRequest
 */
export interface QueryAccountsRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * QueryAccountsResponse is the response type for the Query/Accounts RPC method.
 *
 * Since: cosmos-sdk 0.43
 * @name QueryAccountsResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountsResponse
 */
export interface QueryAccountsResponse {
    /**
     * accounts are the existing accounts
     */
    accounts: (BaseAccount | Any)[] | Any[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryAccountsResponseProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryAccountsResponse';
    value: Uint8Array;
}
/**
 * QueryAccountsResponse is the response type for the Query/Accounts RPC method.
 *
 * Since: cosmos-sdk 0.43
 * @name QueryAccountsResponseSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountsResponse
 */
export interface QueryAccountsResponseSDKType {
    accounts: (BaseAccountSDKType | AnySDKType)[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryAccountRequest is the request type for the Query/Account RPC method.
 * @name QueryAccountRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountRequest
 */
export interface QueryAccountRequest {
    /**
     * address defines the address to query for.
     */
    address: string;
}
export interface QueryAccountRequestProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryAccountRequest';
    value: Uint8Array;
}
/**
 * QueryAccountRequest is the request type for the Query/Account RPC method.
 * @name QueryAccountRequestSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountRequest
 */
export interface QueryAccountRequestSDKType {
    address: string;
}
/**
 * QueryAccountResponse is the response type for the Query/Account RPC method.
 * @name QueryAccountResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountResponse
 */
export interface QueryAccountResponse {
    /**
     * account defines the account of the corresponding address.
     */
    account?: BaseAccount | Any | undefined;
}
export interface QueryAccountResponseProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryAccountResponse';
    value: Uint8Array;
}
/**
 * QueryAccountResponse is the response type for the Query/Account RPC method.
 * @name QueryAccountResponseSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountResponse
 */
export interface QueryAccountResponseSDKType {
    account?: BaseAccountSDKType | AnySDKType | undefined;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequestSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * params defines the parameters of the module.
     */
    params: Params;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse is the response type for the Query/Params RPC method.
 * @name QueryParamsResponseSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    params: ParamsSDKType;
}
/**
 * QueryModuleAccountsRequest is the request type for the Query/ModuleAccounts RPC method.
 *
 * Since: cosmos-sdk 0.46
 * @name QueryModuleAccountsRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryModuleAccountsRequest
 */
export interface QueryModuleAccountsRequest {
}
export interface QueryModuleAccountsRequestProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryModuleAccountsRequest';
    value: Uint8Array;
}
/**
 * QueryModuleAccountsRequest is the request type for the Query/ModuleAccounts RPC method.
 *
 * Since: cosmos-sdk 0.46
 * @name QueryModuleAccountsRequestSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryModuleAccountsRequest
 */
export interface QueryModuleAccountsRequestSDKType {
}
/**
 * QueryModuleAccountsResponse is the response type for the Query/ModuleAccounts RPC method.
 *
 * Since: cosmos-sdk 0.46
 * @name QueryModuleAccountsResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryModuleAccountsResponse
 */
export interface QueryModuleAccountsResponse {
    accounts: (ModuleAccount | Any)[] | Any[];
}
export interface QueryModuleAccountsResponseProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryModuleAccountsResponse';
    value: Uint8Array;
}
/**
 * QueryModuleAccountsResponse is the response type for the Query/ModuleAccounts RPC method.
 *
 * Since: cosmos-sdk 0.46
 * @name QueryModuleAccountsResponseSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryModuleAccountsResponse
 */
export interface QueryModuleAccountsResponseSDKType {
    accounts: (ModuleAccountSDKType | AnySDKType)[];
}
/**
 * QueryModuleAccountByNameRequest is the request type for the Query/ModuleAccountByName RPC method.
 * @name QueryModuleAccountByNameRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryModuleAccountByNameRequest
 */
export interface QueryModuleAccountByNameRequest {
    name: string;
}
export interface QueryModuleAccountByNameRequestProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryModuleAccountByNameRequest';
    value: Uint8Array;
}
/**
 * QueryModuleAccountByNameRequest is the request type for the Query/ModuleAccountByName RPC method.
 * @name QueryModuleAccountByNameRequestSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryModuleAccountByNameRequest
 */
export interface QueryModuleAccountByNameRequestSDKType {
    name: string;
}
/**
 * QueryModuleAccountByNameResponse is the response type for the Query/ModuleAccountByName RPC method.
 * @name QueryModuleAccountByNameResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryModuleAccountByNameResponse
 */
export interface QueryModuleAccountByNameResponse {
    account?: ModuleAccount | Any | undefined;
}
export interface QueryModuleAccountByNameResponseProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryModuleAccountByNameResponse';
    value: Uint8Array;
}
/**
 * QueryModuleAccountByNameResponse is the response type for the Query/ModuleAccountByName RPC method.
 * @name QueryModuleAccountByNameResponseSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryModuleAccountByNameResponse
 */
export interface QueryModuleAccountByNameResponseSDKType {
    account?: ModuleAccountSDKType | AnySDKType | undefined;
}
/**
 * Bech32PrefixRequest is the request type for Bech32Prefix rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name Bech32PrefixRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.Bech32PrefixRequest
 */
export interface Bech32PrefixRequest {
}
export interface Bech32PrefixRequestProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.Bech32PrefixRequest';
    value: Uint8Array;
}
/**
 * Bech32PrefixRequest is the request type for Bech32Prefix rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name Bech32PrefixRequestSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.Bech32PrefixRequest
 */
export interface Bech32PrefixRequestSDKType {
}
/**
 * Bech32PrefixResponse is the response type for Bech32Prefix rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name Bech32PrefixResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.Bech32PrefixResponse
 */
export interface Bech32PrefixResponse {
    bech32Prefix: string;
}
export interface Bech32PrefixResponseProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.Bech32PrefixResponse';
    value: Uint8Array;
}
/**
 * Bech32PrefixResponse is the response type for Bech32Prefix rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name Bech32PrefixResponseSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.Bech32PrefixResponse
 */
export interface Bech32PrefixResponseSDKType {
    bech32_prefix: string;
}
/**
 * AddressBytesToStringRequest is the request type for AddressString rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name AddressBytesToStringRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.AddressBytesToStringRequest
 */
export interface AddressBytesToStringRequest {
    addressBytes: Uint8Array;
}
export interface AddressBytesToStringRequestProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.AddressBytesToStringRequest';
    value: Uint8Array;
}
/**
 * AddressBytesToStringRequest is the request type for AddressString rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name AddressBytesToStringRequestSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.AddressBytesToStringRequest
 */
export interface AddressBytesToStringRequestSDKType {
    address_bytes: Uint8Array;
}
/**
 * AddressBytesToStringResponse is the response type for AddressString rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name AddressBytesToStringResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.AddressBytesToStringResponse
 */
export interface AddressBytesToStringResponse {
    addressString: string;
}
export interface AddressBytesToStringResponseProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.AddressBytesToStringResponse';
    value: Uint8Array;
}
/**
 * AddressBytesToStringResponse is the response type for AddressString rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name AddressBytesToStringResponseSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.AddressBytesToStringResponse
 */
export interface AddressBytesToStringResponseSDKType {
    address_string: string;
}
/**
 * AddressStringToBytesRequest is the request type for AccountBytes rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name AddressStringToBytesRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.AddressStringToBytesRequest
 */
export interface AddressStringToBytesRequest {
    addressString: string;
}
export interface AddressStringToBytesRequestProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.AddressStringToBytesRequest';
    value: Uint8Array;
}
/**
 * AddressStringToBytesRequest is the request type for AccountBytes rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name AddressStringToBytesRequestSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.AddressStringToBytesRequest
 */
export interface AddressStringToBytesRequestSDKType {
    address_string: string;
}
/**
 * AddressStringToBytesResponse is the response type for AddressBytes rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name AddressStringToBytesResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.AddressStringToBytesResponse
 */
export interface AddressStringToBytesResponse {
    addressBytes: Uint8Array;
}
export interface AddressStringToBytesResponseProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.AddressStringToBytesResponse';
    value: Uint8Array;
}
/**
 * AddressStringToBytesResponse is the response type for AddressBytes rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name AddressStringToBytesResponseSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.AddressStringToBytesResponse
 */
export interface AddressStringToBytesResponseSDKType {
    address_bytes: Uint8Array;
}
/**
 * QueryAccountAddressByIDRequest is the request type for AccountAddressByID rpc method
 *
 * Since: cosmos-sdk 0.46.2
 * @name QueryAccountAddressByIDRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountAddressByIDRequest
 */
export interface QueryAccountAddressByIDRequest {
    /**
     * Deprecated, use account_id instead
     *
     * id is the account number of the address to be queried. This field
     * should have been an uint64 (like all account numbers), and will be
     * updated to uint64 in a future version of the auth query.
     * @deprecated
     */
    id: bigint;
    /**
     * account_id is the account number of the address to be queried.
     *
     * Since: cosmos-sdk 0.47
     */
    accountId: bigint;
}
export interface QueryAccountAddressByIDRequestProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryAccountAddressByIDRequest';
    value: Uint8Array;
}
/**
 * QueryAccountAddressByIDRequest is the request type for AccountAddressByID rpc method
 *
 * Since: cosmos-sdk 0.46.2
 * @name QueryAccountAddressByIDRequestSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountAddressByIDRequest
 */
export interface QueryAccountAddressByIDRequestSDKType {
    /**
     * @deprecated
     */
    id: bigint;
    account_id: bigint;
}
/**
 * QueryAccountAddressByIDResponse is the response type for AccountAddressByID rpc method
 *
 * Since: cosmos-sdk 0.46.2
 * @name QueryAccountAddressByIDResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountAddressByIDResponse
 */
export interface QueryAccountAddressByIDResponse {
    accountAddress: string;
}
export interface QueryAccountAddressByIDResponseProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryAccountAddressByIDResponse';
    value: Uint8Array;
}
/**
 * QueryAccountAddressByIDResponse is the response type for AccountAddressByID rpc method
 *
 * Since: cosmos-sdk 0.46.2
 * @name QueryAccountAddressByIDResponseSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountAddressByIDResponse
 */
export interface QueryAccountAddressByIDResponseSDKType {
    account_address: string;
}
/**
 * QueryAccountInfoRequest is the Query/AccountInfo request type.
 *
 * Since: cosmos-sdk 0.47
 * @name QueryAccountInfoRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountInfoRequest
 */
export interface QueryAccountInfoRequest {
    /**
     * address is the account address string.
     */
    address: string;
}
export interface QueryAccountInfoRequestProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryAccountInfoRequest';
    value: Uint8Array;
}
/**
 * QueryAccountInfoRequest is the Query/AccountInfo request type.
 *
 * Since: cosmos-sdk 0.47
 * @name QueryAccountInfoRequestSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountInfoRequest
 */
export interface QueryAccountInfoRequestSDKType {
    address: string;
}
/**
 * QueryAccountInfoResponse is the Query/AccountInfo response type.
 *
 * Since: cosmos-sdk 0.47
 * @name QueryAccountInfoResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountInfoResponse
 */
export interface QueryAccountInfoResponse {
    /**
     * info is the account info which is represented by BaseAccount.
     */
    info?: BaseAccount;
}
export interface QueryAccountInfoResponseProtoMsg {
    typeUrl: '/cosmos.auth.v1beta1.QueryAccountInfoResponse';
    value: Uint8Array;
}
/**
 * QueryAccountInfoResponse is the Query/AccountInfo response type.
 *
 * Since: cosmos-sdk 0.47
 * @name QueryAccountInfoResponseSDKType
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountInfoResponse
 */
export interface QueryAccountInfoResponseSDKType {
    info?: BaseAccountSDKType;
}
/**
 * QueryAccountsRequest is the request type for the Query/Accounts RPC method.
 *
 * Since: cosmos-sdk 0.43
 * @name QueryAccountsRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountsRequest
 */
export declare const QueryAccountsRequest: {
    typeUrl: "/cosmos.auth.v1beta1.QueryAccountsRequest";
    aminoType: "cosmos-sdk/QueryAccountsRequest";
    is(o: any): o is QueryAccountsRequest;
    isSDK(o: any): o is QueryAccountsRequestSDKType;
    encode(message: QueryAccountsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAccountsRequest;
    fromJSON(object: any): QueryAccountsRequest;
    toJSON(message: QueryAccountsRequest): JsonSafe<QueryAccountsRequest>;
    fromPartial(object: Partial<QueryAccountsRequest>): QueryAccountsRequest;
    fromProtoMsg(message: QueryAccountsRequestProtoMsg): QueryAccountsRequest;
    toProto(message: QueryAccountsRequest): Uint8Array;
    toProtoMsg(message: QueryAccountsRequest): QueryAccountsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAccountsResponse is the response type for the Query/Accounts RPC method.
 *
 * Since: cosmos-sdk 0.43
 * @name QueryAccountsResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountsResponse
 */
export declare const QueryAccountsResponse: {
    typeUrl: "/cosmos.auth.v1beta1.QueryAccountsResponse";
    aminoType: "cosmos-sdk/QueryAccountsResponse";
    is(o: any): o is QueryAccountsResponse;
    isSDK(o: any): o is QueryAccountsResponseSDKType;
    encode(message: QueryAccountsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAccountsResponse;
    fromJSON(object: any): QueryAccountsResponse;
    toJSON(message: QueryAccountsResponse): JsonSafe<QueryAccountsResponse>;
    fromPartial(object: Partial<QueryAccountsResponse>): QueryAccountsResponse;
    fromProtoMsg(message: QueryAccountsResponseProtoMsg): QueryAccountsResponse;
    toProto(message: QueryAccountsResponse): Uint8Array;
    toProtoMsg(message: QueryAccountsResponse): QueryAccountsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAccountRequest is the request type for the Query/Account RPC method.
 * @name QueryAccountRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountRequest
 */
export declare const QueryAccountRequest: {
    typeUrl: "/cosmos.auth.v1beta1.QueryAccountRequest";
    aminoType: "cosmos-sdk/QueryAccountRequest";
    is(o: any): o is QueryAccountRequest;
    isSDK(o: any): o is QueryAccountRequestSDKType;
    encode(message: QueryAccountRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAccountRequest;
    fromJSON(object: any): QueryAccountRequest;
    toJSON(message: QueryAccountRequest): JsonSafe<QueryAccountRequest>;
    fromPartial(object: Partial<QueryAccountRequest>): QueryAccountRequest;
    fromProtoMsg(message: QueryAccountRequestProtoMsg): QueryAccountRequest;
    toProto(message: QueryAccountRequest): Uint8Array;
    toProtoMsg(message: QueryAccountRequest): QueryAccountRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAccountResponse is the response type for the Query/Account RPC method.
 * @name QueryAccountResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountResponse
 */
export declare const QueryAccountResponse: {
    typeUrl: "/cosmos.auth.v1beta1.QueryAccountResponse";
    aminoType: "cosmos-sdk/QueryAccountResponse";
    is(o: any): o is QueryAccountResponse;
    isSDK(o: any): o is QueryAccountResponseSDKType;
    encode(message: QueryAccountResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAccountResponse;
    fromJSON(object: any): QueryAccountResponse;
    toJSON(message: QueryAccountResponse): JsonSafe<QueryAccountResponse>;
    fromPartial(object: Partial<QueryAccountResponse>): QueryAccountResponse;
    fromProtoMsg(message: QueryAccountResponseProtoMsg): QueryAccountResponse;
    toProto(message: QueryAccountResponse): Uint8Array;
    toProtoMsg(message: QueryAccountResponse): QueryAccountResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryParamsRequest is the request type for the Query/Params RPC method.
 * @name QueryParamsRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/cosmos.auth.v1beta1.QueryParamsRequest";
    aminoType: "cosmos-sdk/QueryParamsRequest";
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
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/cosmos.auth.v1beta1.QueryParamsResponse";
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
 * QueryModuleAccountsRequest is the request type for the Query/ModuleAccounts RPC method.
 *
 * Since: cosmos-sdk 0.46
 * @name QueryModuleAccountsRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryModuleAccountsRequest
 */
export declare const QueryModuleAccountsRequest: {
    typeUrl: "/cosmos.auth.v1beta1.QueryModuleAccountsRequest";
    aminoType: "cosmos-sdk/QueryModuleAccountsRequest";
    is(o: any): o is QueryModuleAccountsRequest;
    isSDK(o: any): o is QueryModuleAccountsRequestSDKType;
    encode(_: QueryModuleAccountsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryModuleAccountsRequest;
    fromJSON(_: any): QueryModuleAccountsRequest;
    toJSON(_: QueryModuleAccountsRequest): JsonSafe<QueryModuleAccountsRequest>;
    fromPartial(_: Partial<QueryModuleAccountsRequest>): QueryModuleAccountsRequest;
    fromProtoMsg(message: QueryModuleAccountsRequestProtoMsg): QueryModuleAccountsRequest;
    toProto(message: QueryModuleAccountsRequest): Uint8Array;
    toProtoMsg(message: QueryModuleAccountsRequest): QueryModuleAccountsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryModuleAccountsResponse is the response type for the Query/ModuleAccounts RPC method.
 *
 * Since: cosmos-sdk 0.46
 * @name QueryModuleAccountsResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryModuleAccountsResponse
 */
export declare const QueryModuleAccountsResponse: {
    typeUrl: "/cosmos.auth.v1beta1.QueryModuleAccountsResponse";
    aminoType: "cosmos-sdk/QueryModuleAccountsResponse";
    is(o: any): o is QueryModuleAccountsResponse;
    isSDK(o: any): o is QueryModuleAccountsResponseSDKType;
    encode(message: QueryModuleAccountsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryModuleAccountsResponse;
    fromJSON(object: any): QueryModuleAccountsResponse;
    toJSON(message: QueryModuleAccountsResponse): JsonSafe<QueryModuleAccountsResponse>;
    fromPartial(object: Partial<QueryModuleAccountsResponse>): QueryModuleAccountsResponse;
    fromProtoMsg(message: QueryModuleAccountsResponseProtoMsg): QueryModuleAccountsResponse;
    toProto(message: QueryModuleAccountsResponse): Uint8Array;
    toProtoMsg(message: QueryModuleAccountsResponse): QueryModuleAccountsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryModuleAccountByNameRequest is the request type for the Query/ModuleAccountByName RPC method.
 * @name QueryModuleAccountByNameRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryModuleAccountByNameRequest
 */
export declare const QueryModuleAccountByNameRequest: {
    typeUrl: "/cosmos.auth.v1beta1.QueryModuleAccountByNameRequest";
    aminoType: "cosmos-sdk/QueryModuleAccountByNameRequest";
    is(o: any): o is QueryModuleAccountByNameRequest;
    isSDK(o: any): o is QueryModuleAccountByNameRequestSDKType;
    encode(message: QueryModuleAccountByNameRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryModuleAccountByNameRequest;
    fromJSON(object: any): QueryModuleAccountByNameRequest;
    toJSON(message: QueryModuleAccountByNameRequest): JsonSafe<QueryModuleAccountByNameRequest>;
    fromPartial(object: Partial<QueryModuleAccountByNameRequest>): QueryModuleAccountByNameRequest;
    fromProtoMsg(message: QueryModuleAccountByNameRequestProtoMsg): QueryModuleAccountByNameRequest;
    toProto(message: QueryModuleAccountByNameRequest): Uint8Array;
    toProtoMsg(message: QueryModuleAccountByNameRequest): QueryModuleAccountByNameRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryModuleAccountByNameResponse is the response type for the Query/ModuleAccountByName RPC method.
 * @name QueryModuleAccountByNameResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryModuleAccountByNameResponse
 */
export declare const QueryModuleAccountByNameResponse: {
    typeUrl: "/cosmos.auth.v1beta1.QueryModuleAccountByNameResponse";
    aminoType: "cosmos-sdk/QueryModuleAccountByNameResponse";
    is(o: any): o is QueryModuleAccountByNameResponse;
    isSDK(o: any): o is QueryModuleAccountByNameResponseSDKType;
    encode(message: QueryModuleAccountByNameResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryModuleAccountByNameResponse;
    fromJSON(object: any): QueryModuleAccountByNameResponse;
    toJSON(message: QueryModuleAccountByNameResponse): JsonSafe<QueryModuleAccountByNameResponse>;
    fromPartial(object: Partial<QueryModuleAccountByNameResponse>): QueryModuleAccountByNameResponse;
    fromProtoMsg(message: QueryModuleAccountByNameResponseProtoMsg): QueryModuleAccountByNameResponse;
    toProto(message: QueryModuleAccountByNameResponse): Uint8Array;
    toProtoMsg(message: QueryModuleAccountByNameResponse): QueryModuleAccountByNameResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Bech32PrefixRequest is the request type for Bech32Prefix rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name Bech32PrefixRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.Bech32PrefixRequest
 */
export declare const Bech32PrefixRequest: {
    typeUrl: "/cosmos.auth.v1beta1.Bech32PrefixRequest";
    aminoType: "cosmos-sdk/Bech32PrefixRequest";
    is(o: any): o is Bech32PrefixRequest;
    isSDK(o: any): o is Bech32PrefixRequestSDKType;
    encode(_: Bech32PrefixRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Bech32PrefixRequest;
    fromJSON(_: any): Bech32PrefixRequest;
    toJSON(_: Bech32PrefixRequest): JsonSafe<Bech32PrefixRequest>;
    fromPartial(_: Partial<Bech32PrefixRequest>): Bech32PrefixRequest;
    fromProtoMsg(message: Bech32PrefixRequestProtoMsg): Bech32PrefixRequest;
    toProto(message: Bech32PrefixRequest): Uint8Array;
    toProtoMsg(message: Bech32PrefixRequest): Bech32PrefixRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * Bech32PrefixResponse is the response type for Bech32Prefix rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name Bech32PrefixResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.Bech32PrefixResponse
 */
export declare const Bech32PrefixResponse: {
    typeUrl: "/cosmos.auth.v1beta1.Bech32PrefixResponse";
    aminoType: "cosmos-sdk/Bech32PrefixResponse";
    is(o: any): o is Bech32PrefixResponse;
    isSDK(o: any): o is Bech32PrefixResponseSDKType;
    encode(message: Bech32PrefixResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): Bech32PrefixResponse;
    fromJSON(object: any): Bech32PrefixResponse;
    toJSON(message: Bech32PrefixResponse): JsonSafe<Bech32PrefixResponse>;
    fromPartial(object: Partial<Bech32PrefixResponse>): Bech32PrefixResponse;
    fromProtoMsg(message: Bech32PrefixResponseProtoMsg): Bech32PrefixResponse;
    toProto(message: Bech32PrefixResponse): Uint8Array;
    toProtoMsg(message: Bech32PrefixResponse): Bech32PrefixResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * AddressBytesToStringRequest is the request type for AddressString rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name AddressBytesToStringRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.AddressBytesToStringRequest
 */
export declare const AddressBytesToStringRequest: {
    typeUrl: "/cosmos.auth.v1beta1.AddressBytesToStringRequest";
    aminoType: "cosmos-sdk/AddressBytesToStringRequest";
    is(o: any): o is AddressBytesToStringRequest;
    isSDK(o: any): o is AddressBytesToStringRequestSDKType;
    encode(message: AddressBytesToStringRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): AddressBytesToStringRequest;
    fromJSON(object: any): AddressBytesToStringRequest;
    toJSON(message: AddressBytesToStringRequest): JsonSafe<AddressBytesToStringRequest>;
    fromPartial(object: Partial<AddressBytesToStringRequest>): AddressBytesToStringRequest;
    fromProtoMsg(message: AddressBytesToStringRequestProtoMsg): AddressBytesToStringRequest;
    toProto(message: AddressBytesToStringRequest): Uint8Array;
    toProtoMsg(message: AddressBytesToStringRequest): AddressBytesToStringRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * AddressBytesToStringResponse is the response type for AddressString rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name AddressBytesToStringResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.AddressBytesToStringResponse
 */
export declare const AddressBytesToStringResponse: {
    typeUrl: "/cosmos.auth.v1beta1.AddressBytesToStringResponse";
    aminoType: "cosmos-sdk/AddressBytesToStringResponse";
    is(o: any): o is AddressBytesToStringResponse;
    isSDK(o: any): o is AddressBytesToStringResponseSDKType;
    encode(message: AddressBytesToStringResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): AddressBytesToStringResponse;
    fromJSON(object: any): AddressBytesToStringResponse;
    toJSON(message: AddressBytesToStringResponse): JsonSafe<AddressBytesToStringResponse>;
    fromPartial(object: Partial<AddressBytesToStringResponse>): AddressBytesToStringResponse;
    fromProtoMsg(message: AddressBytesToStringResponseProtoMsg): AddressBytesToStringResponse;
    toProto(message: AddressBytesToStringResponse): Uint8Array;
    toProtoMsg(message: AddressBytesToStringResponse): AddressBytesToStringResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * AddressStringToBytesRequest is the request type for AccountBytes rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name AddressStringToBytesRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.AddressStringToBytesRequest
 */
export declare const AddressStringToBytesRequest: {
    typeUrl: "/cosmos.auth.v1beta1.AddressStringToBytesRequest";
    aminoType: "cosmos-sdk/AddressStringToBytesRequest";
    is(o: any): o is AddressStringToBytesRequest;
    isSDK(o: any): o is AddressStringToBytesRequestSDKType;
    encode(message: AddressStringToBytesRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): AddressStringToBytesRequest;
    fromJSON(object: any): AddressStringToBytesRequest;
    toJSON(message: AddressStringToBytesRequest): JsonSafe<AddressStringToBytesRequest>;
    fromPartial(object: Partial<AddressStringToBytesRequest>): AddressStringToBytesRequest;
    fromProtoMsg(message: AddressStringToBytesRequestProtoMsg): AddressStringToBytesRequest;
    toProto(message: AddressStringToBytesRequest): Uint8Array;
    toProtoMsg(message: AddressStringToBytesRequest): AddressStringToBytesRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * AddressStringToBytesResponse is the response type for AddressBytes rpc method.
 *
 * Since: cosmos-sdk 0.46
 * @name AddressStringToBytesResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.AddressStringToBytesResponse
 */
export declare const AddressStringToBytesResponse: {
    typeUrl: "/cosmos.auth.v1beta1.AddressStringToBytesResponse";
    aminoType: "cosmos-sdk/AddressStringToBytesResponse";
    is(o: any): o is AddressStringToBytesResponse;
    isSDK(o: any): o is AddressStringToBytesResponseSDKType;
    encode(message: AddressStringToBytesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): AddressStringToBytesResponse;
    fromJSON(object: any): AddressStringToBytesResponse;
    toJSON(message: AddressStringToBytesResponse): JsonSafe<AddressStringToBytesResponse>;
    fromPartial(object: Partial<AddressStringToBytesResponse>): AddressStringToBytesResponse;
    fromProtoMsg(message: AddressStringToBytesResponseProtoMsg): AddressStringToBytesResponse;
    toProto(message: AddressStringToBytesResponse): Uint8Array;
    toProtoMsg(message: AddressStringToBytesResponse): AddressStringToBytesResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAccountAddressByIDRequest is the request type for AccountAddressByID rpc method
 *
 * Since: cosmos-sdk 0.46.2
 * @name QueryAccountAddressByIDRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountAddressByIDRequest
 */
export declare const QueryAccountAddressByIDRequest: {
    typeUrl: "/cosmos.auth.v1beta1.QueryAccountAddressByIDRequest";
    aminoType: "cosmos-sdk/QueryAccountAddressByIDRequest";
    is(o: any): o is QueryAccountAddressByIDRequest;
    isSDK(o: any): o is QueryAccountAddressByIDRequestSDKType;
    encode(message: QueryAccountAddressByIDRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAccountAddressByIDRequest;
    fromJSON(object: any): QueryAccountAddressByIDRequest;
    toJSON(message: QueryAccountAddressByIDRequest): JsonSafe<QueryAccountAddressByIDRequest>;
    fromPartial(object: Partial<QueryAccountAddressByIDRequest>): QueryAccountAddressByIDRequest;
    fromProtoMsg(message: QueryAccountAddressByIDRequestProtoMsg): QueryAccountAddressByIDRequest;
    toProto(message: QueryAccountAddressByIDRequest): Uint8Array;
    toProtoMsg(message: QueryAccountAddressByIDRequest): QueryAccountAddressByIDRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAccountAddressByIDResponse is the response type for AccountAddressByID rpc method
 *
 * Since: cosmos-sdk 0.46.2
 * @name QueryAccountAddressByIDResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountAddressByIDResponse
 */
export declare const QueryAccountAddressByIDResponse: {
    typeUrl: "/cosmos.auth.v1beta1.QueryAccountAddressByIDResponse";
    aminoType: "cosmos-sdk/QueryAccountAddressByIDResponse";
    is(o: any): o is QueryAccountAddressByIDResponse;
    isSDK(o: any): o is QueryAccountAddressByIDResponseSDKType;
    encode(message: QueryAccountAddressByIDResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAccountAddressByIDResponse;
    fromJSON(object: any): QueryAccountAddressByIDResponse;
    toJSON(message: QueryAccountAddressByIDResponse): JsonSafe<QueryAccountAddressByIDResponse>;
    fromPartial(object: Partial<QueryAccountAddressByIDResponse>): QueryAccountAddressByIDResponse;
    fromProtoMsg(message: QueryAccountAddressByIDResponseProtoMsg): QueryAccountAddressByIDResponse;
    toProto(message: QueryAccountAddressByIDResponse): Uint8Array;
    toProtoMsg(message: QueryAccountAddressByIDResponse): QueryAccountAddressByIDResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAccountInfoRequest is the Query/AccountInfo request type.
 *
 * Since: cosmos-sdk 0.47
 * @name QueryAccountInfoRequest
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountInfoRequest
 */
export declare const QueryAccountInfoRequest: {
    typeUrl: "/cosmos.auth.v1beta1.QueryAccountInfoRequest";
    aminoType: "cosmos-sdk/QueryAccountInfoRequest";
    is(o: any): o is QueryAccountInfoRequest;
    isSDK(o: any): o is QueryAccountInfoRequestSDKType;
    encode(message: QueryAccountInfoRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAccountInfoRequest;
    fromJSON(object: any): QueryAccountInfoRequest;
    toJSON(message: QueryAccountInfoRequest): JsonSafe<QueryAccountInfoRequest>;
    fromPartial(object: Partial<QueryAccountInfoRequest>): QueryAccountInfoRequest;
    fromProtoMsg(message: QueryAccountInfoRequestProtoMsg): QueryAccountInfoRequest;
    toProto(message: QueryAccountInfoRequest): Uint8Array;
    toProtoMsg(message: QueryAccountInfoRequest): QueryAccountInfoRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAccountInfoResponse is the Query/AccountInfo response type.
 *
 * Since: cosmos-sdk 0.47
 * @name QueryAccountInfoResponse
 * @package cosmos.auth.v1beta1
 * @see proto type: cosmos.auth.v1beta1.QueryAccountInfoResponse
 */
export declare const QueryAccountInfoResponse: {
    typeUrl: "/cosmos.auth.v1beta1.QueryAccountInfoResponse";
    aminoType: "cosmos-sdk/QueryAccountInfoResponse";
    is(o: any): o is QueryAccountInfoResponse;
    isSDK(o: any): o is QueryAccountInfoResponseSDKType;
    encode(message: QueryAccountInfoResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAccountInfoResponse;
    fromJSON(object: any): QueryAccountInfoResponse;
    toJSON(message: QueryAccountInfoResponse): JsonSafe<QueryAccountInfoResponse>;
    fromPartial(object: Partial<QueryAccountInfoResponse>): QueryAccountInfoResponse;
    fromProtoMsg(message: QueryAccountInfoResponseProtoMsg): QueryAccountInfoResponse;
    toProto(message: QueryAccountInfoResponse): Uint8Array;
    toProtoMsg(message: QueryAccountInfoResponse): QueryAccountInfoResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map