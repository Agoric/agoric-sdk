import { QueryParamsRequest, QueryParamsResponse, QuerySubspacesRequest, QuerySubspacesResponse } from '@agoric/cosmic-proto/codegen/cosmos/params/v1beta1/query.js';
/**
 * Params queries a specific parameter of a module, given its subspace and
 * key.
 * @name getParams
 * @package cosmos.params.v1beta1
 * @see proto service: cosmos.params.v1beta1.Params
 */
export declare const getParams: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QueryParamsRequest) => Promise<QueryParamsResponse>;
/**
 * Subspaces queries for all registered subspaces and all keys for a subspace.
 *
 * Since: cosmos-sdk 0.46
 * @name getSubspaces
 * @package cosmos.params.v1beta1
 * @see proto service: cosmos.params.v1beta1.Subspaces
 */
export declare const getSubspaces: (client: import("@agoric/cosmic-proto/codegen/helper-func-types.js").EndpointOrRpc, request: QuerySubspacesRequest) => Promise<QuerySubspacesResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map