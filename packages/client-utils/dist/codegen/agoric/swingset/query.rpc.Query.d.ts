import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryParamsRequest, QueryParamsResponse, QueryEgressRequest, QueryEgressResponse, QueryMailboxRequest, QueryMailboxResponse } from '@agoric/cosmic-proto/codegen/agoric/swingset/query.js';
/** Query provides defines the gRPC querier service */
export interface Query {
    /** Params queries params of the swingset module. */
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
    /** Egress queries a provisioned egress. */
    egress(request: QueryEgressRequest): Promise<QueryEgressResponse>;
    /** Return the contents of a peer's outbound mailbox. */
    mailbox(request: QueryMailboxRequest): Promise<QueryMailboxResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
    egress(request: QueryEgressRequest): Promise<QueryEgressResponse>;
    mailbox(request: QueryMailboxRequest): Promise<QueryMailboxResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    params(request?: QueryParamsRequest): Promise<QueryParamsResponse>;
    egress(request: QueryEgressRequest): Promise<QueryEgressResponse>;
    mailbox(request: QueryMailboxRequest): Promise<QueryMailboxResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map