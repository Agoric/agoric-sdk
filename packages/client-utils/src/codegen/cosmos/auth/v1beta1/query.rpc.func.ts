//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import {
  QueryAccountsRequest,
  QueryAccountsResponse,
  QueryAccountRequest,
  QueryAccountResponse,
  QueryAccountAddressByIDRequest,
  QueryAccountAddressByIDResponse,
  QueryParamsRequest,
  QueryParamsResponse,
  QueryModuleAccountsRequest,
  QueryModuleAccountsResponse,
  QueryModuleAccountByNameRequest,
  QueryModuleAccountByNameResponse,
  Bech32PrefixRequest,
  Bech32PrefixResponse,
  AddressBytesToStringRequest,
  AddressBytesToStringResponse,
  AddressStringToBytesRequest,
  AddressStringToBytesResponse,
  QueryAccountInfoRequest,
  QueryAccountInfoResponse,
} from '@agoric/cosmic-proto/codegen/cosmos/auth/v1beta1/query.js';
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
export const getAccounts = buildQuery<
  QueryAccountsRequest,
  QueryAccountsResponse
>({
  encode: QueryAccountsRequest.encode,
  decode: QueryAccountsResponse.decode,
  service: 'cosmos.auth.v1beta1.Query',
  method: 'Accounts',
  deps: [QueryAccountsRequest, QueryAccountsResponse],
});
/**
 * Account returns account details based on address.
 * @name getAccount
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.Account
 */
export const getAccount = buildQuery<QueryAccountRequest, QueryAccountResponse>(
  {
    encode: QueryAccountRequest.encode,
    decode: QueryAccountResponse.decode,
    service: 'cosmos.auth.v1beta1.Query',
    method: 'Account',
    deps: [QueryAccountRequest, QueryAccountResponse],
  },
);
/**
 * AccountAddressByID returns account address based on account number.
 *
 * Since: cosmos-sdk 0.46.2
 * @name getAccountAddressByID
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.AccountAddressByID
 */
export const getAccountAddressByID = buildQuery<
  QueryAccountAddressByIDRequest,
  QueryAccountAddressByIDResponse
>({
  encode: QueryAccountAddressByIDRequest.encode,
  decode: QueryAccountAddressByIDResponse.decode,
  service: 'cosmos.auth.v1beta1.Query',
  method: 'AccountAddressByID',
  deps: [QueryAccountAddressByIDRequest, QueryAccountAddressByIDResponse],
});
/**
 * Params queries all parameters.
 * @name getParams
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.Params
 */
export const getParams = buildQuery<QueryParamsRequest, QueryParamsResponse>({
  encode: QueryParamsRequest.encode,
  decode: QueryParamsResponse.decode,
  service: 'cosmos.auth.v1beta1.Query',
  method: 'Params',
  deps: [QueryParamsRequest, QueryParamsResponse],
});
/**
 * ModuleAccounts returns all the existing module accounts.
 *
 * Since: cosmos-sdk 0.46
 * @name getModuleAccounts
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.ModuleAccounts
 */
export const getModuleAccounts = buildQuery<
  QueryModuleAccountsRequest,
  QueryModuleAccountsResponse
>({
  encode: QueryModuleAccountsRequest.encode,
  decode: QueryModuleAccountsResponse.decode,
  service: 'cosmos.auth.v1beta1.Query',
  method: 'ModuleAccounts',
  deps: [QueryModuleAccountsRequest, QueryModuleAccountsResponse],
});
/**
 * ModuleAccountByName returns the module account info by module name
 * @name getModuleAccountByName
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.ModuleAccountByName
 */
export const getModuleAccountByName = buildQuery<
  QueryModuleAccountByNameRequest,
  QueryModuleAccountByNameResponse
>({
  encode: QueryModuleAccountByNameRequest.encode,
  decode: QueryModuleAccountByNameResponse.decode,
  service: 'cosmos.auth.v1beta1.Query',
  method: 'ModuleAccountByName',
  deps: [QueryModuleAccountByNameRequest, QueryModuleAccountByNameResponse],
});
/**
 * Bech32Prefix queries bech32Prefix
 *
 * Since: cosmos-sdk 0.46
 * @name getBech32Prefix
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.Bech32Prefix
 */
export const getBech32Prefix = buildQuery<
  Bech32PrefixRequest,
  Bech32PrefixResponse
>({
  encode: Bech32PrefixRequest.encode,
  decode: Bech32PrefixResponse.decode,
  service: 'cosmos.auth.v1beta1.Query',
  method: 'Bech32Prefix',
  deps: [Bech32PrefixRequest, Bech32PrefixResponse],
});
/**
 * AddressBytesToString converts Account Address bytes to string
 *
 * Since: cosmos-sdk 0.46
 * @name getAddressBytesToString
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.AddressBytesToString
 */
export const getAddressBytesToString = buildQuery<
  AddressBytesToStringRequest,
  AddressBytesToStringResponse
>({
  encode: AddressBytesToStringRequest.encode,
  decode: AddressBytesToStringResponse.decode,
  service: 'cosmos.auth.v1beta1.Query',
  method: 'AddressBytesToString',
  deps: [AddressBytesToStringRequest, AddressBytesToStringResponse],
});
/**
 * AddressStringToBytes converts Address string to bytes
 *
 * Since: cosmos-sdk 0.46
 * @name getAddressStringToBytes
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.AddressStringToBytes
 */
export const getAddressStringToBytes = buildQuery<
  AddressStringToBytesRequest,
  AddressStringToBytesResponse
>({
  encode: AddressStringToBytesRequest.encode,
  decode: AddressStringToBytesResponse.decode,
  service: 'cosmos.auth.v1beta1.Query',
  method: 'AddressStringToBytes',
  deps: [AddressStringToBytesRequest, AddressStringToBytesResponse],
});
/**
 * AccountInfo queries account info which is common to all account types.
 *
 * Since: cosmos-sdk 0.47
 * @name getAccountInfo
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.AccountInfo
 */
export const getAccountInfo = buildQuery<
  QueryAccountInfoRequest,
  QueryAccountInfoResponse
>({
  encode: QueryAccountInfoRequest.encode,
  decode: QueryAccountInfoResponse.decode,
  service: 'cosmos.auth.v1beta1.Query',
  method: 'AccountInfo',
  deps: [QueryAccountInfoRequest, QueryAccountInfoResponse],
});
