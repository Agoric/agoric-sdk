import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryDataRequest, QueryDataResponse, QueryCapDataRequest, QueryCapDataResponse, QueryChildrenRequest, QueryChildrenResponse } from '@agoric/cosmic-proto/codegen/agoric/vstorage/query.js';
/** Query defines the gRPC querier service */
export interface Query {
    /** Return the raw string value of an arbitrary vstorage datum. */
    data(request: QueryDataRequest): Promise<QueryDataResponse>;
    /**
     * Return a formatted representation of a vstorage datum that must be
     * a valid StreamCell with CapData values, or standalone CapData.
     */
    capData(request: QueryCapDataRequest): Promise<QueryCapDataResponse>;
    /** Return the children of a given vstorage path. */
    children(request: QueryChildrenRequest): Promise<QueryChildrenResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    data(request: QueryDataRequest): Promise<QueryDataResponse>;
    capData(request: QueryCapDataRequest): Promise<QueryCapDataResponse>;
    children(request: QueryChildrenRequest): Promise<QueryChildrenResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    data(request: QueryDataRequest): Promise<QueryDataResponse>;
    capData(request: QueryCapDataRequest): Promise<QueryCapDataResponse>;
    children(request: QueryChildrenRequest): Promise<QueryChildrenResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map