import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../base/query/v1beta1/pagination.js';
import { Coin, type CoinSDKType } from '../../base/v1beta1/coin.js';
import { Params, type ParamsSDKType, Metadata, type MetadataSDKType, SendEnabled, type SendEnabledSDKType } from './bank.js';
import { BinaryReader, BinaryWriter } from '../../../binary.js';
import { type JsonSafe } from '../../../json-safe.js';
/**
 * QueryBalanceRequest is the request type for the Query/Balance RPC method.
 * @name QueryBalanceRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryBalanceRequest
 */
export interface QueryBalanceRequest {
    /**
     * address is the address to query balances for.
     */
    address: string;
    /**
     * denom is the coin denom to query balances for.
     */
    denom: string;
}
export interface QueryBalanceRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryBalanceRequest';
    value: Uint8Array;
}
/**
 * QueryBalanceRequest is the request type for the Query/Balance RPC method.
 * @name QueryBalanceRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryBalanceRequest
 */
export interface QueryBalanceRequestSDKType {
    address: string;
    denom: string;
}
/**
 * QueryBalanceResponse is the response type for the Query/Balance RPC method.
 * @name QueryBalanceResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryBalanceResponse
 */
export interface QueryBalanceResponse {
    /**
     * balance is the balance of the coin.
     */
    balance?: Coin;
}
export interface QueryBalanceResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryBalanceResponse';
    value: Uint8Array;
}
/**
 * QueryBalanceResponse is the response type for the Query/Balance RPC method.
 * @name QueryBalanceResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryBalanceResponse
 */
export interface QueryBalanceResponseSDKType {
    balance?: CoinSDKType;
}
/**
 * QueryBalanceRequest is the request type for the Query/AllBalances RPC method.
 * @name QueryAllBalancesRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryAllBalancesRequest
 */
export interface QueryAllBalancesRequest {
    /**
     * address is the address to query balances for.
     */
    address: string;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
    /**
     * resolve_denom is the flag to resolve the denom into a human-readable form from the metadata.
     *
     * Since: cosmos-sdk 0.50
     */
    resolveDenom: boolean;
}
export interface QueryAllBalancesRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryAllBalancesRequest';
    value: Uint8Array;
}
/**
 * QueryBalanceRequest is the request type for the Query/AllBalances RPC method.
 * @name QueryAllBalancesRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryAllBalancesRequest
 */
export interface QueryAllBalancesRequestSDKType {
    address: string;
    pagination?: PageRequestSDKType;
    resolve_denom: boolean;
}
/**
 * QueryAllBalancesResponse is the response type for the Query/AllBalances RPC
 * method.
 * @name QueryAllBalancesResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryAllBalancesResponse
 */
export interface QueryAllBalancesResponse {
    /**
     * balances is the balances of all the coins.
     */
    balances: Coin[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryAllBalancesResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryAllBalancesResponse';
    value: Uint8Array;
}
/**
 * QueryAllBalancesResponse is the response type for the Query/AllBalances RPC
 * method.
 * @name QueryAllBalancesResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryAllBalancesResponse
 */
export interface QueryAllBalancesResponseSDKType {
    balances: CoinSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QuerySpendableBalancesRequest defines the gRPC request structure for querying
 * an account's spendable balances.
 *
 * Since: cosmos-sdk 0.46
 * @name QuerySpendableBalancesRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySpendableBalancesRequest
 */
export interface QuerySpendableBalancesRequest {
    /**
     * address is the address to query spendable balances for.
     */
    address: string;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QuerySpendableBalancesRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QuerySpendableBalancesRequest';
    value: Uint8Array;
}
/**
 * QuerySpendableBalancesRequest defines the gRPC request structure for querying
 * an account's spendable balances.
 *
 * Since: cosmos-sdk 0.46
 * @name QuerySpendableBalancesRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySpendableBalancesRequest
 */
export interface QuerySpendableBalancesRequestSDKType {
    address: string;
    pagination?: PageRequestSDKType;
}
/**
 * QuerySpendableBalancesResponse defines the gRPC response structure for querying
 * an account's spendable balances.
 *
 * Since: cosmos-sdk 0.46
 * @name QuerySpendableBalancesResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySpendableBalancesResponse
 */
export interface QuerySpendableBalancesResponse {
    /**
     * balances is the spendable balances of all the coins.
     */
    balances: Coin[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QuerySpendableBalancesResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QuerySpendableBalancesResponse';
    value: Uint8Array;
}
/**
 * QuerySpendableBalancesResponse defines the gRPC response structure for querying
 * an account's spendable balances.
 *
 * Since: cosmos-sdk 0.46
 * @name QuerySpendableBalancesResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySpendableBalancesResponse
 */
export interface QuerySpendableBalancesResponseSDKType {
    balances: CoinSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QuerySpendableBalanceByDenomRequest defines the gRPC request structure for
 * querying an account's spendable balance for a specific denom.
 *
 * Since: cosmos-sdk 0.47
 * @name QuerySpendableBalanceByDenomRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySpendableBalanceByDenomRequest
 */
export interface QuerySpendableBalanceByDenomRequest {
    /**
     * address is the address to query balances for.
     */
    address: string;
    /**
     * denom is the coin denom to query balances for.
     */
    denom: string;
}
export interface QuerySpendableBalanceByDenomRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QuerySpendableBalanceByDenomRequest';
    value: Uint8Array;
}
/**
 * QuerySpendableBalanceByDenomRequest defines the gRPC request structure for
 * querying an account's spendable balance for a specific denom.
 *
 * Since: cosmos-sdk 0.47
 * @name QuerySpendableBalanceByDenomRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySpendableBalanceByDenomRequest
 */
export interface QuerySpendableBalanceByDenomRequestSDKType {
    address: string;
    denom: string;
}
/**
 * QuerySpendableBalanceByDenomResponse defines the gRPC response structure for
 * querying an account's spendable balance for a specific denom.
 *
 * Since: cosmos-sdk 0.47
 * @name QuerySpendableBalanceByDenomResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySpendableBalanceByDenomResponse
 */
export interface QuerySpendableBalanceByDenomResponse {
    /**
     * balance is the balance of the coin.
     */
    balance?: Coin;
}
export interface QuerySpendableBalanceByDenomResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QuerySpendableBalanceByDenomResponse';
    value: Uint8Array;
}
/**
 * QuerySpendableBalanceByDenomResponse defines the gRPC response structure for
 * querying an account's spendable balance for a specific denom.
 *
 * Since: cosmos-sdk 0.47
 * @name QuerySpendableBalanceByDenomResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySpendableBalanceByDenomResponse
 */
export interface QuerySpendableBalanceByDenomResponseSDKType {
    balance?: CoinSDKType;
}
/**
 * QueryTotalSupplyRequest is the request type for the Query/TotalSupply RPC
 * method.
 * @name QueryTotalSupplyRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryTotalSupplyRequest
 */
export interface QueryTotalSupplyRequest {
    /**
     * pagination defines an optional pagination for the request.
     *
     * Since: cosmos-sdk 0.43
     */
    pagination?: PageRequest;
}
export interface QueryTotalSupplyRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryTotalSupplyRequest';
    value: Uint8Array;
}
/**
 * QueryTotalSupplyRequest is the request type for the Query/TotalSupply RPC
 * method.
 * @name QueryTotalSupplyRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryTotalSupplyRequest
 */
export interface QueryTotalSupplyRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * QueryTotalSupplyResponse is the response type for the Query/TotalSupply RPC
 * method
 * @name QueryTotalSupplyResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryTotalSupplyResponse
 */
export interface QueryTotalSupplyResponse {
    /**
     * supply is the supply of the coins
     */
    supply: Coin[];
    /**
     * pagination defines the pagination in the response.
     *
     * Since: cosmos-sdk 0.43
     */
    pagination?: PageResponse;
}
export interface QueryTotalSupplyResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryTotalSupplyResponse';
    value: Uint8Array;
}
/**
 * QueryTotalSupplyResponse is the response type for the Query/TotalSupply RPC
 * method
 * @name QueryTotalSupplyResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryTotalSupplyResponse
 */
export interface QueryTotalSupplyResponseSDKType {
    supply: CoinSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QuerySupplyOfRequest is the request type for the Query/SupplyOf RPC method.
 * @name QuerySupplyOfRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySupplyOfRequest
 */
export interface QuerySupplyOfRequest {
    /**
     * denom is the coin denom to query balances for.
     */
    denom: string;
}
export interface QuerySupplyOfRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QuerySupplyOfRequest';
    value: Uint8Array;
}
/**
 * QuerySupplyOfRequest is the request type for the Query/SupplyOf RPC method.
 * @name QuerySupplyOfRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySupplyOfRequest
 */
export interface QuerySupplyOfRequestSDKType {
    denom: string;
}
/**
 * QuerySupplyOfResponse is the response type for the Query/SupplyOf RPC method.
 * @name QuerySupplyOfResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySupplyOfResponse
 */
export interface QuerySupplyOfResponse {
    /**
     * amount is the supply of the coin.
     */
    amount: Coin;
}
export interface QuerySupplyOfResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QuerySupplyOfResponse';
    value: Uint8Array;
}
/**
 * QuerySupplyOfResponse is the response type for the Query/SupplyOf RPC method.
 * @name QuerySupplyOfResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySupplyOfResponse
 */
export interface QuerySupplyOfResponseSDKType {
    amount: CoinSDKType;
}
/**
 * QueryParamsRequest defines the request type for querying x/bank parameters.
 * @name QueryParamsRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryParamsRequest
 */
export interface QueryParamsRequest {
}
export interface QueryParamsRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryParamsRequest';
    value: Uint8Array;
}
/**
 * QueryParamsRequest defines the request type for querying x/bank parameters.
 * @name QueryParamsRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryParamsRequest
 */
export interface QueryParamsRequestSDKType {
}
/**
 * QueryParamsResponse defines the response type for querying x/bank parameters.
 * @name QueryParamsResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryParamsResponse
 */
export interface QueryParamsResponse {
    /**
     * params provides the parameters of the bank module.
     */
    params: Params;
}
export interface QueryParamsResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryParamsResponse';
    value: Uint8Array;
}
/**
 * QueryParamsResponse defines the response type for querying x/bank parameters.
 * @name QueryParamsResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryParamsResponse
 */
export interface QueryParamsResponseSDKType {
    params: ParamsSDKType;
}
/**
 * QueryDenomsMetadataRequest is the request type for the Query/DenomsMetadata RPC method.
 * @name QueryDenomsMetadataRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomsMetadataRequest
 */
export interface QueryDenomsMetadataRequest {
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryDenomsMetadataRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryDenomsMetadataRequest';
    value: Uint8Array;
}
/**
 * QueryDenomsMetadataRequest is the request type for the Query/DenomsMetadata RPC method.
 * @name QueryDenomsMetadataRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomsMetadataRequest
 */
export interface QueryDenomsMetadataRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * QueryDenomsMetadataResponse is the response type for the Query/DenomsMetadata RPC
 * method.
 * @name QueryDenomsMetadataResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomsMetadataResponse
 */
export interface QueryDenomsMetadataResponse {
    /**
     * metadata provides the client information for all the registered tokens.
     */
    metadatas: Metadata[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryDenomsMetadataResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryDenomsMetadataResponse';
    value: Uint8Array;
}
/**
 * QueryDenomsMetadataResponse is the response type for the Query/DenomsMetadata RPC
 * method.
 * @name QueryDenomsMetadataResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomsMetadataResponse
 */
export interface QueryDenomsMetadataResponseSDKType {
    metadatas: MetadataSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryDenomMetadataRequest is the request type for the Query/DenomMetadata RPC method.
 * @name QueryDenomMetadataRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomMetadataRequest
 */
export interface QueryDenomMetadataRequest {
    /**
     * denom is the coin denom to query the metadata for.
     */
    denom: string;
}
export interface QueryDenomMetadataRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryDenomMetadataRequest';
    value: Uint8Array;
}
/**
 * QueryDenomMetadataRequest is the request type for the Query/DenomMetadata RPC method.
 * @name QueryDenomMetadataRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomMetadataRequest
 */
export interface QueryDenomMetadataRequestSDKType {
    denom: string;
}
/**
 * QueryDenomMetadataResponse is the response type for the Query/DenomMetadata RPC
 * method.
 * @name QueryDenomMetadataResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomMetadataResponse
 */
export interface QueryDenomMetadataResponse {
    /**
     * metadata describes and provides all the client information for the requested token.
     */
    metadata: Metadata;
}
export interface QueryDenomMetadataResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryDenomMetadataResponse';
    value: Uint8Array;
}
/**
 * QueryDenomMetadataResponse is the response type for the Query/DenomMetadata RPC
 * method.
 * @name QueryDenomMetadataResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomMetadataResponse
 */
export interface QueryDenomMetadataResponseSDKType {
    metadata: MetadataSDKType;
}
/**
 * QueryDenomMetadataByQueryStringRequest is the request type for the Query/DenomMetadata RPC method.
 * Identical with QueryDenomMetadataRequest but receives denom as query string.
 * @name QueryDenomMetadataByQueryStringRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomMetadataByQueryStringRequest
 */
export interface QueryDenomMetadataByQueryStringRequest {
    /**
     * denom is the coin denom to query the metadata for.
     */
    denom: string;
}
export interface QueryDenomMetadataByQueryStringRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryDenomMetadataByQueryStringRequest';
    value: Uint8Array;
}
/**
 * QueryDenomMetadataByQueryStringRequest is the request type for the Query/DenomMetadata RPC method.
 * Identical with QueryDenomMetadataRequest but receives denom as query string.
 * @name QueryDenomMetadataByQueryStringRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomMetadataByQueryStringRequest
 */
export interface QueryDenomMetadataByQueryStringRequestSDKType {
    denom: string;
}
/**
 * QueryDenomMetadataByQueryStringResponse is the response type for the Query/DenomMetadata RPC
 * method. Identical with QueryDenomMetadataResponse but receives denom as query string in request.
 * @name QueryDenomMetadataByQueryStringResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomMetadataByQueryStringResponse
 */
export interface QueryDenomMetadataByQueryStringResponse {
    /**
     * metadata describes and provides all the client information for the requested token.
     */
    metadata: Metadata;
}
export interface QueryDenomMetadataByQueryStringResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryDenomMetadataByQueryStringResponse';
    value: Uint8Array;
}
/**
 * QueryDenomMetadataByQueryStringResponse is the response type for the Query/DenomMetadata RPC
 * method. Identical with QueryDenomMetadataResponse but receives denom as query string in request.
 * @name QueryDenomMetadataByQueryStringResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomMetadataByQueryStringResponse
 */
export interface QueryDenomMetadataByQueryStringResponseSDKType {
    metadata: MetadataSDKType;
}
/**
 * QueryDenomOwnersRequest defines the request type for the DenomOwners RPC query,
 * which queries for a paginated set of all account holders of a particular
 * denomination.
 * @name QueryDenomOwnersRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomOwnersRequest
 */
export interface QueryDenomOwnersRequest {
    /**
     * denom defines the coin denomination to query all account holders for.
     */
    denom: string;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryDenomOwnersRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryDenomOwnersRequest';
    value: Uint8Array;
}
/**
 * QueryDenomOwnersRequest defines the request type for the DenomOwners RPC query,
 * which queries for a paginated set of all account holders of a particular
 * denomination.
 * @name QueryDenomOwnersRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomOwnersRequest
 */
export interface QueryDenomOwnersRequestSDKType {
    denom: string;
    pagination?: PageRequestSDKType;
}
/**
 * DenomOwner defines structure representing an account that owns or holds a
 * particular denominated token. It contains the account address and account
 * balance of the denominated token.
 *
 * Since: cosmos-sdk 0.46
 * @name DenomOwner
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.DenomOwner
 */
export interface DenomOwner {
    /**
     * address defines the address that owns a particular denomination.
     */
    address: string;
    /**
     * balance is the balance of the denominated coin for an account.
     */
    balance: Coin;
}
export interface DenomOwnerProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.DenomOwner';
    value: Uint8Array;
}
/**
 * DenomOwner defines structure representing an account that owns or holds a
 * particular denominated token. It contains the account address and account
 * balance of the denominated token.
 *
 * Since: cosmos-sdk 0.46
 * @name DenomOwnerSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.DenomOwner
 */
export interface DenomOwnerSDKType {
    address: string;
    balance: CoinSDKType;
}
/**
 * QueryDenomOwnersResponse defines the RPC response of a DenomOwners RPC query.
 *
 * Since: cosmos-sdk 0.46
 * @name QueryDenomOwnersResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomOwnersResponse
 */
export interface QueryDenomOwnersResponse {
    denomOwners: DenomOwner[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryDenomOwnersResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryDenomOwnersResponse';
    value: Uint8Array;
}
/**
 * QueryDenomOwnersResponse defines the RPC response of a DenomOwners RPC query.
 *
 * Since: cosmos-sdk 0.46
 * @name QueryDenomOwnersResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomOwnersResponse
 */
export interface QueryDenomOwnersResponseSDKType {
    denom_owners: DenomOwnerSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryDenomOwnersByQueryRequest defines the request type for the DenomOwnersByQuery RPC query,
 * which queries for a paginated set of all account holders of a particular
 * denomination.
 *
 * Since: cosmos-sdk 0.50.3
 * @name QueryDenomOwnersByQueryRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomOwnersByQueryRequest
 */
export interface QueryDenomOwnersByQueryRequest {
    /**
     * denom defines the coin denomination to query all account holders for.
     */
    denom: string;
    /**
     * pagination defines an optional pagination for the request.
     */
    pagination?: PageRequest;
}
export interface QueryDenomOwnersByQueryRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryDenomOwnersByQueryRequest';
    value: Uint8Array;
}
/**
 * QueryDenomOwnersByQueryRequest defines the request type for the DenomOwnersByQuery RPC query,
 * which queries for a paginated set of all account holders of a particular
 * denomination.
 *
 * Since: cosmos-sdk 0.50.3
 * @name QueryDenomOwnersByQueryRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomOwnersByQueryRequest
 */
export interface QueryDenomOwnersByQueryRequestSDKType {
    denom: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryDenomOwnersByQueryResponse defines the RPC response of a DenomOwnersByQuery RPC query.
 *
 * Since: cosmos-sdk 0.50.3
 * @name QueryDenomOwnersByQueryResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomOwnersByQueryResponse
 */
export interface QueryDenomOwnersByQueryResponse {
    denomOwners: DenomOwner[];
    /**
     * pagination defines the pagination in the response.
     */
    pagination?: PageResponse;
}
export interface QueryDenomOwnersByQueryResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QueryDenomOwnersByQueryResponse';
    value: Uint8Array;
}
/**
 * QueryDenomOwnersByQueryResponse defines the RPC response of a DenomOwnersByQuery RPC query.
 *
 * Since: cosmos-sdk 0.50.3
 * @name QueryDenomOwnersByQueryResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomOwnersByQueryResponse
 */
export interface QueryDenomOwnersByQueryResponseSDKType {
    denom_owners: DenomOwnerSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QuerySendEnabledRequest defines the RPC request for looking up SendEnabled entries.
 *
 * Since: cosmos-sdk 0.47
 * @name QuerySendEnabledRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySendEnabledRequest
 */
export interface QuerySendEnabledRequest {
    /**
     * denoms is the specific denoms you want look up. Leave empty to get all entries.
     */
    denoms: string[];
    /**
     * pagination defines an optional pagination for the request. This field is
     * only read if the denoms field is empty.
     */
    pagination?: PageRequest;
}
export interface QuerySendEnabledRequestProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QuerySendEnabledRequest';
    value: Uint8Array;
}
/**
 * QuerySendEnabledRequest defines the RPC request for looking up SendEnabled entries.
 *
 * Since: cosmos-sdk 0.47
 * @name QuerySendEnabledRequestSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySendEnabledRequest
 */
export interface QuerySendEnabledRequestSDKType {
    denoms: string[];
    pagination?: PageRequestSDKType;
}
/**
 * QuerySendEnabledResponse defines the RPC response of a SendEnable query.
 *
 * Since: cosmos-sdk 0.47
 * @name QuerySendEnabledResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySendEnabledResponse
 */
export interface QuerySendEnabledResponse {
    sendEnabled: SendEnabled[];
    /**
     * pagination defines the pagination in the response. This field is only
     * populated if the denoms field in the request is empty.
     */
    pagination?: PageResponse;
}
export interface QuerySendEnabledResponseProtoMsg {
    typeUrl: '/cosmos.bank.v1beta1.QuerySendEnabledResponse';
    value: Uint8Array;
}
/**
 * QuerySendEnabledResponse defines the RPC response of a SendEnable query.
 *
 * Since: cosmos-sdk 0.47
 * @name QuerySendEnabledResponseSDKType
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySendEnabledResponse
 */
export interface QuerySendEnabledResponseSDKType {
    send_enabled: SendEnabledSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryBalanceRequest is the request type for the Query/Balance RPC method.
 * @name QueryBalanceRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryBalanceRequest
 */
export declare const QueryBalanceRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QueryBalanceRequest";
    aminoType: "cosmos-sdk/QueryBalanceRequest";
    is(o: any): o is QueryBalanceRequest;
    isSDK(o: any): o is QueryBalanceRequestSDKType;
    encode(message: QueryBalanceRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryBalanceRequest;
    fromJSON(object: any): QueryBalanceRequest;
    toJSON(message: QueryBalanceRequest): JsonSafe<QueryBalanceRequest>;
    fromPartial(object: Partial<QueryBalanceRequest>): QueryBalanceRequest;
    fromProtoMsg(message: QueryBalanceRequestProtoMsg): QueryBalanceRequest;
    toProto(message: QueryBalanceRequest): Uint8Array;
    toProtoMsg(message: QueryBalanceRequest): QueryBalanceRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryBalanceResponse is the response type for the Query/Balance RPC method.
 * @name QueryBalanceResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryBalanceResponse
 */
export declare const QueryBalanceResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QueryBalanceResponse";
    aminoType: "cosmos-sdk/QueryBalanceResponse";
    is(o: any): o is QueryBalanceResponse;
    isSDK(o: any): o is QueryBalanceResponseSDKType;
    encode(message: QueryBalanceResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryBalanceResponse;
    fromJSON(object: any): QueryBalanceResponse;
    toJSON(message: QueryBalanceResponse): JsonSafe<QueryBalanceResponse>;
    fromPartial(object: Partial<QueryBalanceResponse>): QueryBalanceResponse;
    fromProtoMsg(message: QueryBalanceResponseProtoMsg): QueryBalanceResponse;
    toProto(message: QueryBalanceResponse): Uint8Array;
    toProtoMsg(message: QueryBalanceResponse): QueryBalanceResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryBalanceRequest is the request type for the Query/AllBalances RPC method.
 * @name QueryAllBalancesRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryAllBalancesRequest
 */
export declare const QueryAllBalancesRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QueryAllBalancesRequest";
    aminoType: "cosmos-sdk/QueryAllBalancesRequest";
    is(o: any): o is QueryAllBalancesRequest;
    isSDK(o: any): o is QueryAllBalancesRequestSDKType;
    encode(message: QueryAllBalancesRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllBalancesRequest;
    fromJSON(object: any): QueryAllBalancesRequest;
    toJSON(message: QueryAllBalancesRequest): JsonSafe<QueryAllBalancesRequest>;
    fromPartial(object: Partial<QueryAllBalancesRequest>): QueryAllBalancesRequest;
    fromProtoMsg(message: QueryAllBalancesRequestProtoMsg): QueryAllBalancesRequest;
    toProto(message: QueryAllBalancesRequest): Uint8Array;
    toProtoMsg(message: QueryAllBalancesRequest): QueryAllBalancesRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryAllBalancesResponse is the response type for the Query/AllBalances RPC
 * method.
 * @name QueryAllBalancesResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryAllBalancesResponse
 */
export declare const QueryAllBalancesResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QueryAllBalancesResponse";
    aminoType: "cosmos-sdk/QueryAllBalancesResponse";
    is(o: any): o is QueryAllBalancesResponse;
    isSDK(o: any): o is QueryAllBalancesResponseSDKType;
    encode(message: QueryAllBalancesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryAllBalancesResponse;
    fromJSON(object: any): QueryAllBalancesResponse;
    toJSON(message: QueryAllBalancesResponse): JsonSafe<QueryAllBalancesResponse>;
    fromPartial(object: Partial<QueryAllBalancesResponse>): QueryAllBalancesResponse;
    fromProtoMsg(message: QueryAllBalancesResponseProtoMsg): QueryAllBalancesResponse;
    toProto(message: QueryAllBalancesResponse): Uint8Array;
    toProtoMsg(message: QueryAllBalancesResponse): QueryAllBalancesResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySpendableBalancesRequest defines the gRPC request structure for querying
 * an account's spendable balances.
 *
 * Since: cosmos-sdk 0.46
 * @name QuerySpendableBalancesRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySpendableBalancesRequest
 */
export declare const QuerySpendableBalancesRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QuerySpendableBalancesRequest";
    aminoType: "cosmos-sdk/QuerySpendableBalancesRequest";
    is(o: any): o is QuerySpendableBalancesRequest;
    isSDK(o: any): o is QuerySpendableBalancesRequestSDKType;
    encode(message: QuerySpendableBalancesRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QuerySpendableBalancesRequest;
    fromJSON(object: any): QuerySpendableBalancesRequest;
    toJSON(message: QuerySpendableBalancesRequest): JsonSafe<QuerySpendableBalancesRequest>;
    fromPartial(object: Partial<QuerySpendableBalancesRequest>): QuerySpendableBalancesRequest;
    fromProtoMsg(message: QuerySpendableBalancesRequestProtoMsg): QuerySpendableBalancesRequest;
    toProto(message: QuerySpendableBalancesRequest): Uint8Array;
    toProtoMsg(message: QuerySpendableBalancesRequest): QuerySpendableBalancesRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySpendableBalancesResponse defines the gRPC response structure for querying
 * an account's spendable balances.
 *
 * Since: cosmos-sdk 0.46
 * @name QuerySpendableBalancesResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySpendableBalancesResponse
 */
export declare const QuerySpendableBalancesResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QuerySpendableBalancesResponse";
    aminoType: "cosmos-sdk/QuerySpendableBalancesResponse";
    is(o: any): o is QuerySpendableBalancesResponse;
    isSDK(o: any): o is QuerySpendableBalancesResponseSDKType;
    encode(message: QuerySpendableBalancesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QuerySpendableBalancesResponse;
    fromJSON(object: any): QuerySpendableBalancesResponse;
    toJSON(message: QuerySpendableBalancesResponse): JsonSafe<QuerySpendableBalancesResponse>;
    fromPartial(object: Partial<QuerySpendableBalancesResponse>): QuerySpendableBalancesResponse;
    fromProtoMsg(message: QuerySpendableBalancesResponseProtoMsg): QuerySpendableBalancesResponse;
    toProto(message: QuerySpendableBalancesResponse): Uint8Array;
    toProtoMsg(message: QuerySpendableBalancesResponse): QuerySpendableBalancesResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySpendableBalanceByDenomRequest defines the gRPC request structure for
 * querying an account's spendable balance for a specific denom.
 *
 * Since: cosmos-sdk 0.47
 * @name QuerySpendableBalanceByDenomRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySpendableBalanceByDenomRequest
 */
export declare const QuerySpendableBalanceByDenomRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QuerySpendableBalanceByDenomRequest";
    aminoType: "cosmos-sdk/QuerySpendableBalanceByDenomRequest";
    is(o: any): o is QuerySpendableBalanceByDenomRequest;
    isSDK(o: any): o is QuerySpendableBalanceByDenomRequestSDKType;
    encode(message: QuerySpendableBalanceByDenomRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QuerySpendableBalanceByDenomRequest;
    fromJSON(object: any): QuerySpendableBalanceByDenomRequest;
    toJSON(message: QuerySpendableBalanceByDenomRequest): JsonSafe<QuerySpendableBalanceByDenomRequest>;
    fromPartial(object: Partial<QuerySpendableBalanceByDenomRequest>): QuerySpendableBalanceByDenomRequest;
    fromProtoMsg(message: QuerySpendableBalanceByDenomRequestProtoMsg): QuerySpendableBalanceByDenomRequest;
    toProto(message: QuerySpendableBalanceByDenomRequest): Uint8Array;
    toProtoMsg(message: QuerySpendableBalanceByDenomRequest): QuerySpendableBalanceByDenomRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySpendableBalanceByDenomResponse defines the gRPC response structure for
 * querying an account's spendable balance for a specific denom.
 *
 * Since: cosmos-sdk 0.47
 * @name QuerySpendableBalanceByDenomResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySpendableBalanceByDenomResponse
 */
export declare const QuerySpendableBalanceByDenomResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QuerySpendableBalanceByDenomResponse";
    aminoType: "cosmos-sdk/QuerySpendableBalanceByDenomResponse";
    is(o: any): o is QuerySpendableBalanceByDenomResponse;
    isSDK(o: any): o is QuerySpendableBalanceByDenomResponseSDKType;
    encode(message: QuerySpendableBalanceByDenomResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QuerySpendableBalanceByDenomResponse;
    fromJSON(object: any): QuerySpendableBalanceByDenomResponse;
    toJSON(message: QuerySpendableBalanceByDenomResponse): JsonSafe<QuerySpendableBalanceByDenomResponse>;
    fromPartial(object: Partial<QuerySpendableBalanceByDenomResponse>): QuerySpendableBalanceByDenomResponse;
    fromProtoMsg(message: QuerySpendableBalanceByDenomResponseProtoMsg): QuerySpendableBalanceByDenomResponse;
    toProto(message: QuerySpendableBalanceByDenomResponse): Uint8Array;
    toProtoMsg(message: QuerySpendableBalanceByDenomResponse): QuerySpendableBalanceByDenomResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryTotalSupplyRequest is the request type for the Query/TotalSupply RPC
 * method.
 * @name QueryTotalSupplyRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryTotalSupplyRequest
 */
export declare const QueryTotalSupplyRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QueryTotalSupplyRequest";
    aminoType: "cosmos-sdk/QueryTotalSupplyRequest";
    is(o: any): o is QueryTotalSupplyRequest;
    isSDK(o: any): o is QueryTotalSupplyRequestSDKType;
    encode(message: QueryTotalSupplyRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryTotalSupplyRequest;
    fromJSON(object: any): QueryTotalSupplyRequest;
    toJSON(message: QueryTotalSupplyRequest): JsonSafe<QueryTotalSupplyRequest>;
    fromPartial(object: Partial<QueryTotalSupplyRequest>): QueryTotalSupplyRequest;
    fromProtoMsg(message: QueryTotalSupplyRequestProtoMsg): QueryTotalSupplyRequest;
    toProto(message: QueryTotalSupplyRequest): Uint8Array;
    toProtoMsg(message: QueryTotalSupplyRequest): QueryTotalSupplyRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryTotalSupplyResponse is the response type for the Query/TotalSupply RPC
 * method
 * @name QueryTotalSupplyResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryTotalSupplyResponse
 */
export declare const QueryTotalSupplyResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QueryTotalSupplyResponse";
    aminoType: "cosmos-sdk/QueryTotalSupplyResponse";
    is(o: any): o is QueryTotalSupplyResponse;
    isSDK(o: any): o is QueryTotalSupplyResponseSDKType;
    encode(message: QueryTotalSupplyResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryTotalSupplyResponse;
    fromJSON(object: any): QueryTotalSupplyResponse;
    toJSON(message: QueryTotalSupplyResponse): JsonSafe<QueryTotalSupplyResponse>;
    fromPartial(object: Partial<QueryTotalSupplyResponse>): QueryTotalSupplyResponse;
    fromProtoMsg(message: QueryTotalSupplyResponseProtoMsg): QueryTotalSupplyResponse;
    toProto(message: QueryTotalSupplyResponse): Uint8Array;
    toProtoMsg(message: QueryTotalSupplyResponse): QueryTotalSupplyResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySupplyOfRequest is the request type for the Query/SupplyOf RPC method.
 * @name QuerySupplyOfRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySupplyOfRequest
 */
export declare const QuerySupplyOfRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QuerySupplyOfRequest";
    aminoType: "cosmos-sdk/QuerySupplyOfRequest";
    is(o: any): o is QuerySupplyOfRequest;
    isSDK(o: any): o is QuerySupplyOfRequestSDKType;
    encode(message: QuerySupplyOfRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QuerySupplyOfRequest;
    fromJSON(object: any): QuerySupplyOfRequest;
    toJSON(message: QuerySupplyOfRequest): JsonSafe<QuerySupplyOfRequest>;
    fromPartial(object: Partial<QuerySupplyOfRequest>): QuerySupplyOfRequest;
    fromProtoMsg(message: QuerySupplyOfRequestProtoMsg): QuerySupplyOfRequest;
    toProto(message: QuerySupplyOfRequest): Uint8Array;
    toProtoMsg(message: QuerySupplyOfRequest): QuerySupplyOfRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySupplyOfResponse is the response type for the Query/SupplyOf RPC method.
 * @name QuerySupplyOfResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySupplyOfResponse
 */
export declare const QuerySupplyOfResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QuerySupplyOfResponse";
    aminoType: "cosmos-sdk/QuerySupplyOfResponse";
    is(o: any): o is QuerySupplyOfResponse;
    isSDK(o: any): o is QuerySupplyOfResponseSDKType;
    encode(message: QuerySupplyOfResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QuerySupplyOfResponse;
    fromJSON(object: any): QuerySupplyOfResponse;
    toJSON(message: QuerySupplyOfResponse): JsonSafe<QuerySupplyOfResponse>;
    fromPartial(object: Partial<QuerySupplyOfResponse>): QuerySupplyOfResponse;
    fromProtoMsg(message: QuerySupplyOfResponseProtoMsg): QuerySupplyOfResponse;
    toProto(message: QuerySupplyOfResponse): Uint8Array;
    toProtoMsg(message: QuerySupplyOfResponse): QuerySupplyOfResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryParamsRequest defines the request type for querying x/bank parameters.
 * @name QueryParamsRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryParamsRequest
 */
export declare const QueryParamsRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QueryParamsRequest";
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
 * QueryParamsResponse defines the response type for querying x/bank parameters.
 * @name QueryParamsResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryParamsResponse
 */
export declare const QueryParamsResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QueryParamsResponse";
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
 * QueryDenomsMetadataRequest is the request type for the Query/DenomsMetadata RPC method.
 * @name QueryDenomsMetadataRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomsMetadataRequest
 */
export declare const QueryDenomsMetadataRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QueryDenomsMetadataRequest";
    aminoType: "cosmos-sdk/QueryDenomsMetadataRequest";
    is(o: any): o is QueryDenomsMetadataRequest;
    isSDK(o: any): o is QueryDenomsMetadataRequestSDKType;
    encode(message: QueryDenomsMetadataRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomsMetadataRequest;
    fromJSON(object: any): QueryDenomsMetadataRequest;
    toJSON(message: QueryDenomsMetadataRequest): JsonSafe<QueryDenomsMetadataRequest>;
    fromPartial(object: Partial<QueryDenomsMetadataRequest>): QueryDenomsMetadataRequest;
    fromProtoMsg(message: QueryDenomsMetadataRequestProtoMsg): QueryDenomsMetadataRequest;
    toProto(message: QueryDenomsMetadataRequest): Uint8Array;
    toProtoMsg(message: QueryDenomsMetadataRequest): QueryDenomsMetadataRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDenomsMetadataResponse is the response type for the Query/DenomsMetadata RPC
 * method.
 * @name QueryDenomsMetadataResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomsMetadataResponse
 */
export declare const QueryDenomsMetadataResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QueryDenomsMetadataResponse";
    aminoType: "cosmos-sdk/QueryDenomsMetadataResponse";
    is(o: any): o is QueryDenomsMetadataResponse;
    isSDK(o: any): o is QueryDenomsMetadataResponseSDKType;
    encode(message: QueryDenomsMetadataResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomsMetadataResponse;
    fromJSON(object: any): QueryDenomsMetadataResponse;
    toJSON(message: QueryDenomsMetadataResponse): JsonSafe<QueryDenomsMetadataResponse>;
    fromPartial(object: Partial<QueryDenomsMetadataResponse>): QueryDenomsMetadataResponse;
    fromProtoMsg(message: QueryDenomsMetadataResponseProtoMsg): QueryDenomsMetadataResponse;
    toProto(message: QueryDenomsMetadataResponse): Uint8Array;
    toProtoMsg(message: QueryDenomsMetadataResponse): QueryDenomsMetadataResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDenomMetadataRequest is the request type for the Query/DenomMetadata RPC method.
 * @name QueryDenomMetadataRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomMetadataRequest
 */
export declare const QueryDenomMetadataRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QueryDenomMetadataRequest";
    aminoType: "cosmos-sdk/QueryDenomMetadataRequest";
    is(o: any): o is QueryDenomMetadataRequest;
    isSDK(o: any): o is QueryDenomMetadataRequestSDKType;
    encode(message: QueryDenomMetadataRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomMetadataRequest;
    fromJSON(object: any): QueryDenomMetadataRequest;
    toJSON(message: QueryDenomMetadataRequest): JsonSafe<QueryDenomMetadataRequest>;
    fromPartial(object: Partial<QueryDenomMetadataRequest>): QueryDenomMetadataRequest;
    fromProtoMsg(message: QueryDenomMetadataRequestProtoMsg): QueryDenomMetadataRequest;
    toProto(message: QueryDenomMetadataRequest): Uint8Array;
    toProtoMsg(message: QueryDenomMetadataRequest): QueryDenomMetadataRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDenomMetadataResponse is the response type for the Query/DenomMetadata RPC
 * method.
 * @name QueryDenomMetadataResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomMetadataResponse
 */
export declare const QueryDenomMetadataResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QueryDenomMetadataResponse";
    aminoType: "cosmos-sdk/QueryDenomMetadataResponse";
    is(o: any): o is QueryDenomMetadataResponse;
    isSDK(o: any): o is QueryDenomMetadataResponseSDKType;
    encode(message: QueryDenomMetadataResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomMetadataResponse;
    fromJSON(object: any): QueryDenomMetadataResponse;
    toJSON(message: QueryDenomMetadataResponse): JsonSafe<QueryDenomMetadataResponse>;
    fromPartial(object: Partial<QueryDenomMetadataResponse>): QueryDenomMetadataResponse;
    fromProtoMsg(message: QueryDenomMetadataResponseProtoMsg): QueryDenomMetadataResponse;
    toProto(message: QueryDenomMetadataResponse): Uint8Array;
    toProtoMsg(message: QueryDenomMetadataResponse): QueryDenomMetadataResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDenomMetadataByQueryStringRequest is the request type for the Query/DenomMetadata RPC method.
 * Identical with QueryDenomMetadataRequest but receives denom as query string.
 * @name QueryDenomMetadataByQueryStringRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomMetadataByQueryStringRequest
 */
export declare const QueryDenomMetadataByQueryStringRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QueryDenomMetadataByQueryStringRequest";
    aminoType: "cosmos-sdk/QueryDenomMetadataByQueryStringRequest";
    is(o: any): o is QueryDenomMetadataByQueryStringRequest;
    isSDK(o: any): o is QueryDenomMetadataByQueryStringRequestSDKType;
    encode(message: QueryDenomMetadataByQueryStringRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomMetadataByQueryStringRequest;
    fromJSON(object: any): QueryDenomMetadataByQueryStringRequest;
    toJSON(message: QueryDenomMetadataByQueryStringRequest): JsonSafe<QueryDenomMetadataByQueryStringRequest>;
    fromPartial(object: Partial<QueryDenomMetadataByQueryStringRequest>): QueryDenomMetadataByQueryStringRequest;
    fromProtoMsg(message: QueryDenomMetadataByQueryStringRequestProtoMsg): QueryDenomMetadataByQueryStringRequest;
    toProto(message: QueryDenomMetadataByQueryStringRequest): Uint8Array;
    toProtoMsg(message: QueryDenomMetadataByQueryStringRequest): QueryDenomMetadataByQueryStringRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDenomMetadataByQueryStringResponse is the response type for the Query/DenomMetadata RPC
 * method. Identical with QueryDenomMetadataResponse but receives denom as query string in request.
 * @name QueryDenomMetadataByQueryStringResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomMetadataByQueryStringResponse
 */
export declare const QueryDenomMetadataByQueryStringResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QueryDenomMetadataByQueryStringResponse";
    aminoType: "cosmos-sdk/QueryDenomMetadataByQueryStringResponse";
    is(o: any): o is QueryDenomMetadataByQueryStringResponse;
    isSDK(o: any): o is QueryDenomMetadataByQueryStringResponseSDKType;
    encode(message: QueryDenomMetadataByQueryStringResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomMetadataByQueryStringResponse;
    fromJSON(object: any): QueryDenomMetadataByQueryStringResponse;
    toJSON(message: QueryDenomMetadataByQueryStringResponse): JsonSafe<QueryDenomMetadataByQueryStringResponse>;
    fromPartial(object: Partial<QueryDenomMetadataByQueryStringResponse>): QueryDenomMetadataByQueryStringResponse;
    fromProtoMsg(message: QueryDenomMetadataByQueryStringResponseProtoMsg): QueryDenomMetadataByQueryStringResponse;
    toProto(message: QueryDenomMetadataByQueryStringResponse): Uint8Array;
    toProtoMsg(message: QueryDenomMetadataByQueryStringResponse): QueryDenomMetadataByQueryStringResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDenomOwnersRequest defines the request type for the DenomOwners RPC query,
 * which queries for a paginated set of all account holders of a particular
 * denomination.
 * @name QueryDenomOwnersRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomOwnersRequest
 */
export declare const QueryDenomOwnersRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QueryDenomOwnersRequest";
    aminoType: "cosmos-sdk/QueryDenomOwnersRequest";
    is(o: any): o is QueryDenomOwnersRequest;
    isSDK(o: any): o is QueryDenomOwnersRequestSDKType;
    encode(message: QueryDenomOwnersRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomOwnersRequest;
    fromJSON(object: any): QueryDenomOwnersRequest;
    toJSON(message: QueryDenomOwnersRequest): JsonSafe<QueryDenomOwnersRequest>;
    fromPartial(object: Partial<QueryDenomOwnersRequest>): QueryDenomOwnersRequest;
    fromProtoMsg(message: QueryDenomOwnersRequestProtoMsg): QueryDenomOwnersRequest;
    toProto(message: QueryDenomOwnersRequest): Uint8Array;
    toProtoMsg(message: QueryDenomOwnersRequest): QueryDenomOwnersRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * DenomOwner defines structure representing an account that owns or holds a
 * particular denominated token. It contains the account address and account
 * balance of the denominated token.
 *
 * Since: cosmos-sdk 0.46
 * @name DenomOwner
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.DenomOwner
 */
export declare const DenomOwner: {
    typeUrl: "/cosmos.bank.v1beta1.DenomOwner";
    aminoType: "cosmos-sdk/DenomOwner";
    is(o: any): o is DenomOwner;
    isSDK(o: any): o is DenomOwnerSDKType;
    encode(message: DenomOwner, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): DenomOwner;
    fromJSON(object: any): DenomOwner;
    toJSON(message: DenomOwner): JsonSafe<DenomOwner>;
    fromPartial(object: Partial<DenomOwner>): DenomOwner;
    fromProtoMsg(message: DenomOwnerProtoMsg): DenomOwner;
    toProto(message: DenomOwner): Uint8Array;
    toProtoMsg(message: DenomOwner): DenomOwnerProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDenomOwnersResponse defines the RPC response of a DenomOwners RPC query.
 *
 * Since: cosmos-sdk 0.46
 * @name QueryDenomOwnersResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomOwnersResponse
 */
export declare const QueryDenomOwnersResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QueryDenomOwnersResponse";
    aminoType: "cosmos-sdk/QueryDenomOwnersResponse";
    is(o: any): o is QueryDenomOwnersResponse;
    isSDK(o: any): o is QueryDenomOwnersResponseSDKType;
    encode(message: QueryDenomOwnersResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomOwnersResponse;
    fromJSON(object: any): QueryDenomOwnersResponse;
    toJSON(message: QueryDenomOwnersResponse): JsonSafe<QueryDenomOwnersResponse>;
    fromPartial(object: Partial<QueryDenomOwnersResponse>): QueryDenomOwnersResponse;
    fromProtoMsg(message: QueryDenomOwnersResponseProtoMsg): QueryDenomOwnersResponse;
    toProto(message: QueryDenomOwnersResponse): Uint8Array;
    toProtoMsg(message: QueryDenomOwnersResponse): QueryDenomOwnersResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDenomOwnersByQueryRequest defines the request type for the DenomOwnersByQuery RPC query,
 * which queries for a paginated set of all account holders of a particular
 * denomination.
 *
 * Since: cosmos-sdk 0.50.3
 * @name QueryDenomOwnersByQueryRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomOwnersByQueryRequest
 */
export declare const QueryDenomOwnersByQueryRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QueryDenomOwnersByQueryRequest";
    aminoType: "cosmos-sdk/QueryDenomOwnersByQueryRequest";
    is(o: any): o is QueryDenomOwnersByQueryRequest;
    isSDK(o: any): o is QueryDenomOwnersByQueryRequestSDKType;
    encode(message: QueryDenomOwnersByQueryRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomOwnersByQueryRequest;
    fromJSON(object: any): QueryDenomOwnersByQueryRequest;
    toJSON(message: QueryDenomOwnersByQueryRequest): JsonSafe<QueryDenomOwnersByQueryRequest>;
    fromPartial(object: Partial<QueryDenomOwnersByQueryRequest>): QueryDenomOwnersByQueryRequest;
    fromProtoMsg(message: QueryDenomOwnersByQueryRequestProtoMsg): QueryDenomOwnersByQueryRequest;
    toProto(message: QueryDenomOwnersByQueryRequest): Uint8Array;
    toProtoMsg(message: QueryDenomOwnersByQueryRequest): QueryDenomOwnersByQueryRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryDenomOwnersByQueryResponse defines the RPC response of a DenomOwnersByQuery RPC query.
 *
 * Since: cosmos-sdk 0.50.3
 * @name QueryDenomOwnersByQueryResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QueryDenomOwnersByQueryResponse
 */
export declare const QueryDenomOwnersByQueryResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QueryDenomOwnersByQueryResponse";
    aminoType: "cosmos-sdk/QueryDenomOwnersByQueryResponse";
    is(o: any): o is QueryDenomOwnersByQueryResponse;
    isSDK(o: any): o is QueryDenomOwnersByQueryResponseSDKType;
    encode(message: QueryDenomOwnersByQueryResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryDenomOwnersByQueryResponse;
    fromJSON(object: any): QueryDenomOwnersByQueryResponse;
    toJSON(message: QueryDenomOwnersByQueryResponse): JsonSafe<QueryDenomOwnersByQueryResponse>;
    fromPartial(object: Partial<QueryDenomOwnersByQueryResponse>): QueryDenomOwnersByQueryResponse;
    fromProtoMsg(message: QueryDenomOwnersByQueryResponseProtoMsg): QueryDenomOwnersByQueryResponse;
    toProto(message: QueryDenomOwnersByQueryResponse): Uint8Array;
    toProtoMsg(message: QueryDenomOwnersByQueryResponse): QueryDenomOwnersByQueryResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySendEnabledRequest defines the RPC request for looking up SendEnabled entries.
 *
 * Since: cosmos-sdk 0.47
 * @name QuerySendEnabledRequest
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySendEnabledRequest
 */
export declare const QuerySendEnabledRequest: {
    typeUrl: "/cosmos.bank.v1beta1.QuerySendEnabledRequest";
    aminoType: "cosmos-sdk/QuerySendEnabledRequest";
    is(o: any): o is QuerySendEnabledRequest;
    isSDK(o: any): o is QuerySendEnabledRequestSDKType;
    encode(message: QuerySendEnabledRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QuerySendEnabledRequest;
    fromJSON(object: any): QuerySendEnabledRequest;
    toJSON(message: QuerySendEnabledRequest): JsonSafe<QuerySendEnabledRequest>;
    fromPartial(object: Partial<QuerySendEnabledRequest>): QuerySendEnabledRequest;
    fromProtoMsg(message: QuerySendEnabledRequestProtoMsg): QuerySendEnabledRequest;
    toProto(message: QuerySendEnabledRequest): Uint8Array;
    toProtoMsg(message: QuerySendEnabledRequest): QuerySendEnabledRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySendEnabledResponse defines the RPC response of a SendEnable query.
 *
 * Since: cosmos-sdk 0.47
 * @name QuerySendEnabledResponse
 * @package cosmos.bank.v1beta1
 * @see proto type: cosmos.bank.v1beta1.QuerySendEnabledResponse
 */
export declare const QuerySendEnabledResponse: {
    typeUrl: "/cosmos.bank.v1beta1.QuerySendEnabledResponse";
    aminoType: "cosmos-sdk/QuerySendEnabledResponse";
    is(o: any): o is QuerySendEnabledResponse;
    isSDK(o: any): o is QuerySendEnabledResponseSDKType;
    encode(message: QuerySendEnabledResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QuerySendEnabledResponse;
    fromJSON(object: any): QuerySendEnabledResponse;
    toJSON(message: QuerySendEnabledResponse): JsonSafe<QuerySendEnabledResponse>;
    fromPartial(object: Partial<QuerySendEnabledResponse>): QuerySendEnabledResponse;
    fromProtoMsg(message: QuerySendEnabledResponseProtoMsg): QuerySendEnabledResponse;
    toProto(message: QuerySendEnabledResponse): Uint8Array;
    toProtoMsg(message: QuerySendEnabledResponse): QuerySendEnabledResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map