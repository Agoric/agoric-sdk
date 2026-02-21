import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryParamsRequest, QueryParamsResponse } from '@agoric/cosmic-proto/codegen/ibc/applications/interchain_accounts/host/v1/query.js';
/** Query provides defines the gRPC querier service. */
export interface Query {
    /** Params queries all parameters of the ICA host submodule. */
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map