import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryInterchainAccountRequest, QueryInterchainAccountResponse, QueryParamsRequest, QueryParamsResponse } from '@agoric/cosmic-proto/codegen/ibc/applications/interchain_accounts/controller/v1/query.js';
/** Query provides defines the gRPC querier service. */
export interface Query {
    /** InterchainAccount returns the interchain account address for a given owner address on a given connection */
    interchainAccount(request: QueryInterchainAccountRequest): Promise<QueryInterchainAccountResponse>;
    /** Params queries all parameters of the ICA controller submodule. */
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    interchainAccount(request: QueryInterchainAccountRequest): Promise<QueryInterchainAccountResponse>;
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    interchainAccount(request: QueryInterchainAccountRequest): Promise<QueryInterchainAccountResponse>;
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map