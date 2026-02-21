import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryParamsRequest, QueryParamsResponse, QuerySubspacesRequest, QuerySubspacesResponse } from '@agoric/cosmic-proto/codegen/cosmos/params/v1beta1/query.js';
/** Query defines the gRPC querier service. */
export interface Query {
    /**
     * Params queries a specific parameter of a module, given its subspace and
     * key.
     */
    params(request: QueryParamsRequest): Promise<QueryParamsResponse>;
    /**
     * Subspaces queries for all registered subspaces and all keys for a subspace.
     *
     * Since: cosmos-sdk 0.46
     */
    subspaces(request?: QuerySubspacesRequest): Promise<QuerySubspacesResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    params(request: QueryParamsRequest): Promise<QueryParamsResponse>;
    subspaces(request?: QuerySubspacesRequest): Promise<QuerySubspacesResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    params(request: QueryParamsRequest): Promise<QueryParamsResponse>;
    subspaces(request?: QuerySubspacesRequest): Promise<QuerySubspacesResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map