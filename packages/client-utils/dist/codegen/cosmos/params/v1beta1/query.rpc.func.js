//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryParamsRequest, QueryParamsResponse, QuerySubspacesRequest, QuerySubspacesResponse, } from '@agoric/cosmic-proto/codegen/cosmos/params/v1beta1/query.js';
/**
 * Params queries a specific parameter of a module, given its subspace and
 * key.
 * @name getParams
 * @package cosmos.params.v1beta1
 * @see proto service: cosmos.params.v1beta1.Params
 */
export const getParams = buildQuery({
    encode: QueryParamsRequest.encode,
    decode: QueryParamsResponse.decode,
    service: 'cosmos.params.v1beta1.Query',
    method: 'Params',
    deps: [QueryParamsRequest, QueryParamsResponse],
});
/**
 * Subspaces queries for all registered subspaces and all keys for a subspace.
 *
 * Since: cosmos-sdk 0.46
 * @name getSubspaces
 * @package cosmos.params.v1beta1
 * @see proto service: cosmos.params.v1beta1.Subspaces
 */
export const getSubspaces = buildQuery({
    encode: QuerySubspacesRequest.encode,
    decode: QuerySubspacesResponse.decode,
    service: 'cosmos.params.v1beta1.Query',
    method: 'Subspaces',
    deps: [QuerySubspacesRequest, QuerySubspacesResponse],
});
//# sourceMappingURL=query.rpc.func.js.map