import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../base/query/v1beta1/pagination.js';
import { Permissions, type PermissionsSDKType, GenesisAccountPermissions, type GenesisAccountPermissionsSDKType } from './types.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * QueryAccountRequest is the request type for the Query/Account RPC method.
 * @name QueryAccountRequest
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.QueryAccountRequest
 */
export interface QueryAccountRequest {
    address: string;
}
export interface QueryAccountRequestProtoMsg {
    typeUrl: '/cosmos.circuit.v1.QueryAccountRequest';
    value: Uint8Array;
}
/**
 * QueryAccountRequest is the request type for the Query/Account RPC method.
 * @name QueryAccountRequestSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.QueryAccountRequest
 */
export interface QueryAccountRequestSDKType {
    address: string;
}
/**
 * AccountResponse is the response type for the Query/Account RPC method.
 * @name AccountResponse
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.AccountResponse
 */
export interface AccountResponse {
    permission?: Permissions;
}
export interface AccountResponseProtoMsg {
    typeUrl: '/cosmos.circuit.v1.AccountResponse';
    value: Uint8Array;
}
/**
 * AccountResponse is the response type for the Query/Account RPC method.
 * @name AccountResponseSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.AccountResponse
 */
export interface AccountResponseSDKType {
    permission?: PermissionsSDKType;
}
/**
 * QueryAccountsRequest is the request type for the Query/Accounts RPC method.
 * @name QueryAccountsRequest
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.QueryAccountsRequest
 */
export interface QueryAccountsRequest {
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryAccountsRequestProtoMsg {
    typeUrl: '/cosmos.circuit.v1.QueryAccountsRequest';
    value: Uint8Array;
}
/**
 * QueryAccountsRequest is the request type for the Query/Accounts RPC method.
 * @name QueryAccountsRequestSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.QueryAccountsRequest
 */
export interface QueryAccountsRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * AccountsResponse is the response type for the Query/Accounts RPC method.
 * @name AccountsResponse
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.AccountsResponse
 */
export interface AccountsResponse {
    accounts: GenesisAccountPermissions[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface AccountsResponseProtoMsg {
    typeUrl: '/cosmos.circuit.v1.AccountsResponse';
    value: Uint8Array;
}
/**
 * AccountsResponse is the response type for the Query/Accounts RPC method.
 * @name AccountsResponseSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.AccountsResponse
 */
export interface AccountsResponseSDKType {
    accounts: GenesisAccountPermissionsSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryDisableListRequest is the request type for the Query/DisabledList RPC method.
 * @name QueryDisabledListRequest
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.QueryDisabledListRequest
 */
export interface QueryDisabledListRequest {
}
export interface QueryDisabledListRequestProtoMsg {
    typeUrl: '/cosmos.circuit.v1.QueryDisabledListRequest';
    value: Uint8Array;
}
/**
 * QueryDisableListRequest is the request type for the Query/DisabledList RPC method.
 * @name QueryDisabledListRequestSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.QueryDisabledListRequest
 */
export interface QueryDisabledListRequestSDKType {
}
/**
 * DisabledListResponse is the response type for the Query/DisabledList RPC method.
 * @name DisabledListResponse
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.DisabledListResponse
 */
export interface DisabledListResponse {
    disabledList: string[];
}
export interface DisabledListResponseProtoMsg {
    typeUrl: '/cosmos.circuit.v1.DisabledListResponse';
    value: Uint8Array;
}
/**
 * DisabledListResponse is the response type for the Query/DisabledList RPC method.
 * @name DisabledListResponseSDKType
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.DisabledListResponse
 */
export interface DisabledListResponseSDKType {
    disabled_list: string[];
}
/**
 * QueryAccountRequest is the request type for the Query/Account RPC method.
 * @name QueryAccountRequest
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.QueryAccountRequest
 */
export declare const QueryAccountRequest: {
    typeUrl: "/cosmos.circuit.v1.QueryAccountRequest";
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
 * AccountResponse is the response type for the Query/Account RPC method.
 * @name AccountResponse
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.AccountResponse
 */
export declare const AccountResponse: {
    typeUrl: "/cosmos.circuit.v1.AccountResponse";
    aminoType: "cosmos-sdk/AccountResponse";
    is(o: any): o is AccountResponse;
    isSDK(o: any): o is AccountResponseSDKType;
    encode(message: AccountResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): AccountResponse;
    fromJSON(object: any): AccountResponse;
    toJSON(message: AccountResponse): JsonSafe<AccountResponse>;
    fromPartial(object: Partial<AccountResponse>): AccountResponse;
    fromProtoMsg(message: AccountResponseProtoMsg): AccountResponse;
    toProto(message: AccountResponse): Uint8Array;
    toProtoMsg(message: AccountResponse): AccountResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAccountsRequest is the request type for the Query/Accounts RPC method.
 * @name QueryAccountsRequest
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.QueryAccountsRequest
 */
export declare const QueryAccountsRequest: {
    typeUrl: "/cosmos.circuit.v1.QueryAccountsRequest";
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
 * AccountsResponse is the response type for the Query/Accounts RPC method.
 * @name AccountsResponse
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.AccountsResponse
 */
export declare const AccountsResponse: {
    typeUrl: "/cosmos.circuit.v1.AccountsResponse";
    aminoType: "cosmos-sdk/AccountsResponse";
    is(o: any): o is AccountsResponse;
    isSDK(o: any): o is AccountsResponseSDKType;
    encode(message: AccountsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): AccountsResponse;
    fromJSON(object: any): AccountsResponse;
    toJSON(message: AccountsResponse): JsonSafe<AccountsResponse>;
    fromPartial(object: Partial<AccountsResponse>): AccountsResponse;
    fromProtoMsg(message: AccountsResponseProtoMsg): AccountsResponse;
    toProto(message: AccountsResponse): Uint8Array;
    toProtoMsg(message: AccountsResponse): AccountsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDisableListRequest is the request type for the Query/DisabledList RPC method.
 * @name QueryDisabledListRequest
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.QueryDisabledListRequest
 */
export declare const QueryDisabledListRequest: {
    typeUrl: "/cosmos.circuit.v1.QueryDisabledListRequest";
    aminoType: "cosmos-sdk/QueryDisabledListRequest";
    is(o: any): o is QueryDisabledListRequest;
    isSDK(o: any): o is QueryDisabledListRequestSDKType;
    encode(_: QueryDisabledListRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDisabledListRequest;
    fromJSON(_: any): QueryDisabledListRequest;
    toJSON(_: QueryDisabledListRequest): JsonSafe<QueryDisabledListRequest>;
    fromPartial(_: Partial<QueryDisabledListRequest>): QueryDisabledListRequest;
    fromProtoMsg(message: QueryDisabledListRequestProtoMsg): QueryDisabledListRequest;
    toProto(message: QueryDisabledListRequest): Uint8Array;
    toProtoMsg(message: QueryDisabledListRequest): QueryDisabledListRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * DisabledListResponse is the response type for the Query/DisabledList RPC method.
 * @name DisabledListResponse
 * @package cosmos.circuit.v1
 * @see proto type: cosmos.circuit.v1.DisabledListResponse
 */
export declare const DisabledListResponse: {
    typeUrl: "/cosmos.circuit.v1.DisabledListResponse";
    aminoType: "cosmos-sdk/DisabledListResponse";
    is(o: any): o is DisabledListResponse;
    isSDK(o: any): o is DisabledListResponseSDKType;
    encode(message: DisabledListResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DisabledListResponse;
    fromJSON(object: any): DisabledListResponse;
    toJSON(message: DisabledListResponse): JsonSafe<DisabledListResponse>;
    fromPartial(object: Partial<DisabledListResponse>): DisabledListResponse;
    fromProtoMsg(message: DisabledListResponseProtoMsg): DisabledListResponse;
    toProto(message: DisabledListResponse): Uint8Array;
    toProtoMsg(message: DisabledListResponse): DisabledListResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map