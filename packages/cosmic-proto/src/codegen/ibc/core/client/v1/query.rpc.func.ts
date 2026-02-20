//@ts-nocheck
import { buildQuery } from '../../../../helper-func-types.js';
import {
  QueryClientStateRequest,
  QueryClientStateResponse,
  QueryClientStatesRequest,
  QueryClientStatesResponse,
  QueryConsensusStateRequest,
  QueryConsensusStateResponse,
  QueryConsensusStatesRequest,
  QueryConsensusStatesResponse,
  QueryConsensusStateHeightsRequest,
  QueryConsensusStateHeightsResponse,
  QueryClientStatusRequest,
  QueryClientStatusResponse,
  QueryClientParamsRequest,
  QueryClientParamsResponse,
  QueryUpgradedClientStateRequest,
  QueryUpgradedClientStateResponse,
  QueryUpgradedConsensusStateRequest,
  QueryUpgradedConsensusStateResponse,
  QueryVerifyMembershipRequest,
  QueryVerifyMembershipResponse,
} from './query.js';
/**
 * ClientState queries an IBC light client.
 * @name getClientState
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ClientState
 */
export const getClientState = buildQuery<
  QueryClientStateRequest,
  QueryClientStateResponse
>({
  encode: QueryClientStateRequest.encode,
  decode: QueryClientStateResponse.decode,
  service: 'ibc.core.client.v1.Query',
  method: 'ClientState',
  deps: [QueryClientStateRequest, QueryClientStateResponse],
});
/**
 * ClientStates queries all the IBC light clients of a chain.
 * @name getClientStates
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ClientStates
 */
export const getClientStates = buildQuery<
  QueryClientStatesRequest,
  QueryClientStatesResponse
>({
  encode: QueryClientStatesRequest.encode,
  decode: QueryClientStatesResponse.decode,
  service: 'ibc.core.client.v1.Query',
  method: 'ClientStates',
  deps: [QueryClientStatesRequest, QueryClientStatesResponse],
});
/**
 * ConsensusState queries a consensus state associated with a client state at
 * a given height.
 * @name getConsensusState
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ConsensusState
 */
export const getConsensusState = buildQuery<
  QueryConsensusStateRequest,
  QueryConsensusStateResponse
>({
  encode: QueryConsensusStateRequest.encode,
  decode: QueryConsensusStateResponse.decode,
  service: 'ibc.core.client.v1.Query',
  method: 'ConsensusState',
  deps: [QueryConsensusStateRequest, QueryConsensusStateResponse],
});
/**
 * ConsensusStates queries all the consensus state associated with a given
 * client.
 * @name getConsensusStates
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ConsensusStates
 */
export const getConsensusStates = buildQuery<
  QueryConsensusStatesRequest,
  QueryConsensusStatesResponse
>({
  encode: QueryConsensusStatesRequest.encode,
  decode: QueryConsensusStatesResponse.decode,
  service: 'ibc.core.client.v1.Query',
  method: 'ConsensusStates',
  deps: [QueryConsensusStatesRequest, QueryConsensusStatesResponse],
});
/**
 * ConsensusStateHeights queries the height of every consensus states associated with a given client.
 * @name getConsensusStateHeights
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ConsensusStateHeights
 */
export const getConsensusStateHeights = buildQuery<
  QueryConsensusStateHeightsRequest,
  QueryConsensusStateHeightsResponse
>({
  encode: QueryConsensusStateHeightsRequest.encode,
  decode: QueryConsensusStateHeightsResponse.decode,
  service: 'ibc.core.client.v1.Query',
  method: 'ConsensusStateHeights',
  deps: [QueryConsensusStateHeightsRequest, QueryConsensusStateHeightsResponse],
});
/**
 * Status queries the status of an IBC client.
 * @name getClientStatus
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ClientStatus
 */
export const getClientStatus = buildQuery<
  QueryClientStatusRequest,
  QueryClientStatusResponse
>({
  encode: QueryClientStatusRequest.encode,
  decode: QueryClientStatusResponse.decode,
  service: 'ibc.core.client.v1.Query',
  method: 'ClientStatus',
  deps: [QueryClientStatusRequest, QueryClientStatusResponse],
});
/**
 * ClientParams queries all parameters of the ibc client submodule.
 * @name getClientParams
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.ClientParams
 */
export const getClientParams = buildQuery<
  QueryClientParamsRequest,
  QueryClientParamsResponse
>({
  encode: QueryClientParamsRequest.encode,
  decode: QueryClientParamsResponse.decode,
  service: 'ibc.core.client.v1.Query',
  method: 'ClientParams',
  deps: [QueryClientParamsRequest, QueryClientParamsResponse],
});
/**
 * UpgradedClientState queries an Upgraded IBC light client.
 * @name getUpgradedClientState
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.UpgradedClientState
 */
export const getUpgradedClientState = buildQuery<
  QueryUpgradedClientStateRequest,
  QueryUpgradedClientStateResponse
>({
  encode: QueryUpgradedClientStateRequest.encode,
  decode: QueryUpgradedClientStateResponse.decode,
  service: 'ibc.core.client.v1.Query',
  method: 'UpgradedClientState',
  deps: [QueryUpgradedClientStateRequest, QueryUpgradedClientStateResponse],
});
/**
 * UpgradedConsensusState queries an Upgraded IBC consensus state.
 * @name getUpgradedConsensusState
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.UpgradedConsensusState
 */
export const getUpgradedConsensusState = buildQuery<
  QueryUpgradedConsensusStateRequest,
  QueryUpgradedConsensusStateResponse
>({
  encode: QueryUpgradedConsensusStateRequest.encode,
  decode: QueryUpgradedConsensusStateResponse.decode,
  service: 'ibc.core.client.v1.Query',
  method: 'UpgradedConsensusState',
  deps: [
    QueryUpgradedConsensusStateRequest,
    QueryUpgradedConsensusStateResponse,
  ],
});
/**
 * VerifyMembership queries an IBC light client for proof verification of a value at a given key path.
 * @name getVerifyMembership
 * @package ibc.core.client.v1
 * @see proto service: ibc.core.client.v1.VerifyMembership
 */
export const getVerifyMembership = buildQuery<
  QueryVerifyMembershipRequest,
  QueryVerifyMembershipResponse
>({
  encode: QueryVerifyMembershipRequest.encode,
  decode: QueryVerifyMembershipResponse.decode,
  service: 'ibc.core.client.v1.Query',
  method: 'VerifyMembership',
  deps: [QueryVerifyMembershipRequest, QueryVerifyMembershipResponse],
});
