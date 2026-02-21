import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../../../cosmos/base/query/v1beta1/pagination.js';
import { Height, type HeightSDKType, IdentifiedClientState, type IdentifiedClientStateSDKType, ConsensusStateWithHeight, type ConsensusStateWithHeightSDKType, Params, type ParamsSDKType } from './client.js';
import { MerklePath, type MerklePathSDKType } from '../../commitment/v1/commitment.js';
import { Any, type AnySDKType } from '../../../../google/protobuf/any.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * QueryClientStateRequest is the request type for the Query/ClientState RPC
 * method
 * @name QueryClientStateRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStateRequest
 */
export interface QueryClientStateRequest {
    /**
     * client state unique identifier
     */
    clientId: string;
}
export interface QueryClientStateRequestProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryClientStateRequest';
    value: Uint8Array;
}
/**
 * QueryClientStateRequest is the request type for the Query/ClientState RPC
 * method
 * @name QueryClientStateRequestSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStateRequest
 */
export interface QueryClientStateRequestSDKType {
    client_id: string;
}
/**
 * QueryClientStateResponse is the response type for the Query/ClientState RPC
 * method. Besides the client state, it includes a proof and the height from
 * which the proof was retrieved.
 * @name QueryClientStateResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStateResponse
 */
export interface QueryClientStateResponse {
    /**
     * client state associated with the request identifier
     */
    clientState?: Any;
    /**
     * merkle proof of existence
     */
    proof: Uint8Array;
    /**
     * height at which the proof was retrieved
     */
    proofHeight: Height;
}
export interface QueryClientStateResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryClientStateResponse';
    value: Uint8Array;
}
/**
 * QueryClientStateResponse is the response type for the Query/ClientState RPC
 * method. Besides the client state, it includes a proof and the height from
 * which the proof was retrieved.
 * @name QueryClientStateResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStateResponse
 */
export interface QueryClientStateResponseSDKType {
    client_state?: AnySDKType;
    proof: Uint8Array;
    proof_height: HeightSDKType;
}
/**
 * QueryClientStatesRequest is the request type for the Query/ClientStates RPC
 * method
 * @name QueryClientStatesRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStatesRequest
 */
export interface QueryClientStatesRequest {
    /**
     * pagination request
     */
    pagination?: PageRequest;
}
export interface QueryClientStatesRequestProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryClientStatesRequest';
    value: Uint8Array;
}
/**
 * QueryClientStatesRequest is the request type for the Query/ClientStates RPC
 * method
 * @name QueryClientStatesRequestSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStatesRequest
 */
export interface QueryClientStatesRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * QueryClientStatesResponse is the response type for the Query/ClientStates RPC
 * method.
 * @name QueryClientStatesResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStatesResponse
 */
export interface QueryClientStatesResponse {
    /**
     * list of stored ClientStates of the chain.
     */
    clientStates: IdentifiedClientState[];
    /**
     * pagination response
     */
    pagination?: PageResponse;
}
export interface QueryClientStatesResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryClientStatesResponse';
    value: Uint8Array;
}
/**
 * QueryClientStatesResponse is the response type for the Query/ClientStates RPC
 * method.
 * @name QueryClientStatesResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStatesResponse
 */
export interface QueryClientStatesResponseSDKType {
    client_states: IdentifiedClientStateSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryConsensusStateRequest is the request type for the Query/ConsensusState
 * RPC method. Besides the consensus state, it includes a proof and the height
 * from which the proof was retrieved.
 * @name QueryConsensusStateRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStateRequest
 */
export interface QueryConsensusStateRequest {
    /**
     * client identifier
     */
    clientId: string;
    /**
     * consensus state revision number
     */
    revisionNumber: bigint;
    /**
     * consensus state revision height
     */
    revisionHeight: bigint;
    /**
     * latest_height overrrides the height field and queries the latest stored
     * ConsensusState
     */
    latestHeight: boolean;
}
export interface QueryConsensusStateRequestProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryConsensusStateRequest';
    value: Uint8Array;
}
/**
 * QueryConsensusStateRequest is the request type for the Query/ConsensusState
 * RPC method. Besides the consensus state, it includes a proof and the height
 * from which the proof was retrieved.
 * @name QueryConsensusStateRequestSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStateRequest
 */
export interface QueryConsensusStateRequestSDKType {
    client_id: string;
    revision_number: bigint;
    revision_height: bigint;
    latest_height: boolean;
}
/**
 * QueryConsensusStateResponse is the response type for the Query/ConsensusState
 * RPC method
 * @name QueryConsensusStateResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStateResponse
 */
export interface QueryConsensusStateResponse {
    /**
     * consensus state associated with the client identifier at the given height
     */
    consensusState?: Any;
    /**
     * merkle proof of existence
     */
    proof: Uint8Array;
    /**
     * height at which the proof was retrieved
     */
    proofHeight: Height;
}
export interface QueryConsensusStateResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryConsensusStateResponse';
    value: Uint8Array;
}
/**
 * QueryConsensusStateResponse is the response type for the Query/ConsensusState
 * RPC method
 * @name QueryConsensusStateResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStateResponse
 */
export interface QueryConsensusStateResponseSDKType {
    consensus_state?: AnySDKType;
    proof: Uint8Array;
    proof_height: HeightSDKType;
}
/**
 * QueryConsensusStatesRequest is the request type for the Query/ConsensusStates
 * RPC method.
 * @name QueryConsensusStatesRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStatesRequest
 */
export interface QueryConsensusStatesRequest {
    /**
     * client identifier
     */
    clientId: string;
    /**
     * pagination request
     */
    pagination?: PageRequest;
}
export interface QueryConsensusStatesRequestProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryConsensusStatesRequest';
    value: Uint8Array;
}
/**
 * QueryConsensusStatesRequest is the request type for the Query/ConsensusStates
 * RPC method.
 * @name QueryConsensusStatesRequestSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStatesRequest
 */
export interface QueryConsensusStatesRequestSDKType {
    client_id: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryConsensusStatesResponse is the response type for the
 * Query/ConsensusStates RPC method
 * @name QueryConsensusStatesResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStatesResponse
 */
export interface QueryConsensusStatesResponse {
    /**
     * consensus states associated with the identifier
     */
    consensusStates: ConsensusStateWithHeight[];
    /**
     * pagination response
     */
    pagination?: PageResponse;
}
export interface QueryConsensusStatesResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryConsensusStatesResponse';
    value: Uint8Array;
}
/**
 * QueryConsensusStatesResponse is the response type for the
 * Query/ConsensusStates RPC method
 * @name QueryConsensusStatesResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStatesResponse
 */
export interface QueryConsensusStatesResponseSDKType {
    consensus_states: ConsensusStateWithHeightSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryConsensusStateHeightsRequest is the request type for Query/ConsensusStateHeights
 * RPC method.
 * @name QueryConsensusStateHeightsRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStateHeightsRequest
 */
export interface QueryConsensusStateHeightsRequest {
    /**
     * client identifier
     */
    clientId: string;
    /**
     * pagination request
     */
    pagination?: PageRequest;
}
export interface QueryConsensusStateHeightsRequestProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryConsensusStateHeightsRequest';
    value: Uint8Array;
}
/**
 * QueryConsensusStateHeightsRequest is the request type for Query/ConsensusStateHeights
 * RPC method.
 * @name QueryConsensusStateHeightsRequestSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStateHeightsRequest
 */
export interface QueryConsensusStateHeightsRequestSDKType {
    client_id: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryConsensusStateHeightsResponse is the response type for the
 * Query/ConsensusStateHeights RPC method
 * @name QueryConsensusStateHeightsResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStateHeightsResponse
 */
export interface QueryConsensusStateHeightsResponse {
    /**
     * consensus state heights
     */
    consensusStateHeights: Height[];
    /**
     * pagination response
     */
    pagination?: PageResponse;
}
export interface QueryConsensusStateHeightsResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryConsensusStateHeightsResponse';
    value: Uint8Array;
}
/**
 * QueryConsensusStateHeightsResponse is the response type for the
 * Query/ConsensusStateHeights RPC method
 * @name QueryConsensusStateHeightsResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStateHeightsResponse
 */
export interface QueryConsensusStateHeightsResponseSDKType {
    consensus_state_heights: HeightSDKType[];
    pagination?: PageResponseSDKType;
}
/**
 * QueryClientStatusRequest is the request type for the Query/ClientStatus RPC
 * method
 * @name QueryClientStatusRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStatusRequest
 */
export interface QueryClientStatusRequest {
    /**
     * client unique identifier
     */
    clientId: string;
}
export interface QueryClientStatusRequestProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryClientStatusRequest';
    value: Uint8Array;
}
/**
 * QueryClientStatusRequest is the request type for the Query/ClientStatus RPC
 * method
 * @name QueryClientStatusRequestSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStatusRequest
 */
export interface QueryClientStatusRequestSDKType {
    client_id: string;
}
/**
 * QueryClientStatusResponse is the response type for the Query/ClientStatus RPC
 * method. It returns the current status of the IBC client.
 * @name QueryClientStatusResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStatusResponse
 */
export interface QueryClientStatusResponse {
    status: string;
}
export interface QueryClientStatusResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryClientStatusResponse';
    value: Uint8Array;
}
/**
 * QueryClientStatusResponse is the response type for the Query/ClientStatus RPC
 * method. It returns the current status of the IBC client.
 * @name QueryClientStatusResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStatusResponse
 */
export interface QueryClientStatusResponseSDKType {
    status: string;
}
/**
 * QueryClientParamsRequest is the request type for the Query/ClientParams RPC
 * method.
 * @name QueryClientParamsRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientParamsRequest
 */
export interface QueryClientParamsRequest {
}
export interface QueryClientParamsRequestProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryClientParamsRequest';
    value: Uint8Array;
}
/**
 * QueryClientParamsRequest is the request type for the Query/ClientParams RPC
 * method.
 * @name QueryClientParamsRequestSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientParamsRequest
 */
export interface QueryClientParamsRequestSDKType {
}
/**
 * QueryClientParamsResponse is the response type for the Query/ClientParams RPC
 * method.
 * @name QueryClientParamsResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientParamsResponse
 */
export interface QueryClientParamsResponse {
    /**
     * params defines the parameters of the module.
     */
    params?: Params;
}
export interface QueryClientParamsResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryClientParamsResponse';
    value: Uint8Array;
}
/**
 * QueryClientParamsResponse is the response type for the Query/ClientParams RPC
 * method.
 * @name QueryClientParamsResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientParamsResponse
 */
export interface QueryClientParamsResponseSDKType {
    params?: ParamsSDKType;
}
/**
 * QueryUpgradedClientStateRequest is the request type for the
 * Query/UpgradedClientState RPC method
 * @name QueryUpgradedClientStateRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryUpgradedClientStateRequest
 */
export interface QueryUpgradedClientStateRequest {
}
export interface QueryUpgradedClientStateRequestProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryUpgradedClientStateRequest';
    value: Uint8Array;
}
/**
 * QueryUpgradedClientStateRequest is the request type for the
 * Query/UpgradedClientState RPC method
 * @name QueryUpgradedClientStateRequestSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryUpgradedClientStateRequest
 */
export interface QueryUpgradedClientStateRequestSDKType {
}
/**
 * QueryUpgradedClientStateResponse is the response type for the
 * Query/UpgradedClientState RPC method.
 * @name QueryUpgradedClientStateResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryUpgradedClientStateResponse
 */
export interface QueryUpgradedClientStateResponse {
    /**
     * client state associated with the request identifier
     */
    upgradedClientState?: Any;
}
export interface QueryUpgradedClientStateResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryUpgradedClientStateResponse';
    value: Uint8Array;
}
/**
 * QueryUpgradedClientStateResponse is the response type for the
 * Query/UpgradedClientState RPC method.
 * @name QueryUpgradedClientStateResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryUpgradedClientStateResponse
 */
export interface QueryUpgradedClientStateResponseSDKType {
    upgraded_client_state?: AnySDKType;
}
/**
 * QueryUpgradedConsensusStateRequest is the request type for the
 * Query/UpgradedConsensusState RPC method
 * @name QueryUpgradedConsensusStateRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryUpgradedConsensusStateRequest
 */
export interface QueryUpgradedConsensusStateRequest {
}
export interface QueryUpgradedConsensusStateRequestProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryUpgradedConsensusStateRequest';
    value: Uint8Array;
}
/**
 * QueryUpgradedConsensusStateRequest is the request type for the
 * Query/UpgradedConsensusState RPC method
 * @name QueryUpgradedConsensusStateRequestSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryUpgradedConsensusStateRequest
 */
export interface QueryUpgradedConsensusStateRequestSDKType {
}
/**
 * QueryUpgradedConsensusStateResponse is the response type for the
 * Query/UpgradedConsensusState RPC method.
 * @name QueryUpgradedConsensusStateResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryUpgradedConsensusStateResponse
 */
export interface QueryUpgradedConsensusStateResponse {
    /**
     * Consensus state associated with the request identifier
     */
    upgradedConsensusState?: Any;
}
export interface QueryUpgradedConsensusStateResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryUpgradedConsensusStateResponse';
    value: Uint8Array;
}
/**
 * QueryUpgradedConsensusStateResponse is the response type for the
 * Query/UpgradedConsensusState RPC method.
 * @name QueryUpgradedConsensusStateResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryUpgradedConsensusStateResponse
 */
export interface QueryUpgradedConsensusStateResponseSDKType {
    upgraded_consensus_state?: AnySDKType;
}
/**
 * QueryVerifyMembershipRequest is the request type for the Query/VerifyMembership RPC method
 * @name QueryVerifyMembershipRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryVerifyMembershipRequest
 */
export interface QueryVerifyMembershipRequest {
    /**
     * client unique identifier.
     */
    clientId: string;
    /**
     * the proof to be verified by the client.
     */
    proof: Uint8Array;
    /**
     * the height of the commitment root at which the proof is verified.
     */
    proofHeight: Height;
    /**
     * the commitment key path.
     */
    merklePath: MerklePath;
    /**
     * the value which is proven.
     */
    value: Uint8Array;
    /**
     * optional time delay
     */
    timeDelay: bigint;
    /**
     * optional block delay
     */
    blockDelay: bigint;
}
export interface QueryVerifyMembershipRequestProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryVerifyMembershipRequest';
    value: Uint8Array;
}
/**
 * QueryVerifyMembershipRequest is the request type for the Query/VerifyMembership RPC method
 * @name QueryVerifyMembershipRequestSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryVerifyMembershipRequest
 */
export interface QueryVerifyMembershipRequestSDKType {
    client_id: string;
    proof: Uint8Array;
    proof_height: HeightSDKType;
    merkle_path: MerklePathSDKType;
    value: Uint8Array;
    time_delay: bigint;
    block_delay: bigint;
}
/**
 * QueryVerifyMembershipResponse is the response type for the Query/VerifyMembership RPC method
 * @name QueryVerifyMembershipResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryVerifyMembershipResponse
 */
export interface QueryVerifyMembershipResponse {
    /**
     * boolean indicating success or failure of proof verification.
     */
    success: boolean;
}
export interface QueryVerifyMembershipResponseProtoMsg {
    typeUrl: '/ibc.core.client.v1.QueryVerifyMembershipResponse';
    value: Uint8Array;
}
/**
 * QueryVerifyMembershipResponse is the response type for the Query/VerifyMembership RPC method
 * @name QueryVerifyMembershipResponseSDKType
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryVerifyMembershipResponse
 */
export interface QueryVerifyMembershipResponseSDKType {
    success: boolean;
}
/**
 * QueryClientStateRequest is the request type for the Query/ClientState RPC
 * method
 * @name QueryClientStateRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStateRequest
 */
export declare const QueryClientStateRequest: {
    typeUrl: "/ibc.core.client.v1.QueryClientStateRequest";
    aminoType: "cosmos-sdk/QueryClientStateRequest";
    is(o: any): o is QueryClientStateRequest;
    isSDK(o: any): o is QueryClientStateRequestSDKType;
    encode(message: QueryClientStateRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryClientStateRequest;
    fromJSON(object: any): QueryClientStateRequest;
    toJSON(message: QueryClientStateRequest): JsonSafe<QueryClientStateRequest>;
    fromPartial(object: Partial<QueryClientStateRequest>): QueryClientStateRequest;
    fromProtoMsg(message: QueryClientStateRequestProtoMsg): QueryClientStateRequest;
    toProto(message: QueryClientStateRequest): Uint8Array;
    toProtoMsg(message: QueryClientStateRequest): QueryClientStateRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryClientStateResponse is the response type for the Query/ClientState RPC
 * method. Besides the client state, it includes a proof and the height from
 * which the proof was retrieved.
 * @name QueryClientStateResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStateResponse
 */
export declare const QueryClientStateResponse: {
    typeUrl: "/ibc.core.client.v1.QueryClientStateResponse";
    aminoType: "cosmos-sdk/QueryClientStateResponse";
    is(o: any): o is QueryClientStateResponse;
    isSDK(o: any): o is QueryClientStateResponseSDKType;
    encode(message: QueryClientStateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryClientStateResponse;
    fromJSON(object: any): QueryClientStateResponse;
    toJSON(message: QueryClientStateResponse): JsonSafe<QueryClientStateResponse>;
    fromPartial(object: Partial<QueryClientStateResponse>): QueryClientStateResponse;
    fromProtoMsg(message: QueryClientStateResponseProtoMsg): QueryClientStateResponse;
    toProto(message: QueryClientStateResponse): Uint8Array;
    toProtoMsg(message: QueryClientStateResponse): QueryClientStateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryClientStatesRequest is the request type for the Query/ClientStates RPC
 * method
 * @name QueryClientStatesRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStatesRequest
 */
export declare const QueryClientStatesRequest: {
    typeUrl: "/ibc.core.client.v1.QueryClientStatesRequest";
    aminoType: "cosmos-sdk/QueryClientStatesRequest";
    is(o: any): o is QueryClientStatesRequest;
    isSDK(o: any): o is QueryClientStatesRequestSDKType;
    encode(message: QueryClientStatesRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryClientStatesRequest;
    fromJSON(object: any): QueryClientStatesRequest;
    toJSON(message: QueryClientStatesRequest): JsonSafe<QueryClientStatesRequest>;
    fromPartial(object: Partial<QueryClientStatesRequest>): QueryClientStatesRequest;
    fromProtoMsg(message: QueryClientStatesRequestProtoMsg): QueryClientStatesRequest;
    toProto(message: QueryClientStatesRequest): Uint8Array;
    toProtoMsg(message: QueryClientStatesRequest): QueryClientStatesRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryClientStatesResponse is the response type for the Query/ClientStates RPC
 * method.
 * @name QueryClientStatesResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStatesResponse
 */
export declare const QueryClientStatesResponse: {
    typeUrl: "/ibc.core.client.v1.QueryClientStatesResponse";
    aminoType: "cosmos-sdk/QueryClientStatesResponse";
    is(o: any): o is QueryClientStatesResponse;
    isSDK(o: any): o is QueryClientStatesResponseSDKType;
    encode(message: QueryClientStatesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryClientStatesResponse;
    fromJSON(object: any): QueryClientStatesResponse;
    toJSON(message: QueryClientStatesResponse): JsonSafe<QueryClientStatesResponse>;
    fromPartial(object: Partial<QueryClientStatesResponse>): QueryClientStatesResponse;
    fromProtoMsg(message: QueryClientStatesResponseProtoMsg): QueryClientStatesResponse;
    toProto(message: QueryClientStatesResponse): Uint8Array;
    toProtoMsg(message: QueryClientStatesResponse): QueryClientStatesResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryConsensusStateRequest is the request type for the Query/ConsensusState
 * RPC method. Besides the consensus state, it includes a proof and the height
 * from which the proof was retrieved.
 * @name QueryConsensusStateRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStateRequest
 */
export declare const QueryConsensusStateRequest: {
    typeUrl: "/ibc.core.client.v1.QueryConsensusStateRequest";
    aminoType: "cosmos-sdk/QueryConsensusStateRequest";
    is(o: any): o is QueryConsensusStateRequest;
    isSDK(o: any): o is QueryConsensusStateRequestSDKType;
    encode(message: QueryConsensusStateRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryConsensusStateRequest;
    fromJSON(object: any): QueryConsensusStateRequest;
    toJSON(message: QueryConsensusStateRequest): JsonSafe<QueryConsensusStateRequest>;
    fromPartial(object: Partial<QueryConsensusStateRequest>): QueryConsensusStateRequest;
    fromProtoMsg(message: QueryConsensusStateRequestProtoMsg): QueryConsensusStateRequest;
    toProto(message: QueryConsensusStateRequest): Uint8Array;
    toProtoMsg(message: QueryConsensusStateRequest): QueryConsensusStateRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryConsensusStateResponse is the response type for the Query/ConsensusState
 * RPC method
 * @name QueryConsensusStateResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStateResponse
 */
export declare const QueryConsensusStateResponse: {
    typeUrl: "/ibc.core.client.v1.QueryConsensusStateResponse";
    aminoType: "cosmos-sdk/QueryConsensusStateResponse";
    is(o: any): o is QueryConsensusStateResponse;
    isSDK(o: any): o is QueryConsensusStateResponseSDKType;
    encode(message: QueryConsensusStateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryConsensusStateResponse;
    fromJSON(object: any): QueryConsensusStateResponse;
    toJSON(message: QueryConsensusStateResponse): JsonSafe<QueryConsensusStateResponse>;
    fromPartial(object: Partial<QueryConsensusStateResponse>): QueryConsensusStateResponse;
    fromProtoMsg(message: QueryConsensusStateResponseProtoMsg): QueryConsensusStateResponse;
    toProto(message: QueryConsensusStateResponse): Uint8Array;
    toProtoMsg(message: QueryConsensusStateResponse): QueryConsensusStateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryConsensusStatesRequest is the request type for the Query/ConsensusStates
 * RPC method.
 * @name QueryConsensusStatesRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStatesRequest
 */
export declare const QueryConsensusStatesRequest: {
    typeUrl: "/ibc.core.client.v1.QueryConsensusStatesRequest";
    aminoType: "cosmos-sdk/QueryConsensusStatesRequest";
    is(o: any): o is QueryConsensusStatesRequest;
    isSDK(o: any): o is QueryConsensusStatesRequestSDKType;
    encode(message: QueryConsensusStatesRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryConsensusStatesRequest;
    fromJSON(object: any): QueryConsensusStatesRequest;
    toJSON(message: QueryConsensusStatesRequest): JsonSafe<QueryConsensusStatesRequest>;
    fromPartial(object: Partial<QueryConsensusStatesRequest>): QueryConsensusStatesRequest;
    fromProtoMsg(message: QueryConsensusStatesRequestProtoMsg): QueryConsensusStatesRequest;
    toProto(message: QueryConsensusStatesRequest): Uint8Array;
    toProtoMsg(message: QueryConsensusStatesRequest): QueryConsensusStatesRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryConsensusStatesResponse is the response type for the
 * Query/ConsensusStates RPC method
 * @name QueryConsensusStatesResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStatesResponse
 */
export declare const QueryConsensusStatesResponse: {
    typeUrl: "/ibc.core.client.v1.QueryConsensusStatesResponse";
    aminoType: "cosmos-sdk/QueryConsensusStatesResponse";
    is(o: any): o is QueryConsensusStatesResponse;
    isSDK(o: any): o is QueryConsensusStatesResponseSDKType;
    encode(message: QueryConsensusStatesResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryConsensusStatesResponse;
    fromJSON(object: any): QueryConsensusStatesResponse;
    toJSON(message: QueryConsensusStatesResponse): JsonSafe<QueryConsensusStatesResponse>;
    fromPartial(object: Partial<QueryConsensusStatesResponse>): QueryConsensusStatesResponse;
    fromProtoMsg(message: QueryConsensusStatesResponseProtoMsg): QueryConsensusStatesResponse;
    toProto(message: QueryConsensusStatesResponse): Uint8Array;
    toProtoMsg(message: QueryConsensusStatesResponse): QueryConsensusStatesResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryConsensusStateHeightsRequest is the request type for Query/ConsensusStateHeights
 * RPC method.
 * @name QueryConsensusStateHeightsRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStateHeightsRequest
 */
export declare const QueryConsensusStateHeightsRequest: {
    typeUrl: "/ibc.core.client.v1.QueryConsensusStateHeightsRequest";
    aminoType: "cosmos-sdk/QueryConsensusStateHeightsRequest";
    is(o: any): o is QueryConsensusStateHeightsRequest;
    isSDK(o: any): o is QueryConsensusStateHeightsRequestSDKType;
    encode(message: QueryConsensusStateHeightsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryConsensusStateHeightsRequest;
    fromJSON(object: any): QueryConsensusStateHeightsRequest;
    toJSON(message: QueryConsensusStateHeightsRequest): JsonSafe<QueryConsensusStateHeightsRequest>;
    fromPartial(object: Partial<QueryConsensusStateHeightsRequest>): QueryConsensusStateHeightsRequest;
    fromProtoMsg(message: QueryConsensusStateHeightsRequestProtoMsg): QueryConsensusStateHeightsRequest;
    toProto(message: QueryConsensusStateHeightsRequest): Uint8Array;
    toProtoMsg(message: QueryConsensusStateHeightsRequest): QueryConsensusStateHeightsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryConsensusStateHeightsResponse is the response type for the
 * Query/ConsensusStateHeights RPC method
 * @name QueryConsensusStateHeightsResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryConsensusStateHeightsResponse
 */
export declare const QueryConsensusStateHeightsResponse: {
    typeUrl: "/ibc.core.client.v1.QueryConsensusStateHeightsResponse";
    aminoType: "cosmos-sdk/QueryConsensusStateHeightsResponse";
    is(o: any): o is QueryConsensusStateHeightsResponse;
    isSDK(o: any): o is QueryConsensusStateHeightsResponseSDKType;
    encode(message: QueryConsensusStateHeightsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryConsensusStateHeightsResponse;
    fromJSON(object: any): QueryConsensusStateHeightsResponse;
    toJSON(message: QueryConsensusStateHeightsResponse): JsonSafe<QueryConsensusStateHeightsResponse>;
    fromPartial(object: Partial<QueryConsensusStateHeightsResponse>): QueryConsensusStateHeightsResponse;
    fromProtoMsg(message: QueryConsensusStateHeightsResponseProtoMsg): QueryConsensusStateHeightsResponse;
    toProto(message: QueryConsensusStateHeightsResponse): Uint8Array;
    toProtoMsg(message: QueryConsensusStateHeightsResponse): QueryConsensusStateHeightsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryClientStatusRequest is the request type for the Query/ClientStatus RPC
 * method
 * @name QueryClientStatusRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStatusRequest
 */
export declare const QueryClientStatusRequest: {
    typeUrl: "/ibc.core.client.v1.QueryClientStatusRequest";
    aminoType: "cosmos-sdk/QueryClientStatusRequest";
    is(o: any): o is QueryClientStatusRequest;
    isSDK(o: any): o is QueryClientStatusRequestSDKType;
    encode(message: QueryClientStatusRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryClientStatusRequest;
    fromJSON(object: any): QueryClientStatusRequest;
    toJSON(message: QueryClientStatusRequest): JsonSafe<QueryClientStatusRequest>;
    fromPartial(object: Partial<QueryClientStatusRequest>): QueryClientStatusRequest;
    fromProtoMsg(message: QueryClientStatusRequestProtoMsg): QueryClientStatusRequest;
    toProto(message: QueryClientStatusRequest): Uint8Array;
    toProtoMsg(message: QueryClientStatusRequest): QueryClientStatusRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryClientStatusResponse is the response type for the Query/ClientStatus RPC
 * method. It returns the current status of the IBC client.
 * @name QueryClientStatusResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientStatusResponse
 */
export declare const QueryClientStatusResponse: {
    typeUrl: "/ibc.core.client.v1.QueryClientStatusResponse";
    aminoType: "cosmos-sdk/QueryClientStatusResponse";
    is(o: any): o is QueryClientStatusResponse;
    isSDK(o: any): o is QueryClientStatusResponseSDKType;
    encode(message: QueryClientStatusResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryClientStatusResponse;
    fromJSON(object: any): QueryClientStatusResponse;
    toJSON(message: QueryClientStatusResponse): JsonSafe<QueryClientStatusResponse>;
    fromPartial(object: Partial<QueryClientStatusResponse>): QueryClientStatusResponse;
    fromProtoMsg(message: QueryClientStatusResponseProtoMsg): QueryClientStatusResponse;
    toProto(message: QueryClientStatusResponse): Uint8Array;
    toProtoMsg(message: QueryClientStatusResponse): QueryClientStatusResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryClientParamsRequest is the request type for the Query/ClientParams RPC
 * method.
 * @name QueryClientParamsRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientParamsRequest
 */
export declare const QueryClientParamsRequest: {
    typeUrl: "/ibc.core.client.v1.QueryClientParamsRequest";
    aminoType: "cosmos-sdk/QueryClientParamsRequest";
    is(o: any): o is QueryClientParamsRequest;
    isSDK(o: any): o is QueryClientParamsRequestSDKType;
    encode(_: QueryClientParamsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryClientParamsRequest;
    fromJSON(_: any): QueryClientParamsRequest;
    toJSON(_: QueryClientParamsRequest): JsonSafe<QueryClientParamsRequest>;
    fromPartial(_: Partial<QueryClientParamsRequest>): QueryClientParamsRequest;
    fromProtoMsg(message: QueryClientParamsRequestProtoMsg): QueryClientParamsRequest;
    toProto(message: QueryClientParamsRequest): Uint8Array;
    toProtoMsg(message: QueryClientParamsRequest): QueryClientParamsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryClientParamsResponse is the response type for the Query/ClientParams RPC
 * method.
 * @name QueryClientParamsResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryClientParamsResponse
 */
export declare const QueryClientParamsResponse: {
    typeUrl: "/ibc.core.client.v1.QueryClientParamsResponse";
    aminoType: "cosmos-sdk/QueryClientParamsResponse";
    is(o: any): o is QueryClientParamsResponse;
    isSDK(o: any): o is QueryClientParamsResponseSDKType;
    encode(message: QueryClientParamsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryClientParamsResponse;
    fromJSON(object: any): QueryClientParamsResponse;
    toJSON(message: QueryClientParamsResponse): JsonSafe<QueryClientParamsResponse>;
    fromPartial(object: Partial<QueryClientParamsResponse>): QueryClientParamsResponse;
    fromProtoMsg(message: QueryClientParamsResponseProtoMsg): QueryClientParamsResponse;
    toProto(message: QueryClientParamsResponse): Uint8Array;
    toProtoMsg(message: QueryClientParamsResponse): QueryClientParamsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUpgradedClientStateRequest is the request type for the
 * Query/UpgradedClientState RPC method
 * @name QueryUpgradedClientStateRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryUpgradedClientStateRequest
 */
export declare const QueryUpgradedClientStateRequest: {
    typeUrl: "/ibc.core.client.v1.QueryUpgradedClientStateRequest";
    aminoType: "cosmos-sdk/QueryUpgradedClientStateRequest";
    is(o: any): o is QueryUpgradedClientStateRequest;
    isSDK(o: any): o is QueryUpgradedClientStateRequestSDKType;
    encode(_: QueryUpgradedClientStateRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUpgradedClientStateRequest;
    fromJSON(_: any): QueryUpgradedClientStateRequest;
    toJSON(_: QueryUpgradedClientStateRequest): JsonSafe<QueryUpgradedClientStateRequest>;
    fromPartial(_: Partial<QueryUpgradedClientStateRequest>): QueryUpgradedClientStateRequest;
    fromProtoMsg(message: QueryUpgradedClientStateRequestProtoMsg): QueryUpgradedClientStateRequest;
    toProto(message: QueryUpgradedClientStateRequest): Uint8Array;
    toProtoMsg(message: QueryUpgradedClientStateRequest): QueryUpgradedClientStateRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUpgradedClientStateResponse is the response type for the
 * Query/UpgradedClientState RPC method.
 * @name QueryUpgradedClientStateResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryUpgradedClientStateResponse
 */
export declare const QueryUpgradedClientStateResponse: {
    typeUrl: "/ibc.core.client.v1.QueryUpgradedClientStateResponse";
    aminoType: "cosmos-sdk/QueryUpgradedClientStateResponse";
    is(o: any): o is QueryUpgradedClientStateResponse;
    isSDK(o: any): o is QueryUpgradedClientStateResponseSDKType;
    encode(message: QueryUpgradedClientStateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUpgradedClientStateResponse;
    fromJSON(object: any): QueryUpgradedClientStateResponse;
    toJSON(message: QueryUpgradedClientStateResponse): JsonSafe<QueryUpgradedClientStateResponse>;
    fromPartial(object: Partial<QueryUpgradedClientStateResponse>): QueryUpgradedClientStateResponse;
    fromProtoMsg(message: QueryUpgradedClientStateResponseProtoMsg): QueryUpgradedClientStateResponse;
    toProto(message: QueryUpgradedClientStateResponse): Uint8Array;
    toProtoMsg(message: QueryUpgradedClientStateResponse): QueryUpgradedClientStateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUpgradedConsensusStateRequest is the request type for the
 * Query/UpgradedConsensusState RPC method
 * @name QueryUpgradedConsensusStateRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryUpgradedConsensusStateRequest
 */
export declare const QueryUpgradedConsensusStateRequest: {
    typeUrl: "/ibc.core.client.v1.QueryUpgradedConsensusStateRequest";
    aminoType: "cosmos-sdk/QueryUpgradedConsensusStateRequest";
    is(o: any): o is QueryUpgradedConsensusStateRequest;
    isSDK(o: any): o is QueryUpgradedConsensusStateRequestSDKType;
    encode(_: QueryUpgradedConsensusStateRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUpgradedConsensusStateRequest;
    fromJSON(_: any): QueryUpgradedConsensusStateRequest;
    toJSON(_: QueryUpgradedConsensusStateRequest): JsonSafe<QueryUpgradedConsensusStateRequest>;
    fromPartial(_: Partial<QueryUpgradedConsensusStateRequest>): QueryUpgradedConsensusStateRequest;
    fromProtoMsg(message: QueryUpgradedConsensusStateRequestProtoMsg): QueryUpgradedConsensusStateRequest;
    toProto(message: QueryUpgradedConsensusStateRequest): Uint8Array;
    toProtoMsg(message: QueryUpgradedConsensusStateRequest): QueryUpgradedConsensusStateRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUpgradedConsensusStateResponse is the response type for the
 * Query/UpgradedConsensusState RPC method.
 * @name QueryUpgradedConsensusStateResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryUpgradedConsensusStateResponse
 */
export declare const QueryUpgradedConsensusStateResponse: {
    typeUrl: "/ibc.core.client.v1.QueryUpgradedConsensusStateResponse";
    aminoType: "cosmos-sdk/QueryUpgradedConsensusStateResponse";
    is(o: any): o is QueryUpgradedConsensusStateResponse;
    isSDK(o: any): o is QueryUpgradedConsensusStateResponseSDKType;
    encode(message: QueryUpgradedConsensusStateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUpgradedConsensusStateResponse;
    fromJSON(object: any): QueryUpgradedConsensusStateResponse;
    toJSON(message: QueryUpgradedConsensusStateResponse): JsonSafe<QueryUpgradedConsensusStateResponse>;
    fromPartial(object: Partial<QueryUpgradedConsensusStateResponse>): QueryUpgradedConsensusStateResponse;
    fromProtoMsg(message: QueryUpgradedConsensusStateResponseProtoMsg): QueryUpgradedConsensusStateResponse;
    toProto(message: QueryUpgradedConsensusStateResponse): Uint8Array;
    toProtoMsg(message: QueryUpgradedConsensusStateResponse): QueryUpgradedConsensusStateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryVerifyMembershipRequest is the request type for the Query/VerifyMembership RPC method
 * @name QueryVerifyMembershipRequest
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryVerifyMembershipRequest
 */
export declare const QueryVerifyMembershipRequest: {
    typeUrl: "/ibc.core.client.v1.QueryVerifyMembershipRequest";
    aminoType: "cosmos-sdk/QueryVerifyMembershipRequest";
    is(o: any): o is QueryVerifyMembershipRequest;
    isSDK(o: any): o is QueryVerifyMembershipRequestSDKType;
    encode(message: QueryVerifyMembershipRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryVerifyMembershipRequest;
    fromJSON(object: any): QueryVerifyMembershipRequest;
    toJSON(message: QueryVerifyMembershipRequest): JsonSafe<QueryVerifyMembershipRequest>;
    fromPartial(object: Partial<QueryVerifyMembershipRequest>): QueryVerifyMembershipRequest;
    fromProtoMsg(message: QueryVerifyMembershipRequestProtoMsg): QueryVerifyMembershipRequest;
    toProto(message: QueryVerifyMembershipRequest): Uint8Array;
    toProtoMsg(message: QueryVerifyMembershipRequest): QueryVerifyMembershipRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryVerifyMembershipResponse is the response type for the Query/VerifyMembership RPC method
 * @name QueryVerifyMembershipResponse
 * @package ibc.core.client.v1
 * @see proto type: ibc.core.client.v1.QueryVerifyMembershipResponse
 */
export declare const QueryVerifyMembershipResponse: {
    typeUrl: "/ibc.core.client.v1.QueryVerifyMembershipResponse";
    aminoType: "cosmos-sdk/QueryVerifyMembershipResponse";
    is(o: any): o is QueryVerifyMembershipResponse;
    isSDK(o: any): o is QueryVerifyMembershipResponseSDKType;
    encode(message: QueryVerifyMembershipResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryVerifyMembershipResponse;
    fromJSON(object: any): QueryVerifyMembershipResponse;
    toJSON(message: QueryVerifyMembershipResponse): JsonSafe<QueryVerifyMembershipResponse>;
    fromPartial(object: Partial<QueryVerifyMembershipResponse>): QueryVerifyMembershipResponse;
    fromProtoMsg(message: QueryVerifyMembershipResponseProtoMsg): QueryVerifyMembershipResponse;
    toProto(message: QueryVerifyMembershipResponse): Uint8Array;
    toProtoMsg(message: QueryVerifyMembershipResponse): QueryVerifyMembershipResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map