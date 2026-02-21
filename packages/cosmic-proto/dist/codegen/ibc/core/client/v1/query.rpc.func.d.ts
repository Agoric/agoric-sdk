import { QueryClientStateRequest, QueryClientStateResponse, QueryClientStatesRequest, QueryClientStatesResponse, QueryConsensusStateRequest, QueryConsensusStateResponse, QueryConsensusStatesRequest, QueryConsensusStatesResponse, QueryConsensusStateHeightsRequest, QueryConsensusStateHeightsResponse, QueryClientStatusRequest, QueryClientStatusResponse, QueryClientParamsRequest, QueryClientParamsResponse, QueryUpgradedClientStateRequest, QueryUpgradedClientStateResponse, QueryUpgradedConsensusStateRequest, QueryUpgradedConsensusStateResponse, QueryVerifyMembershipRequest, QueryVerifyMembershipResponse } from './query.js';
/**
 * ClientState queries an IBC light client.
 * @name getClientState
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ClientState
 */
export declare const getClientState: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryClientStateRequest) => Promise<QueryClientStateResponse>;
/**
 * ClientStates queries all the IBC light clients of a chain.
 * @name getClientStates
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ClientStates
 */
export declare const getClientStates: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryClientStatesRequest) => Promise<QueryClientStatesResponse>;
/**
 * ConsensusState queries a consensus state associated with a client state at
 * a given height.
 * @name getConsensusState
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ConsensusState
 */
export declare const getConsensusState: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryConsensusStateRequest) => Promise<QueryConsensusStateResponse>;
/**
 * ConsensusStates queries all the consensus state associated with a given
 * client.
 * @name getConsensusStates
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ConsensusStates
 */
export declare const getConsensusStates: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryConsensusStatesRequest) => Promise<QueryConsensusStatesResponse>;
/**
 * ConsensusStateHeights queries the height of every consensus states associated with a given client.
 * @name getConsensusStateHeights
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ConsensusStateHeights
 */
export declare const getConsensusStateHeights: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryConsensusStateHeightsRequest) => Promise<QueryConsensusStateHeightsResponse>;
/**
 * Status queries the status of an IBC client.
 * @name getClientStatus
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ClientStatus
 */
export declare const getClientStatus: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryClientStatusRequest) => Promise<QueryClientStatusResponse>;
/**
 * ClientParams queries all parameters of the ibc client submodule.
 * @name getClientParams
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ClientParams
 */
export declare const getClientParams: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryClientParamsRequest) => Promise<QueryClientParamsResponse>;
/**
 * UpgradedClientState queries an Upgraded IBC light client.
 * @name getUpgradedClientState
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.UpgradedClientState
 */
export declare const getUpgradedClientState: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryUpgradedClientStateRequest) => Promise<QueryUpgradedClientStateResponse>;
/**
 * UpgradedConsensusState queries an Upgraded IBC consensus state.
 * @name getUpgradedConsensusState
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.UpgradedConsensusState
 */
export declare const getUpgradedConsensusState: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryUpgradedConsensusStateRequest) => Promise<QueryUpgradedConsensusStateResponse>;
/**
 * VerifyMembership queries an IBC light client for proof verification of a value at a given key path.
 * @name getVerifyMembership
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.VerifyMembership
 */
export declare const getVerifyMembership: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryVerifyMembershipRequest) => Promise<QueryVerifyMembershipResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map