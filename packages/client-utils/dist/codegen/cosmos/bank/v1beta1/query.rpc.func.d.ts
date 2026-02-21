import { QueryBalanceRequest, QueryBalanceResponse, QueryAllBalancesRequest, QueryAllBalancesResponse, QuerySpendableBalancesRequest, QuerySpendableBalancesResponse, QuerySpendableBalanceByDenomRequest, QuerySpendableBalanceByDenomResponse, QueryTotalSupplyRequest, QueryTotalSupplyResponse, QuerySupplyOfRequest, QuerySupplyOfResponse, QueryParamsRequest, QueryParamsResponse, QueryDenomMetadataRequest, QueryDenomMetadataResponse, QueryDenomMetadataByQueryStringRequest, QueryDenomMetadataByQueryStringResponse, QueryDenomsMetadataRequest, QueryDenomsMetadataResponse, QueryDenomOwnersRequest, QueryDenomOwnersResponse, QueryDenomOwnersByQueryRequest, QueryDenomOwnersByQueryResponse, QuerySendEnabledRequest, QuerySendEnabledResponse } from '@agoric/cosmic-proto/codegen/cosmos/bank/v1beta1/query.js';
/**
 * Balance queries the balance of a single coin for a single account.
 * @name getBalance
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.Balance
 */
export declare const getBalance: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryBalanceRequest) => Promise<QueryBalanceResponse>;
/**
 * AllBalances queries the balance of all coins for a single account.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getAllBalances
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.AllBalances
 */
export declare const getAllBalances: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryAllBalancesRequest) => Promise<QueryAllBalancesResponse>;
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
export declare const getSpendableBalances: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QuerySpendableBalancesRequest) => Promise<QuerySpendableBalancesResponse>;
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
export declare const getSpendableBalanceByDenom: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QuerySpendableBalanceByDenomRequest) => Promise<QuerySpendableBalanceByDenomResponse>;
/**
 * TotalSupply queries the total supply of all coins.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getTotalSupply
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.TotalSupply
 */
export declare const getTotalSupply: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryTotalSupplyRequest) => Promise<QueryTotalSupplyResponse>;
/**
 * SupplyOf queries the supply of a single coin.
 *
 * When called from another module, this query might consume a high amount of
 * gas if the pagination field is incorrectly set.
 * @name getSupplyOf
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.SupplyOf
 */
export declare const getSupplyOf: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QuerySupplyOfRequest) => Promise<QuerySupplyOfResponse>;
/**
 * Params queries the parameters of x/bank module.
 * @name getParams
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.Params
 */
export declare const getParams: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
/**
 * DenomMetadata queries the client metadata of a given coin denomination.
 * @name getDenomMetadata
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.DenomMetadata
 */
export declare const getDenomMetadata: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDenomMetadataRequest) => Promise<QueryDenomMetadataResponse>;
/**
 * DenomMetadataByQueryString queries the client metadata of a given coin denomination.
 * @name getDenomMetadataByQueryString
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.DenomMetadataByQueryString
 */
export declare const getDenomMetadataByQueryString: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDenomMetadataByQueryStringRequest) => Promise<QueryDenomMetadataByQueryStringResponse>;
/**
 * DenomsMetadata queries the client metadata for all registered coin
 * denominations.
 * @name getDenomsMetadata
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.DenomsMetadata
 */
export declare const getDenomsMetadata: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDenomsMetadataRequest) => Promise<QueryDenomsMetadataResponse>;
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
export declare const getDenomOwners: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDenomOwnersRequest) => Promise<QueryDenomOwnersResponse>;
/**
 * DenomOwnersByQuery queries for all account addresses that own a particular token
 * denomination.
 *
 * Since: cosmos-sdk 0.50.3
 * @name getDenomOwnersByQuery
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.DenomOwnersByQuery
 */
export declare const getDenomOwnersByQuery: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryDenomOwnersByQueryRequest) => Promise<QueryDenomOwnersByQueryResponse>;
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
export declare const getSendEnabled: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QuerySendEnabledRequest) => Promise<QuerySendEnabledResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map