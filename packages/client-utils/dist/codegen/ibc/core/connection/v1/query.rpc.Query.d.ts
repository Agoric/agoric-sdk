import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
import { QueryClient } from '@cosmjs/stargate';
import { QueryConnectionRequest, QueryConnectionResponse, QueryConnectionsRequest, QueryConnectionsResponse, QueryClientConnectionsRequest, QueryClientConnectionsResponse, QueryConnectionClientStateRequest, QueryConnectionClientStateResponse, QueryConnectionConsensusStateRequest, QueryConnectionConsensusStateResponse, QueryConnectionParamsRequest, QueryConnectionParamsResponse } from '@agoric/cosmic-proto/codegen/ibc/core/connection/v1/query.js';
/** Query provides defines the gRPC querier service */
export interface Query {
    /** Connection queries an IBC connection end. */
    connection(request: QueryConnectionRequest): Promise<QueryConnectionResponse>;
    /** Connections queries all the IBC connections of a chain. */
    connections(request?: QueryConnectionsRequest): Promise<QueryConnectionsResponse>;
    /**
     * ClientConnections queries the connection paths associated with a client
     * state.
     */
    clientConnections(request: QueryClientConnectionsRequest): Promise<QueryClientConnectionsResponse>;
    /**
     * ConnectionClientState queries the client state associated with the
     * connection.
     */
    connectionClientState(request: QueryConnectionClientStateRequest): Promise<QueryConnectionClientStateResponse>;
    /**
     * ConnectionConsensusState queries the consensus state associated with the
     * connection.
     */
    connectionConsensusState(request: QueryConnectionConsensusStateRequest): Promise<QueryConnectionConsensusStateResponse>;
    /** ConnectionParams queries all parameters of the ibc connection submodule. */
    connectionParams(request?: QueryConnectionParamsRequest): Promise<QueryConnectionParamsResponse>;
}
export declare class QueryClientImpl implements Query {
    private readonly rpc;
    constructor(rpc: Rpc);
    connection(request: QueryConnectionRequest): Promise<QueryConnectionResponse>;
    connections(request?: QueryConnectionsRequest): Promise<QueryConnectionsResponse>;
    clientConnections(request: QueryClientConnectionsRequest): Promise<QueryClientConnectionsResponse>;
    connectionClientState(request: QueryConnectionClientStateRequest): Promise<QueryConnectionClientStateResponse>;
    connectionConsensusState(request: QueryConnectionConsensusStateRequest): Promise<QueryConnectionConsensusStateResponse>;
    connectionParams(request?: QueryConnectionParamsRequest): Promise<QueryConnectionParamsResponse>;
}
export declare const createRpcQueryExtension: (base: QueryClient) => {
    connection(request: QueryConnectionRequest): Promise<QueryConnectionResponse>;
    connections(request?: QueryConnectionsRequest): Promise<QueryConnectionsResponse>;
    clientConnections(request: QueryClientConnectionsRequest): Promise<QueryClientConnectionsResponse>;
    connectionClientState(request: QueryConnectionClientStateRequest): Promise<QueryConnectionClientStateResponse>;
    connectionConsensusState(request: QueryConnectionConsensusStateRequest): Promise<QueryConnectionConsensusStateResponse>;
    connectionParams(request?: QueryConnectionParamsRequest): Promise<QueryConnectionParamsResponse>;
};
//# sourceMappingURL=query.rpc.Query.d.ts.map