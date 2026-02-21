//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryBalanceRequest, QueryBalanceResponse, QueryAllBalancesRequest, QueryAllBalancesResponse, QuerySpendableBalancesRequest, QuerySpendableBalancesResponse, QuerySpendableBalanceByDenomRequest, QuerySpendableBalanceByDenomResponse, QueryTotalSupplyRequest, QueryTotalSupplyResponse, QuerySupplyOfRequest, QuerySupplyOfResponse, QueryParamsRequest, QueryParamsResponse, QueryDenomMetadataRequest, QueryDenomMetadataResponse, QueryDenomMetadataByQueryStringRequest, QueryDenomMetadataByQueryStringResponse, QueryDenomsMetadataRequest, QueryDenomsMetadataResponse, QueryDenomOwnersRequest, QueryDenomOwnersResponse, QueryDenomOwnersByQueryRequest, QueryDenomOwnersByQueryResponse, QuerySendEnabledRequest, QuerySendEnabledResponse, } from '@agoric/cosmic-proto/codegen/cosmos/bank/v1beta1/query.js';
/**
 * Balance queries the balance of a single coin for a single account.
 * @name getBalance
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.Balance
 */
export const getBalance = buildQuery({
    encode: QueryBalanceRequest.encode,
    decode: QueryBalanceResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'Balance',
    deps: [QueryBalanceRequest, QueryBalanceResponse],
});
/**
 * AllBalances queries the balance of all coins for a single account.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getAllBalances
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.AllBalances
 */
export const getAllBalances = buildQuery({
    encode: QueryAllBalancesRequest.encode,
    decode: QueryAllBalancesResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'AllBalances',
    deps: [QueryAllBalancesRequest, QueryAllBalancesResponse],
});
/**
 * SpendableBalances queries the spendable balance of all coins for a single
 * account.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 *
 * Since: cosmos-sdk 0.46
 * @name getSpendableBalances
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.SpendableBalances
 */
export const getSpendableBalances = buildQuery({
    encode: QuerySpendableBalancesRequest.encode,
    decode: QuerySpendableBalancesResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'SpendableBalances',
    deps: [QuerySpendableBalancesRequest, QuerySpendableBalancesResponse],
});
/**
 * SpendableBalanceByDenom queries the spendable balance of a single denom for
 * a single account.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 *
 * Since: cosmos-sdk 0.47
 * @name getSpendableBalanceByDenom
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.SpendableBalanceByDenom
 */
export const getSpendableBalanceByDenom = buildQuery({
    encode: QuerySpendableBalanceByDenomRequest.encode,
    decode: QuerySpendableBalanceByDenomResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'SpendableBalanceByDenom',
    deps: [
        QuerySpendableBalanceByDenomRequest,
        QuerySpendableBalanceByDenomResponse,
    ],
});
/**
 * TotalSupply queries the total supply of all coins.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getTotalSupply
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.TotalSupply
 */
export const getTotalSupply = buildQuery({
    encode: QueryTotalSupplyRequest.encode,
    decode: QueryTotalSupplyResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'TotalSupply',
    deps: [QueryTotalSupplyRequest, QueryTotalSupplyResponse],
});
/**
 * SupplyOf queries the supply of a single coin.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getSupplyOf
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.SupplyOf
 */
export const getSupplyOf = buildQuery({
    encode: QuerySupplyOfRequest.encode,
    decode: QuerySupplyOfResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'SupplyOf',
    deps: [QuerySupplyOfRequest, QuerySupplyOfResponse],
});
/**
 * Params queries the parameters of x/bank module.
 * @name getParams
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.Params
 */
export const getParams = buildQuery({
    encode: QueryParamsRequest.encode,
    decode: QueryParamsResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'Params',
    deps: [QueryParamsRequest, QueryParamsResponse],
});
/**
 * DenomMetadata queries the client metadata of a given coin denomination.
 * @name getDenomMetadata
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.DenomMetadata
 */
export const getDenomMetadata = buildQuery({
    encode: QueryDenomMetadataRequest.encode,
    decode: QueryDenomMetadataResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'DenomMetadata',
    deps: [QueryDenomMetadataRequest, QueryDenomMetadataResponse],
});
/**
 * DenomMetadataByQueryString queries the client metadata of a given coin denomination.
 * @name getDenomMetadataByQueryString
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.DenomMetadataByQueryString
 */
export const getDenomMetadataByQueryString = buildQuery({
    encode: QueryDenomMetadataByQueryStringRequest.encode,
    decode: QueryDenomMetadataByQueryStringResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'DenomMetadataByQueryString',
    deps: [
        QueryDenomMetadataByQueryStringRequest,
        QueryDenomMetadataByQueryStringResponse,
    ],
});
/**
 * DenomsMetadata queries the client metadata for all registered coin
 * denominations.
 * @name getDenomsMetadata
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.DenomsMetadata
 */
export const getDenomsMetadata = buildQuery({
    encode: QueryDenomsMetadataRequest.encode,
    decode: QueryDenomsMetadataResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'DenomsMetadata',
    deps: [QueryDenomsMetadataRequest, QueryDenomsMetadataResponse],
});
/**
 * DenomOwners queries for all account addresses that own a particular token
 * denomination.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 *
 * Since: cosmos-sdk 0.46
 * @name getDenomOwners
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.DenomOwners
 */
export const getDenomOwners = buildQuery({
    encode: QueryDenomOwnersRequest.encode,
    decode: QueryDenomOwnersResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'DenomOwners',
    deps: [QueryDenomOwnersRequest, QueryDenomOwnersResponse],
});
/**
 * DenomOwnersByQuery queries for all account addresses that own a particular token
 * denomination.
 *
 * Since: cosmos-sdk 0.50.3
 * @name getDenomOwnersByQuery
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.DenomOwnersByQuery
 */
export const getDenomOwnersByQuery = buildQuery({
    encode: QueryDenomOwnersByQueryRequest.encode,
    decode: QueryDenomOwnersByQueryResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'DenomOwnersByQuery',
    deps: [QueryDenomOwnersByQueryRequest, QueryDenomOwnersByQueryResponse],
});
/**
 * SendEnabled queries for SendEnabled entries.
 *
 * This query only returns denominations that have specific SendEnabled settings.
 * Any denomination that does not have a specific setting will use the default
 * params.default_send_enabled, and will not be returned by this query.
 *
 * Since: cosmos-sdk 0.47
 * @name getSendEnabled
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.SendEnabled
 */
export const getSendEnabled = buildQuery({
    encode: QuerySendEnabledRequest.encode,
    decode: QuerySendEnabledResponse.decode,
    service: 'cosmos.bank.v1beta1.Query',
    method: 'SendEnabled',
    deps: [QuerySendEnabledRequest, QuerySendEnabledResponse],
});
//# sourceMappingURL=query.rpc.func.js.map