import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryParamsRequest, QueryParamsResponse, QueryStateRequest, QueryStateResponse } from '@agoric/cosmic-proto/codegen/agoric/vbank/query.js';
/** Query defines the gRPC querier service for vbank module. */
export interface Query {
    /** Params queries params of the vbank module. */
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
    /** State queries current state of the vbank module. */
    state(request?: QueryStateRequest): Promise<QueryStateResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
    state(request?: QueryStateRequest): Promise<QueryStateResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
    state(request?: QueryStateRequest): Promise<QueryStateResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map