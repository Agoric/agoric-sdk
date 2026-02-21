import { QueryAccountsRequest, QueryAccountsResponse, QueryAccountRequest, QueryAccountResponse, QueryAccountAddressByIDRequest, QueryAccountAddressByIDResponse, QueryParamsRequest, QueryParamsResponse, QueryModuleAccountsRequest, QueryModuleAccountsResponse, QueryModuleAccountByNameRequest, QueryModuleAccountByNameResponse, Bech32PrefixRequest, Bech32PrefixResponse, AddressBytesToStringRequest, AddressBytesToStringResponse, AddressStringToBytesRequest, AddressStringToBytesResponse, QueryAccountInfoRequest, QueryAccountInfoResponse } from './query.js';
/**
 * Accounts returns all the existing accounts.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 *
 * Since: cosmos-sdk 0.43
 * @name getAccounts
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.Accounts
 */
export declare const getAccounts: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryAccountsRequest) => Promise<QueryAccountsResponse>;
/**
 * Account returns account details based on address.
 * @name getAccount
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.Account
 */
export declare const getAccount: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryAccountRequest) => Promise<QueryAccountResponse>;
/**
 * AccountAddressByID returns account address based on account number.
 *
 * Since: cosmos-sdk 0.46.2
 * @name getAccountAddressByID
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.AccountAddressByID
 */
export declare const getAccountAddressByID: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryAccountAddressByIDRequest) => Promise<QueryAccountAddressByIDResponse>;
/**
 * Params queries all parameters.
 * @name getParams
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.Params
 */
export declare const getParams: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
/**
 * ModuleAccounts returns all the existing module accounts.
 *
 * Since: cosmos-sdk 0.46
 * @name getModuleAccounts
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.ModuleAccounts
 */
export declare const getModuleAccounts: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryModuleAccountsRequest) => Promise<QueryModuleAccountsResponse>;
/**
 * ModuleAccountByName returns the module account info by module name
 * @name getModuleAccountByName
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.ModuleAccountByName
 */
export declare const getModuleAccountByName: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryModuleAccountByNameRequest) => Promise<QueryModuleAccountByNameResponse>;
/**
 * Bech32Prefix queries bech32Prefix
 *
 * Since: cosmos-sdk 0.46
 * @name getBech32Prefix
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.Bech32Prefix
 */
export declare const getBech32Prefix: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: Bech32PrefixRequest) => Promise<Bech32PrefixResponse>;
/**
 * AddressBytesToString converts Account Address bytes to string
 *
 * Since: cosmos-sdk 0.46
 * @name getAddressBytesToString
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.AddressBytesToString
 */
export declare const getAddressBytesToString: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: AddressBytesToStringRequest) => Promise<AddressBytesToStringResponse>;
/**
 * AddressStringToBytes converts Address string to bytes
 *
 * Since: cosmos-sdk 0.46
 * @name getAddressStringToBytes
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.AddressStringToBytes
 */
export declare const getAddressStringToBytes: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: AddressStringToBytesRequest) => Promise<AddressStringToBytesResponse>;
/**
 * AccountInfo queries account info which is common to all account types.
 *
 * Since: cosmos-sdk 0.47
 * @name getAccountInfo
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.AccountInfo
 */
export declare const getAccountInfo: (client: import("../../../helper-func-types.js").EndpointOrRpc, request: QueryAccountInfoRequest) => Promise<QueryAccountInfoResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map