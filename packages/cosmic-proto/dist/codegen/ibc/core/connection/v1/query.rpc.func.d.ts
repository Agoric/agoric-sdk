import { QueryConnectionRequest, QueryConnectionResponse, QueryConnectionsRequest, QueryConnectionsResponse, QueryClientConnectionsRequest, QueryClientConnectionsResponse, QueryConnectionClientStateRequest, QueryConnectionClientStateResponse, QueryConnectionConsensusStateRequest, QueryConnectionConsensusStateResponse, QueryConnectionParamsRequest, QueryConnectionParamsResponse } from './query.js';
/**
 * Connection queries an IBC connection end.
 * @name getConnection
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.Connection
 */
export declare const getConnection: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryConnectionRequest) => Promise<QueryConnectionResponse>;
/**
 * Connections queries all the IBC connections of a chain.
 * @name getConnections
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.Connections
 */
export declare const getConnections: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryConnectionsRequest) => Promise<QueryConnectionsResponse>;
/**
 * ClientConnections queries the connection paths associated with a client
 * state.
 * @name getClientConnections
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.ClientConnections
 */
export declare const getClientConnections: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryClientConnectionsRequest) => Promise<QueryClientConnectionsResponse>;
/**
 * ConnectionClientState queries the client state associated with the
 * connection.
 * @name getConnectionClientState
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.ConnectionClientState
 */
export declare const getConnectionClientState: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryConnectionClientStateRequest) => Promise<QueryConnectionClientStateResponse>;
/**
 * ConnectionConsensusState queries the consensus state associated with the
 * connection.
 * @name getConnectionConsensusState
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.ConnectionConsensusState
 */
export declare const getConnectionConsensusState: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryConnectionConsensusStateRequest) => Promise<QueryConnectionConsensusStateResponse>;
/**
 * ConnectionParams queries all parameters of the ibc connection submodule.
 * @name getConnectionParams
 * @package ibc.core.connection.v1
 * @see proto service: ibc.core.connection.v1.ConnectionParams
 */
export declare const getConnectionParams: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryConnectionParamsRequest) => Promise<QueryConnectionParamsResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map