import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryConnectionRequest, QueryConnectionResponse, QueryConnectionsRequest, QueryConnectionsResponse, QueryClientConnectionsRequest, QueryClientConnectionsResponse, QueryConnectionClientStateRequest, QueryConnectionClientStateResponse, QueryConnectionConsensusStateRequest, QueryConnectionConsensusStateResponse, QueryConnectionParamsRequest, QueryConnectionParamsResponse, } from '@agoric/cosmic-proto/codegen/ibc/core/connection/v1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.connection = this.connection.bind(this);
        this.connections = this.connections.bind(this);
        this.clientConnections = this.clientConnections.bind(this);
        this.connectionClientState = this.connectionClientState.bind(this);
        this.connectionConsensusState = this.connectionConsensusState.bind(this);
        this.connectionParams = this.connectionParams.bind(this);
    }
    connection(request) {
        const data = QueryConnectionRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.connection.v1.Query', 'Connection', data);
        return promise.then(data => QueryConnectionResponse.decode(new BinaryReader(data)));
    }
    connections(request = {
        pagination: undefined,
    }) {
        const data = QueryConnectionsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.connection.v1.Query', 'Connections', data);
        return promise.then(data => QueryConnectionsResponse.decode(new BinaryReader(data)));
    }
    clientConnections(request) {
        const data = QueryClientConnectionsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.connection.v1.Query', 'ClientConnections', data);
        return promise.then(data => QueryClientConnectionsResponse.decode(new BinaryReader(data)));
    }
    connectionClientState(request) {
        const data = QueryConnectionClientStateRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.connection.v1.Query', 'ConnectionClientState', data);
        return promise.then(data => QueryConnectionClientStateResponse.decode(new BinaryReader(data)));
    }
    connectionConsensusState(request) {
        const data = QueryConnectionConsensusStateRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.connection.v1.Query', 'ConnectionConsensusState', data);
        return promise.then(data => QueryConnectionConsensusStateResponse.decode(new BinaryReader(data)));
    }
    connectionParams(request = {}) {
        const data = QueryConnectionParamsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.connection.v1.Query', 'ConnectionParams', data);
        return promise.then(data => QueryConnectionParamsResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        connection(request) {
            return queryService.connection(request);
        },
        connections(request) {
            return queryService.connections(request);
        },
        clientConnections(request) {
            return queryService.clientConnections(request);
        },
        connectionClientState(request) {
            return queryService.connectionClientState(request);
        },
        connectionConsensusState(request) {
            return queryService.connectionConsensusState(request);
        },
        connectionParams(request) {
            return queryService.connectionParams(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map