import { PageRequest, type PageRequestSDKType, PageResponse, type PageResponseSDKType } from '../../../../cosmos/base/query/v1beta1/pagination.js';
import { Channel, type ChannelSDKType, IdentifiedChannel, type IdentifiedChannelSDKType, PacketState, type PacketStateSDKType } from './channel.js';
import { Height, type HeightSDKType, IdentifiedClientState, type IdentifiedClientStateSDKType, Params, type ParamsSDKType } from '../../client/v1/client.js';
import { Any, type AnySDKType } from '../../../../google/protobuf/any.js';
import { ErrorReceipt, type ErrorReceiptSDKType, Upgrade, type UpgradeSDKType } from './upgrade.js';
import { BinaryReader, BinaryWriter } from '../../../../binary.js';
import { type JsonSafe } from '../../../../json-safe.js';
/**
 * QueryChannelRequest is the request type for the Query/Channel RPC method
 * @name QueryChannelRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelRequest
 */
export interface QueryChannelRequest {
    /**
     * port unique identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
}
export interface QueryChannelRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryChannelRequest';
    value: Uint8Array;
}
/**
 * QueryChannelRequest is the request type for the Query/Channel RPC method
 * @name QueryChannelRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelRequest
 */
export interface QueryChannelRequestSDKType {
    port_id: string;
    channel_id: string;
}
/**
 * QueryChannelResponse is the response type for the Query/Channel RPC method.
 * Besides the Channel end, it includes a proof and the height from which the
 * proof was retrieved.
 * @name QueryChannelResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelResponse
 */
export interface QueryChannelResponse {
    /**
     * channel associated with the request identifiers
     */
    channel?: Channel;
    /**
     * merkle proof of existence
     */
    proof: Uint8Array;
    /**
     * height at which the proof was retrieved
     */
    proofHeight: Height;
}
export interface QueryChannelResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryChannelResponse';
    value: Uint8Array;
}
/**
 * QueryChannelResponse is the response type for the Query/Channel RPC method.
 * Besides the Channel end, it includes a proof and the height from which the
 * proof was retrieved.
 * @name QueryChannelResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelResponse
 */
export interface QueryChannelResponseSDKType {
    channel?: ChannelSDKType;
    proof: Uint8Array;
    proof_height: HeightSDKType;
}
/**
 * QueryChannelsRequest is the request type for the Query/Channels RPC method
 * @name QueryChannelsRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelsRequest
 */
export interface QueryChannelsRequest {
    /**
     * pagination request
     */
    pagination?: PageRequest;
}
export interface QueryChannelsRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryChannelsRequest';
    value: Uint8Array;
}
/**
 * QueryChannelsRequest is the request type for the Query/Channels RPC method
 * @name QueryChannelsRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelsRequest
 */
export interface QueryChannelsRequestSDKType {
    pagination?: PageRequestSDKType;
}
/**
 * QueryChannelsResponse is the response type for the Query/Channels RPC method.
 * @name QueryChannelsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelsResponse
 */
export interface QueryChannelsResponse {
    /**
     * list of stored channels of the chain.
     */
    channels: IdentifiedChannel[];
    /**
     * pagination response
     */
    pagination?: PageResponse;
    /**
     * query block height
     */
    height: Height;
}
export interface QueryChannelsResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryChannelsResponse';
    value: Uint8Array;
}
/**
 * QueryChannelsResponse is the response type for the Query/Channels RPC method.
 * @name QueryChannelsResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelsResponse
 */
export interface QueryChannelsResponseSDKType {
    channels: IdentifiedChannelSDKType[];
    pagination?: PageResponseSDKType;
    height: HeightSDKType;
}
/**
 * QueryConnectionChannelsRequest is the request type for the
 * Query/QueryConnectionChannels RPC method
 * @name QueryConnectionChannelsRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryConnectionChannelsRequest
 */
export interface QueryConnectionChannelsRequest {
    /**
     * connection unique identifier
     */
    connection: string;
    /**
     * pagination request
     */
    pagination?: PageRequest;
}
export interface QueryConnectionChannelsRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryConnectionChannelsRequest';
    value: Uint8Array;
}
/**
 * QueryConnectionChannelsRequest is the request type for the
 * Query/QueryConnectionChannels RPC method
 * @name QueryConnectionChannelsRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryConnectionChannelsRequest
 */
export interface QueryConnectionChannelsRequestSDKType {
    connection: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryConnectionChannelsResponse is the Response type for the
 * Query/QueryConnectionChannels RPC method
 * @name QueryConnectionChannelsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryConnectionChannelsResponse
 */
export interface QueryConnectionChannelsResponse {
    /**
     * list of channels associated with a connection.
     */
    channels: IdentifiedChannel[];
    /**
     * pagination response
     */
    pagination?: PageResponse;
    /**
     * query block height
     */
    height: Height;
}
export interface QueryConnectionChannelsResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryConnectionChannelsResponse';
    value: Uint8Array;
}
/**
 * QueryConnectionChannelsResponse is the Response type for the
 * Query/QueryConnectionChannels RPC method
 * @name QueryConnectionChannelsResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryConnectionChannelsResponse
 */
export interface QueryConnectionChannelsResponseSDKType {
    channels: IdentifiedChannelSDKType[];
    pagination?: PageResponseSDKType;
    height: HeightSDKType;
}
/**
 * QueryChannelClientStateRequest is the request type for the Query/ClientState
 * RPC method
 * @name QueryChannelClientStateRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelClientStateRequest
 */
export interface QueryChannelClientStateRequest {
    /**
     * port unique identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
}
export interface QueryChannelClientStateRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryChannelClientStateRequest';
    value: Uint8Array;
}
/**
 * QueryChannelClientStateRequest is the request type for the Query/ClientState
 * RPC method
 * @name QueryChannelClientStateRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelClientStateRequest
 */
export interface QueryChannelClientStateRequestSDKType {
    port_id: string;
    channel_id: string;
}
/**
 * QueryChannelClientStateResponse is the Response type for the
 * Query/QueryChannelClientState RPC method
 * @name QueryChannelClientStateResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelClientStateResponse
 */
export interface QueryChannelClientStateResponse {
    /**
     * client state associated with the channel
     */
    identifiedClientState?: IdentifiedClientState;
    /**
     * merkle proof of existence
     */
    proof: Uint8Array;
    /**
     * height at which the proof was retrieved
     */
    proofHeight: Height;
}
export interface QueryChannelClientStateResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryChannelClientStateResponse';
    value: Uint8Array;
}
/**
 * QueryChannelClientStateResponse is the Response type for the
 * Query/QueryChannelClientState RPC method
 * @name QueryChannelClientStateResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelClientStateResponse
 */
export interface QueryChannelClientStateResponseSDKType {
    identified_client_state?: IdentifiedClientStateSDKType;
    proof: Uint8Array;
    proof_height: HeightSDKType;
}
/**
 * QueryChannelConsensusStateRequest is the request type for the
 * Query/ConsensusState RPC method
 * @name QueryChannelConsensusStateRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelConsensusStateRequest
 */
export interface QueryChannelConsensusStateRequest {
    /**
     * port unique identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
    /**
     * revision number of the consensus state
     */
    revisionNumber: bigint;
    /**
     * revision height of the consensus state
     */
    revisionHeight: bigint;
}
export interface QueryChannelConsensusStateRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryChannelConsensusStateRequest';
    value: Uint8Array;
}
/**
 * QueryChannelConsensusStateRequest is the request type for the
 * Query/ConsensusState RPC method
 * @name QueryChannelConsensusStateRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelConsensusStateRequest
 */
export interface QueryChannelConsensusStateRequestSDKType {
    port_id: string;
    channel_id: string;
    revision_number: bigint;
    revision_height: bigint;
}
/**
 * QueryChannelClientStateResponse is the Response type for the
 * Query/QueryChannelClientState RPC method
 * @name QueryChannelConsensusStateResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelConsensusStateResponse
 */
export interface QueryChannelConsensusStateResponse {
    /**
     * consensus state associated with the channel
     */
    consensusState?: Any;
    /**
     * client ID associated with the consensus state
     */
    clientId: string;
    /**
     * merkle proof of existence
     */
    proof: Uint8Array;
    /**
     * height at which the proof was retrieved
     */
    proofHeight: Height;
}
export interface QueryChannelConsensusStateResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryChannelConsensusStateResponse';
    value: Uint8Array;
}
/**
 * QueryChannelClientStateResponse is the Response type for the
 * Query/QueryChannelClientState RPC method
 * @name QueryChannelConsensusStateResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelConsensusStateResponse
 */
export interface QueryChannelConsensusStateResponseSDKType {
    consensus_state?: AnySDKType;
    client_id: string;
    proof: Uint8Array;
    proof_height: HeightSDKType;
}
/**
 * QueryPacketCommitmentRequest is the request type for the
 * Query/PacketCommitment RPC method
 * @name QueryPacketCommitmentRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketCommitmentRequest
 */
export interface QueryPacketCommitmentRequest {
    /**
     * port unique identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
    /**
     * packet sequence
     */
    sequence: bigint;
}
export interface QueryPacketCommitmentRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryPacketCommitmentRequest';
    value: Uint8Array;
}
/**
 * QueryPacketCommitmentRequest is the request type for the
 * Query/PacketCommitment RPC method
 * @name QueryPacketCommitmentRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketCommitmentRequest
 */
export interface QueryPacketCommitmentRequestSDKType {
    port_id: string;
    channel_id: string;
    sequence: bigint;
}
/**
 * QueryPacketCommitmentResponse defines the client query response for a packet
 * which also includes a proof and the height from which the proof was
 * retrieved
 * @name QueryPacketCommitmentResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketCommitmentResponse
 */
export interface QueryPacketCommitmentResponse {
    /**
     * packet associated with the request fields
     */
    commitment: Uint8Array;
    /**
     * merkle proof of existence
     */
    proof: Uint8Array;
    /**
     * height at which the proof was retrieved
     */
    proofHeight: Height;
}
export interface QueryPacketCommitmentResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryPacketCommitmentResponse';
    value: Uint8Array;
}
/**
 * QueryPacketCommitmentResponse defines the client query response for a packet
 * which also includes a proof and the height from which the proof was
 * retrieved
 * @name QueryPacketCommitmentResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketCommitmentResponse
 */
export interface QueryPacketCommitmentResponseSDKType {
    commitment: Uint8Array;
    proof: Uint8Array;
    proof_height: HeightSDKType;
}
/**
 * QueryPacketCommitmentsRequest is the request type for the
 * Query/QueryPacketCommitments RPC method
 * @name QueryPacketCommitmentsRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketCommitmentsRequest
 */
export interface QueryPacketCommitmentsRequest {
    /**
     * port unique identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
    /**
     * pagination request
     */
    pagination?: PageRequest;
}
export interface QueryPacketCommitmentsRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryPacketCommitmentsRequest';
    value: Uint8Array;
}
/**
 * QueryPacketCommitmentsRequest is the request type for the
 * Query/QueryPacketCommitments RPC method
 * @name QueryPacketCommitmentsRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketCommitmentsRequest
 */
export interface QueryPacketCommitmentsRequestSDKType {
    port_id: string;
    channel_id: string;
    pagination?: PageRequestSDKType;
}
/**
 * QueryPacketCommitmentsResponse is the request type for the
 * Query/QueryPacketCommitments RPC method
 * @name QueryPacketCommitmentsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketCommitmentsResponse
 */
export interface QueryPacketCommitmentsResponse {
    commitments: PacketState[];
    /**
     * pagination response
     */
    pagination?: PageResponse;
    /**
     * query block height
     */
    height: Height;
}
export interface QueryPacketCommitmentsResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryPacketCommitmentsResponse';
    value: Uint8Array;
}
/**
 * QueryPacketCommitmentsResponse is the request type for the
 * Query/QueryPacketCommitments RPC method
 * @name QueryPacketCommitmentsResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketCommitmentsResponse
 */
export interface QueryPacketCommitmentsResponseSDKType {
    commitments: PacketStateSDKType[];
    pagination?: PageResponseSDKType;
    height: HeightSDKType;
}
/**
 * QueryPacketReceiptRequest is the request type for the
 * Query/PacketReceipt RPC method
 * @name QueryPacketReceiptRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketReceiptRequest
 */
export interface QueryPacketReceiptRequest {
    /**
     * port unique identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
    /**
     * packet sequence
     */
    sequence: bigint;
}
export interface QueryPacketReceiptRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryPacketReceiptRequest';
    value: Uint8Array;
}
/**
 * QueryPacketReceiptRequest is the request type for the
 * Query/PacketReceipt RPC method
 * @name QueryPacketReceiptRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketReceiptRequest
 */
export interface QueryPacketReceiptRequestSDKType {
    port_id: string;
    channel_id: string;
    sequence: bigint;
}
/**
 * QueryPacketReceiptResponse defines the client query response for a packet
 * receipt which also includes a proof, and the height from which the proof was
 * retrieved
 * @name QueryPacketReceiptResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketReceiptResponse
 */
export interface QueryPacketReceiptResponse {
    /**
     * success flag for if receipt exists
     */
    received: boolean;
    /**
     * merkle proof of existence
     */
    proof: Uint8Array;
    /**
     * height at which the proof was retrieved
     */
    proofHeight: Height;
}
export interface QueryPacketReceiptResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryPacketReceiptResponse';
    value: Uint8Array;
}
/**
 * QueryPacketReceiptResponse defines the client query response for a packet
 * receipt which also includes a proof, and the height from which the proof was
 * retrieved
 * @name QueryPacketReceiptResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketReceiptResponse
 */
export interface QueryPacketReceiptResponseSDKType {
    received: boolean;
    proof: Uint8Array;
    proof_height: HeightSDKType;
}
/**
 * QueryPacketAcknowledgementRequest is the request type for the
 * Query/PacketAcknowledgement RPC method
 * @name QueryPacketAcknowledgementRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketAcknowledgementRequest
 */
export interface QueryPacketAcknowledgementRequest {
    /**
     * port unique identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
    /**
     * packet sequence
     */
    sequence: bigint;
}
export interface QueryPacketAcknowledgementRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryPacketAcknowledgementRequest';
    value: Uint8Array;
}
/**
 * QueryPacketAcknowledgementRequest is the request type for the
 * Query/PacketAcknowledgement RPC method
 * @name QueryPacketAcknowledgementRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketAcknowledgementRequest
 */
export interface QueryPacketAcknowledgementRequestSDKType {
    port_id: string;
    channel_id: string;
    sequence: bigint;
}
/**
 * QueryPacketAcknowledgementResponse defines the client query response for a
 * packet which also includes a proof and the height from which the
 * proof was retrieved
 * @name QueryPacketAcknowledgementResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketAcknowledgementResponse
 */
export interface QueryPacketAcknowledgementResponse {
    /**
     * packet associated with the request fields
     */
    acknowledgement: Uint8Array;
    /**
     * merkle proof of existence
     */
    proof: Uint8Array;
    /**
     * height at which the proof was retrieved
     */
    proofHeight: Height;
}
export interface QueryPacketAcknowledgementResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryPacketAcknowledgementResponse';
    value: Uint8Array;
}
/**
 * QueryPacketAcknowledgementResponse defines the client query response for a
 * packet which also includes a proof and the height from which the
 * proof was retrieved
 * @name QueryPacketAcknowledgementResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketAcknowledgementResponse
 */
export interface QueryPacketAcknowledgementResponseSDKType {
    acknowledgement: Uint8Array;
    proof: Uint8Array;
    proof_height: HeightSDKType;
}
/**
 * QueryPacketAcknowledgementsRequest is the request type for the
 * Query/QueryPacketCommitments RPC method
 * @name QueryPacketAcknowledgementsRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketAcknowledgementsRequest
 */
export interface QueryPacketAcknowledgementsRequest {
    /**
     * port unique identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
    /**
     * pagination request
     */
    pagination?: PageRequest;
    /**
     * list of packet sequences
     */
    packetCommitmentSequences: bigint[];
}
export interface QueryPacketAcknowledgementsRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryPacketAcknowledgementsRequest';
    value: Uint8Array;
}
/**
 * QueryPacketAcknowledgementsRequest is the request type for the
 * Query/QueryPacketCommitments RPC method
 * @name QueryPacketAcknowledgementsRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketAcknowledgementsRequest
 */
export interface QueryPacketAcknowledgementsRequestSDKType {
    port_id: string;
    channel_id: string;
    pagination?: PageRequestSDKType;
    packet_commitment_sequences: bigint[];
}
/**
 * QueryPacketAcknowledgemetsResponse is the request type for the
 * Query/QueryPacketAcknowledgements RPC method
 * @name QueryPacketAcknowledgementsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketAcknowledgementsResponse
 */
export interface QueryPacketAcknowledgementsResponse {
    acknowledgements: PacketState[];
    /**
     * pagination response
     */
    pagination?: PageResponse;
    /**
     * query block height
     */
    height: Height;
}
export interface QueryPacketAcknowledgementsResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryPacketAcknowledgementsResponse';
    value: Uint8Array;
}
/**
 * QueryPacketAcknowledgemetsResponse is the request type for the
 * Query/QueryPacketAcknowledgements RPC method
 * @name QueryPacketAcknowledgementsResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketAcknowledgementsResponse
 */
export interface QueryPacketAcknowledgementsResponseSDKType {
    acknowledgements: PacketStateSDKType[];
    pagination?: PageResponseSDKType;
    height: HeightSDKType;
}
/**
 * QueryUnreceivedPacketsRequest is the request type for the
 * Query/UnreceivedPackets RPC method
 * @name QueryUnreceivedPacketsRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUnreceivedPacketsRequest
 */
export interface QueryUnreceivedPacketsRequest {
    /**
     * port unique identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
    /**
     * list of packet sequences
     */
    packetCommitmentSequences: bigint[];
}
export interface QueryUnreceivedPacketsRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryUnreceivedPacketsRequest';
    value: Uint8Array;
}
/**
 * QueryUnreceivedPacketsRequest is the request type for the
 * Query/UnreceivedPackets RPC method
 * @name QueryUnreceivedPacketsRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUnreceivedPacketsRequest
 */
export interface QueryUnreceivedPacketsRequestSDKType {
    port_id: string;
    channel_id: string;
    packet_commitment_sequences: bigint[];
}
/**
 * QueryUnreceivedPacketsResponse is the response type for the
 * Query/UnreceivedPacketCommitments RPC method
 * @name QueryUnreceivedPacketsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUnreceivedPacketsResponse
 */
export interface QueryUnreceivedPacketsResponse {
    /**
     * list of unreceived packet sequences
     */
    sequences: bigint[];
    /**
     * query block height
     */
    height: Height;
}
export interface QueryUnreceivedPacketsResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryUnreceivedPacketsResponse';
    value: Uint8Array;
}
/**
 * QueryUnreceivedPacketsResponse is the response type for the
 * Query/UnreceivedPacketCommitments RPC method
 * @name QueryUnreceivedPacketsResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUnreceivedPacketsResponse
 */
export interface QueryUnreceivedPacketsResponseSDKType {
    sequences: bigint[];
    height: HeightSDKType;
}
/**
 * QueryUnreceivedAcks is the request type for the
 * Query/UnreceivedAcks RPC method
 * @name QueryUnreceivedAcksRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUnreceivedAcksRequest
 */
export interface QueryUnreceivedAcksRequest {
    /**
     * port unique identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
    /**
     * list of acknowledgement sequences
     */
    packetAckSequences: bigint[];
}
export interface QueryUnreceivedAcksRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryUnreceivedAcksRequest';
    value: Uint8Array;
}
/**
 * QueryUnreceivedAcks is the request type for the
 * Query/UnreceivedAcks RPC method
 * @name QueryUnreceivedAcksRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUnreceivedAcksRequest
 */
export interface QueryUnreceivedAcksRequestSDKType {
    port_id: string;
    channel_id: string;
    packet_ack_sequences: bigint[];
}
/**
 * QueryUnreceivedAcksResponse is the response type for the
 * Query/UnreceivedAcks RPC method
 * @name QueryUnreceivedAcksResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUnreceivedAcksResponse
 */
export interface QueryUnreceivedAcksResponse {
    /**
     * list of unreceived acknowledgement sequences
     */
    sequences: bigint[];
    /**
     * query block height
     */
    height: Height;
}
export interface QueryUnreceivedAcksResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryUnreceivedAcksResponse';
    value: Uint8Array;
}
/**
 * QueryUnreceivedAcksResponse is the response type for the
 * Query/UnreceivedAcks RPC method
 * @name QueryUnreceivedAcksResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUnreceivedAcksResponse
 */
export interface QueryUnreceivedAcksResponseSDKType {
    sequences: bigint[];
    height: HeightSDKType;
}
/**
 * QueryNextSequenceReceiveRequest is the request type for the
 * Query/QueryNextSequenceReceiveRequest RPC method
 * @name QueryNextSequenceReceiveRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryNextSequenceReceiveRequest
 */
export interface QueryNextSequenceReceiveRequest {
    /**
     * port unique identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
}
export interface QueryNextSequenceReceiveRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryNextSequenceReceiveRequest';
    value: Uint8Array;
}
/**
 * QueryNextSequenceReceiveRequest is the request type for the
 * Query/QueryNextSequenceReceiveRequest RPC method
 * @name QueryNextSequenceReceiveRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryNextSequenceReceiveRequest
 */
export interface QueryNextSequenceReceiveRequestSDKType {
    port_id: string;
    channel_id: string;
}
/**
 * QuerySequenceResponse is the response type for the
 * Query/QueryNextSequenceReceiveResponse RPC method
 * @name QueryNextSequenceReceiveResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryNextSequenceReceiveResponse
 */
export interface QueryNextSequenceReceiveResponse {
    /**
     * next sequence receive number
     */
    nextSequenceReceive: bigint;
    /**
     * merkle proof of existence
     */
    proof: Uint8Array;
    /**
     * height at which the proof was retrieved
     */
    proofHeight: Height;
}
export interface QueryNextSequenceReceiveResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryNextSequenceReceiveResponse';
    value: Uint8Array;
}
/**
 * QuerySequenceResponse is the response type for the
 * Query/QueryNextSequenceReceiveResponse RPC method
 * @name QueryNextSequenceReceiveResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryNextSequenceReceiveResponse
 */
export interface QueryNextSequenceReceiveResponseSDKType {
    next_sequence_receive: bigint;
    proof: Uint8Array;
    proof_height: HeightSDKType;
}
/**
 * QueryNextSequenceSendRequest is the request type for the
 * Query/QueryNextSequenceSend RPC method
 * @name QueryNextSequenceSendRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryNextSequenceSendRequest
 */
export interface QueryNextSequenceSendRequest {
    /**
     * port unique identifier
     */
    portId: string;
    /**
     * channel unique identifier
     */
    channelId: string;
}
export interface QueryNextSequenceSendRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryNextSequenceSendRequest';
    value: Uint8Array;
}
/**
 * QueryNextSequenceSendRequest is the request type for the
 * Query/QueryNextSequenceSend RPC method
 * @name QueryNextSequenceSendRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryNextSequenceSendRequest
 */
export interface QueryNextSequenceSendRequestSDKType {
    port_id: string;
    channel_id: string;
}
/**
 * QueryNextSequenceSendResponse is the request type for the
 * Query/QueryNextSequenceSend RPC method
 * @name QueryNextSequenceSendResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryNextSequenceSendResponse
 */
export interface QueryNextSequenceSendResponse {
    /**
     * next sequence send number
     */
    nextSequenceSend: bigint;
    /**
     * merkle proof of existence
     */
    proof: Uint8Array;
    /**
     * height at which the proof was retrieved
     */
    proofHeight: Height;
}
export interface QueryNextSequenceSendResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryNextSequenceSendResponse';
    value: Uint8Array;
}
/**
 * QueryNextSequenceSendResponse is the request type for the
 * Query/QueryNextSequenceSend RPC method
 * @name QueryNextSequenceSendResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryNextSequenceSendResponse
 */
export interface QueryNextSequenceSendResponseSDKType {
    next_sequence_send: bigint;
    proof: Uint8Array;
    proof_height: HeightSDKType;
}
/**
 * QueryUpgradeErrorRequest is the request type for the Query/QueryUpgradeError RPC method
 * @name QueryUpgradeErrorRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUpgradeErrorRequest
 */
export interface QueryUpgradeErrorRequest {
    portId: string;
    channelId: string;
}
export interface QueryUpgradeErrorRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryUpgradeErrorRequest';
    value: Uint8Array;
}
/**
 * QueryUpgradeErrorRequest is the request type for the Query/QueryUpgradeError RPC method
 * @name QueryUpgradeErrorRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUpgradeErrorRequest
 */
export interface QueryUpgradeErrorRequestSDKType {
    port_id: string;
    channel_id: string;
}
/**
 * QueryUpgradeErrorResponse is the response type for the Query/QueryUpgradeError RPC method
 * @name QueryUpgradeErrorResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUpgradeErrorResponse
 */
export interface QueryUpgradeErrorResponse {
    errorReceipt: ErrorReceipt;
    /**
     * merkle proof of existence
     */
    proof: Uint8Array;
    /**
     * height at which the proof was retrieved
     */
    proofHeight: Height;
}
export interface QueryUpgradeErrorResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryUpgradeErrorResponse';
    value: Uint8Array;
}
/**
 * QueryUpgradeErrorResponse is the response type for the Query/QueryUpgradeError RPC method
 * @name QueryUpgradeErrorResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUpgradeErrorResponse
 */
export interface QueryUpgradeErrorResponseSDKType {
    error_receipt: ErrorReceiptSDKType;
    proof: Uint8Array;
    proof_height: HeightSDKType;
}
/**
 * QueryUpgradeRequest is the request type for the QueryUpgradeRequest RPC method
 * @name QueryUpgradeRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUpgradeRequest
 */
export interface QueryUpgradeRequest {
    portId: string;
    channelId: string;
}
export interface QueryUpgradeRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryUpgradeRequest';
    value: Uint8Array;
}
/**
 * QueryUpgradeRequest is the request type for the QueryUpgradeRequest RPC method
 * @name QueryUpgradeRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUpgradeRequest
 */
export interface QueryUpgradeRequestSDKType {
    port_id: string;
    channel_id: string;
}
/**
 * QueryUpgradeResponse is the response type for the QueryUpgradeResponse RPC method
 * @name QueryUpgradeResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUpgradeResponse
 */
export interface QueryUpgradeResponse {
    upgrade: Upgrade;
    /**
     * merkle proof of existence
     */
    proof: Uint8Array;
    /**
     * height at which the proof was retrieved
     */
    proofHeight: Height;
}
export interface QueryUpgradeResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryUpgradeResponse';
    value: Uint8Array;
}
/**
 * QueryUpgradeResponse is the response type for the QueryUpgradeResponse RPC method
 * @name QueryUpgradeResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUpgradeResponse
 */
export interface QueryUpgradeResponseSDKType {
    upgrade: UpgradeSDKType;
    proof: Uint8Array;
    proof_height: HeightSDKType;
}
/**
 * QueryChannelParamsRequest is the request type for the Query/ChannelParams RPC method.
 * @name QueryChannelParamsRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelParamsRequest
 */
export interface QueryChannelParamsRequest {
}
export interface QueryChannelParamsRequestProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryChannelParamsRequest';
    value: Uint8Array;
}
/**
 * QueryChannelParamsRequest is the request type for the Query/ChannelParams RPC method.
 * @name QueryChannelParamsRequestSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelParamsRequest
 */
export interface QueryChannelParamsRequestSDKType {
}
/**
 * QueryChannelParamsResponse is the response type for the Query/ChannelParams RPC method.
 * @name QueryChannelParamsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelParamsResponse
 */
export interface QueryChannelParamsResponse {
    /**
     * params defines the parameters of the module.
     */
    params?: Params;
}
export interface QueryChannelParamsResponseProtoMsg {
    typeUrl: '/ibc.core.channel.v1.QueryChannelParamsResponse';
    value: Uint8Array;
}
/**
 * QueryChannelParamsResponse is the response type for the Query/ChannelParams RPC method.
 * @name QueryChannelParamsResponseSDKType
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelParamsResponse
 */
export interface QueryChannelParamsResponseSDKType {
    params?: ParamsSDKType;
}
/**
 * QueryChannelRequest is the request type for the Query/Channel RPC method
 * @name QueryChannelRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelRequest
 */
export declare const QueryChannelRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryChannelRequest";
    aminoType: "cosmos-sdk/QueryChannelRequest";
    is(o: any): o is QueryChannelRequest;
    isSDK(o: any): o is QueryChannelRequestSDKType;
    encode(message: QueryChannelRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChannelRequest;
    fromJSON(object: any): QueryChannelRequest;
    toJSON(message: QueryChannelRequest): JsonSafe<QueryChannelRequest>;
    fromPartial(object: Partial<QueryChannelRequest>): QueryChannelRequest;
    fromProtoMsg(message: QueryChannelRequestProtoMsg): QueryChannelRequest;
    toProto(message: QueryChannelRequest): Uint8Array;
    toProtoMsg(message: QueryChannelRequest): QueryChannelRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryChannelResponse is the response type for the Query/Channel RPC method.
 * Besides the Channel end, it includes a proof and the height from which the
 * proof was retrieved.
 * @name QueryChannelResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelResponse
 */
export declare const QueryChannelResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryChannelResponse";
    aminoType: "cosmos-sdk/QueryChannelResponse";
    is(o: any): o is QueryChannelResponse;
    isSDK(o: any): o is QueryChannelResponseSDKType;
    encode(message: QueryChannelResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChannelResponse;
    fromJSON(object: any): QueryChannelResponse;
    toJSON(message: QueryChannelResponse): JsonSafe<QueryChannelResponse>;
    fromPartial(object: Partial<QueryChannelResponse>): QueryChannelResponse;
    fromProtoMsg(message: QueryChannelResponseProtoMsg): QueryChannelResponse;
    toProto(message: QueryChannelResponse): Uint8Array;
    toProtoMsg(message: QueryChannelResponse): QueryChannelResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryChannelsRequest is the request type for the Query/Channels RPC method
 * @name QueryChannelsRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelsRequest
 */
export declare const QueryChannelsRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryChannelsRequest";
    aminoType: "cosmos-sdk/QueryChannelsRequest";
    is(o: any): o is QueryChannelsRequest;
    isSDK(o: any): o is QueryChannelsRequestSDKType;
    encode(message: QueryChannelsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChannelsRequest;
    fromJSON(object: any): QueryChannelsRequest;
    toJSON(message: QueryChannelsRequest): JsonSafe<QueryChannelsRequest>;
    fromPartial(object: Partial<QueryChannelsRequest>): QueryChannelsRequest;
    fromProtoMsg(message: QueryChannelsRequestProtoMsg): QueryChannelsRequest;
    toProto(message: QueryChannelsRequest): Uint8Array;
    toProtoMsg(message: QueryChannelsRequest): QueryChannelsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryChannelsResponse is the response type for the Query/Channels RPC method.
 * @name QueryChannelsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelsResponse
 */
export declare const QueryChannelsResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryChannelsResponse";
    aminoType: "cosmos-sdk/QueryChannelsResponse";
    is(o: any): o is QueryChannelsResponse;
    isSDK(o: any): o is QueryChannelsResponseSDKType;
    encode(message: QueryChannelsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChannelsResponse;
    fromJSON(object: any): QueryChannelsResponse;
    toJSON(message: QueryChannelsResponse): JsonSafe<QueryChannelsResponse>;
    fromPartial(object: Partial<QueryChannelsResponse>): QueryChannelsResponse;
    fromProtoMsg(message: QueryChannelsResponseProtoMsg): QueryChannelsResponse;
    toProto(message: QueryChannelsResponse): Uint8Array;
    toProtoMsg(message: QueryChannelsResponse): QueryChannelsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryConnectionChannelsRequest is the request type for the
 * Query/QueryConnectionChannels RPC method
 * @name QueryConnectionChannelsRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryConnectionChannelsRequest
 */
export declare const QueryConnectionChannelsRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryConnectionChannelsRequest";
    aminoType: "cosmos-sdk/QueryConnectionChannelsRequest";
    is(o: any): o is QueryConnectionChannelsRequest;
    isSDK(o: any): o is QueryConnectionChannelsRequestSDKType;
    encode(message: QueryConnectionChannelsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryConnectionChannelsRequest;
    fromJSON(object: any): QueryConnectionChannelsRequest;
    toJSON(message: QueryConnectionChannelsRequest): JsonSafe<QueryConnectionChannelsRequest>;
    fromPartial(object: Partial<QueryConnectionChannelsRequest>): QueryConnectionChannelsRequest;
    fromProtoMsg(message: QueryConnectionChannelsRequestProtoMsg): QueryConnectionChannelsRequest;
    toProto(message: QueryConnectionChannelsRequest): Uint8Array;
    toProtoMsg(message: QueryConnectionChannelsRequest): QueryConnectionChannelsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryConnectionChannelsResponse is the Response type for the
 * Query/QueryConnectionChannels RPC method
 * @name QueryConnectionChannelsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryConnectionChannelsResponse
 */
export declare const QueryConnectionChannelsResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryConnectionChannelsResponse";
    aminoType: "cosmos-sdk/QueryConnectionChannelsResponse";
    is(o: any): o is QueryConnectionChannelsResponse;
    isSDK(o: any): o is QueryConnectionChannelsResponseSDKType;
    encode(message: QueryConnectionChannelsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryConnectionChannelsResponse;
    fromJSON(object: any): QueryConnectionChannelsResponse;
    toJSON(message: QueryConnectionChannelsResponse): JsonSafe<QueryConnectionChannelsResponse>;
    fromPartial(object: Partial<QueryConnectionChannelsResponse>): QueryConnectionChannelsResponse;
    fromProtoMsg(message: QueryConnectionChannelsResponseProtoMsg): QueryConnectionChannelsResponse;
    toProto(message: QueryConnectionChannelsResponse): Uint8Array;
    toProtoMsg(message: QueryConnectionChannelsResponse): QueryConnectionChannelsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryChannelClientStateRequest is the request type for the Query/ClientState
 * RPC method
 * @name QueryChannelClientStateRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelClientStateRequest
 */
export declare const QueryChannelClientStateRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryChannelClientStateRequest";
    aminoType: "cosmos-sdk/QueryChannelClientStateRequest";
    is(o: any): o is QueryChannelClientStateRequest;
    isSDK(o: any): o is QueryChannelClientStateRequestSDKType;
    encode(message: QueryChannelClientStateRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChannelClientStateRequest;
    fromJSON(object: any): QueryChannelClientStateRequest;
    toJSON(message: QueryChannelClientStateRequest): JsonSafe<QueryChannelClientStateRequest>;
    fromPartial(object: Partial<QueryChannelClientStateRequest>): QueryChannelClientStateRequest;
    fromProtoMsg(message: QueryChannelClientStateRequestProtoMsg): QueryChannelClientStateRequest;
    toProto(message: QueryChannelClientStateRequest): Uint8Array;
    toProtoMsg(message: QueryChannelClientStateRequest): QueryChannelClientStateRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryChannelClientStateResponse is the Response type for the
 * Query/QueryChannelClientState RPC method
 * @name QueryChannelClientStateResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelClientStateResponse
 */
export declare const QueryChannelClientStateResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryChannelClientStateResponse";
    aminoType: "cosmos-sdk/QueryChannelClientStateResponse";
    is(o: any): o is QueryChannelClientStateResponse;
    isSDK(o: any): o is QueryChannelClientStateResponseSDKType;
    encode(message: QueryChannelClientStateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChannelClientStateResponse;
    fromJSON(object: any): QueryChannelClientStateResponse;
    toJSON(message: QueryChannelClientStateResponse): JsonSafe<QueryChannelClientStateResponse>;
    fromPartial(object: Partial<QueryChannelClientStateResponse>): QueryChannelClientStateResponse;
    fromProtoMsg(message: QueryChannelClientStateResponseProtoMsg): QueryChannelClientStateResponse;
    toProto(message: QueryChannelClientStateResponse): Uint8Array;
    toProtoMsg(message: QueryChannelClientStateResponse): QueryChannelClientStateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryChannelConsensusStateRequest is the request type for the
 * Query/ConsensusState RPC method
 * @name QueryChannelConsensusStateRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelConsensusStateRequest
 */
export declare const QueryChannelConsensusStateRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryChannelConsensusStateRequest";
    aminoType: "cosmos-sdk/QueryChannelConsensusStateRequest";
    is(o: any): o is QueryChannelConsensusStateRequest;
    isSDK(o: any): o is QueryChannelConsensusStateRequestSDKType;
    encode(message: QueryChannelConsensusStateRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChannelConsensusStateRequest;
    fromJSON(object: any): QueryChannelConsensusStateRequest;
    toJSON(message: QueryChannelConsensusStateRequest): JsonSafe<QueryChannelConsensusStateRequest>;
    fromPartial(object: Partial<QueryChannelConsensusStateRequest>): QueryChannelConsensusStateRequest;
    fromProtoMsg(message: QueryChannelConsensusStateRequestProtoMsg): QueryChannelConsensusStateRequest;
    toProto(message: QueryChannelConsensusStateRequest): Uint8Array;
    toProtoMsg(message: QueryChannelConsensusStateRequest): QueryChannelConsensusStateRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryChannelClientStateResponse is the Response type for the
 * Query/QueryChannelClientState RPC method
 * @name QueryChannelConsensusStateResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelConsensusStateResponse
 */
export declare const QueryChannelConsensusStateResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryChannelConsensusStateResponse";
    aminoType: "cosmos-sdk/QueryChannelConsensusStateResponse";
    is(o: any): o is QueryChannelConsensusStateResponse;
    isSDK(o: any): o is QueryChannelConsensusStateResponseSDKType;
    encode(message: QueryChannelConsensusStateResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChannelConsensusStateResponse;
    fromJSON(object: any): QueryChannelConsensusStateResponse;
    toJSON(message: QueryChannelConsensusStateResponse): JsonSafe<QueryChannelConsensusStateResponse>;
    fromPartial(object: Partial<QueryChannelConsensusStateResponse>): QueryChannelConsensusStateResponse;
    fromProtoMsg(message: QueryChannelConsensusStateResponseProtoMsg): QueryChannelConsensusStateResponse;
    toProto(message: QueryChannelConsensusStateResponse): Uint8Array;
    toProtoMsg(message: QueryChannelConsensusStateResponse): QueryChannelConsensusStateResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPacketCommitmentRequest is the request type for the
 * Query/PacketCommitment RPC method
 * @name QueryPacketCommitmentRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketCommitmentRequest
 */
export declare const QueryPacketCommitmentRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryPacketCommitmentRequest";
    aminoType: "cosmos-sdk/QueryPacketCommitmentRequest";
    is(o: any): o is QueryPacketCommitmentRequest;
    isSDK(o: any): o is QueryPacketCommitmentRequestSDKType;
    encode(message: QueryPacketCommitmentRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryPacketCommitmentRequest;
    fromJSON(object: any): QueryPacketCommitmentRequest;
    toJSON(message: QueryPacketCommitmentRequest): JsonSafe<QueryPacketCommitmentRequest>;
    fromPartial(object: Partial<QueryPacketCommitmentRequest>): QueryPacketCommitmentRequest;
    fromProtoMsg(message: QueryPacketCommitmentRequestProtoMsg): QueryPacketCommitmentRequest;
    toProto(message: QueryPacketCommitmentRequest): Uint8Array;
    toProtoMsg(message: QueryPacketCommitmentRequest): QueryPacketCommitmentRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPacketCommitmentResponse defines the client query response for a packet
 * which also includes a proof and the height from which the proof was
 * retrieved
 * @name QueryPacketCommitmentResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketCommitmentResponse
 */
export declare const QueryPacketCommitmentResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryPacketCommitmentResponse";
    aminoType: "cosmos-sdk/QueryPacketCommitmentResponse";
    is(o: any): o is QueryPacketCommitmentResponse;
    isSDK(o: any): o is QueryPacketCommitmentResponseSDKType;
    encode(message: QueryPacketCommitmentResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryPacketCommitmentResponse;
    fromJSON(object: any): QueryPacketCommitmentResponse;
    toJSON(message: QueryPacketCommitmentResponse): JsonSafe<QueryPacketCommitmentResponse>;
    fromPartial(object: Partial<QueryPacketCommitmentResponse>): QueryPacketCommitmentResponse;
    fromProtoMsg(message: QueryPacketCommitmentResponseProtoMsg): QueryPacketCommitmentResponse;
    toProto(message: QueryPacketCommitmentResponse): Uint8Array;
    toProtoMsg(message: QueryPacketCommitmentResponse): QueryPacketCommitmentResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPacketCommitmentsRequest is the request type for the
 * Query/QueryPacketCommitments RPC method
 * @name QueryPacketCommitmentsRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketCommitmentsRequest
 */
export declare const QueryPacketCommitmentsRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryPacketCommitmentsRequest";
    aminoType: "cosmos-sdk/QueryPacketCommitmentsRequest";
    is(o: any): o is QueryPacketCommitmentsRequest;
    isSDK(o: any): o is QueryPacketCommitmentsRequestSDKType;
    encode(message: QueryPacketCommitmentsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryPacketCommitmentsRequest;
    fromJSON(object: any): QueryPacketCommitmentsRequest;
    toJSON(message: QueryPacketCommitmentsRequest): JsonSafe<QueryPacketCommitmentsRequest>;
    fromPartial(object: Partial<QueryPacketCommitmentsRequest>): QueryPacketCommitmentsRequest;
    fromProtoMsg(message: QueryPacketCommitmentsRequestProtoMsg): QueryPacketCommitmentsRequest;
    toProto(message: QueryPacketCommitmentsRequest): Uint8Array;
    toProtoMsg(message: QueryPacketCommitmentsRequest): QueryPacketCommitmentsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPacketCommitmentsResponse is the request type for the
 * Query/QueryPacketCommitments RPC method
 * @name QueryPacketCommitmentsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketCommitmentsResponse
 */
export declare const QueryPacketCommitmentsResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryPacketCommitmentsResponse";
    aminoType: "cosmos-sdk/QueryPacketCommitmentsResponse";
    is(o: any): o is QueryPacketCommitmentsResponse;
    isSDK(o: any): o is QueryPacketCommitmentsResponseSDKType;
    encode(message: QueryPacketCommitmentsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryPacketCommitmentsResponse;
    fromJSON(object: any): QueryPacketCommitmentsResponse;
    toJSON(message: QueryPacketCommitmentsResponse): JsonSafe<QueryPacketCommitmentsResponse>;
    fromPartial(object: Partial<QueryPacketCommitmentsResponse>): QueryPacketCommitmentsResponse;
    fromProtoMsg(message: QueryPacketCommitmentsResponseProtoMsg): QueryPacketCommitmentsResponse;
    toProto(message: QueryPacketCommitmentsResponse): Uint8Array;
    toProtoMsg(message: QueryPacketCommitmentsResponse): QueryPacketCommitmentsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPacketReceiptRequest is the request type for the
 * Query/PacketReceipt RPC method
 * @name QueryPacketReceiptRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketReceiptRequest
 */
export declare const QueryPacketReceiptRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryPacketReceiptRequest";
    aminoType: "cosmos-sdk/QueryPacketReceiptRequest";
    is(o: any): o is QueryPacketReceiptRequest;
    isSDK(o: any): o is QueryPacketReceiptRequestSDKType;
    encode(message: QueryPacketReceiptRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryPacketReceiptRequest;
    fromJSON(object: any): QueryPacketReceiptRequest;
    toJSON(message: QueryPacketReceiptRequest): JsonSafe<QueryPacketReceiptRequest>;
    fromPartial(object: Partial<QueryPacketReceiptRequest>): QueryPacketReceiptRequest;
    fromProtoMsg(message: QueryPacketReceiptRequestProtoMsg): QueryPacketReceiptRequest;
    toProto(message: QueryPacketReceiptRequest): Uint8Array;
    toProtoMsg(message: QueryPacketReceiptRequest): QueryPacketReceiptRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPacketReceiptResponse defines the client query response for a packet
 * receipt which also includes a proof, and the height from which the proof was
 * retrieved
 * @name QueryPacketReceiptResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketReceiptResponse
 */
export declare const QueryPacketReceiptResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryPacketReceiptResponse";
    aminoType: "cosmos-sdk/QueryPacketReceiptResponse";
    is(o: any): o is QueryPacketReceiptResponse;
    isSDK(o: any): o is QueryPacketReceiptResponseSDKType;
    encode(message: QueryPacketReceiptResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryPacketReceiptResponse;
    fromJSON(object: any): QueryPacketReceiptResponse;
    toJSON(message: QueryPacketReceiptResponse): JsonSafe<QueryPacketReceiptResponse>;
    fromPartial(object: Partial<QueryPacketReceiptResponse>): QueryPacketReceiptResponse;
    fromProtoMsg(message: QueryPacketReceiptResponseProtoMsg): QueryPacketReceiptResponse;
    toProto(message: QueryPacketReceiptResponse): Uint8Array;
    toProtoMsg(message: QueryPacketReceiptResponse): QueryPacketReceiptResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPacketAcknowledgementRequest is the request type for the
 * Query/PacketAcknowledgement RPC method
 * @name QueryPacketAcknowledgementRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketAcknowledgementRequest
 */
export declare const QueryPacketAcknowledgementRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryPacketAcknowledgementRequest";
    aminoType: "cosmos-sdk/QueryPacketAcknowledgementRequest";
    is(o: any): o is QueryPacketAcknowledgementRequest;
    isSDK(o: any): o is QueryPacketAcknowledgementRequestSDKType;
    encode(message: QueryPacketAcknowledgementRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryPacketAcknowledgementRequest;
    fromJSON(object: any): QueryPacketAcknowledgementRequest;
    toJSON(message: QueryPacketAcknowledgementRequest): JsonSafe<QueryPacketAcknowledgementRequest>;
    fromPartial(object: Partial<QueryPacketAcknowledgementRequest>): QueryPacketAcknowledgementRequest;
    fromProtoMsg(message: QueryPacketAcknowledgementRequestProtoMsg): QueryPacketAcknowledgementRequest;
    toProto(message: QueryPacketAcknowledgementRequest): Uint8Array;
    toProtoMsg(message: QueryPacketAcknowledgementRequest): QueryPacketAcknowledgementRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPacketAcknowledgementResponse defines the client query response for a
 * packet which also includes a proof and the height from which the
 * proof was retrieved
 * @name QueryPacketAcknowledgementResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketAcknowledgementResponse
 */
export declare const QueryPacketAcknowledgementResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryPacketAcknowledgementResponse";
    aminoType: "cosmos-sdk/QueryPacketAcknowledgementResponse";
    is(o: any): o is QueryPacketAcknowledgementResponse;
    isSDK(o: any): o is QueryPacketAcknowledgementResponseSDKType;
    encode(message: QueryPacketAcknowledgementResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryPacketAcknowledgementResponse;
    fromJSON(object: any): QueryPacketAcknowledgementResponse;
    toJSON(message: QueryPacketAcknowledgementResponse): JsonSafe<QueryPacketAcknowledgementResponse>;
    fromPartial(object: Partial<QueryPacketAcknowledgementResponse>): QueryPacketAcknowledgementResponse;
    fromProtoMsg(message: QueryPacketAcknowledgementResponseProtoMsg): QueryPacketAcknowledgementResponse;
    toProto(message: QueryPacketAcknowledgementResponse): Uint8Array;
    toProtoMsg(message: QueryPacketAcknowledgementResponse): QueryPacketAcknowledgementResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPacketAcknowledgementsRequest is the request type for the
 * Query/QueryPacketCommitments RPC method
 * @name QueryPacketAcknowledgementsRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketAcknowledgementsRequest
 */
export declare const QueryPacketAcknowledgementsRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryPacketAcknowledgementsRequest";
    aminoType: "cosmos-sdk/QueryPacketAcknowledgementsRequest";
    is(o: any): o is QueryPacketAcknowledgementsRequest;
    isSDK(o: any): o is QueryPacketAcknowledgementsRequestSDKType;
    encode(message: QueryPacketAcknowledgementsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryPacketAcknowledgementsRequest;
    fromJSON(object: any): QueryPacketAcknowledgementsRequest;
    toJSON(message: QueryPacketAcknowledgementsRequest): JsonSafe<QueryPacketAcknowledgementsRequest>;
    fromPartial(object: Partial<QueryPacketAcknowledgementsRequest>): QueryPacketAcknowledgementsRequest;
    fromProtoMsg(message: QueryPacketAcknowledgementsRequestProtoMsg): QueryPacketAcknowledgementsRequest;
    toProto(message: QueryPacketAcknowledgementsRequest): Uint8Array;
    toProtoMsg(message: QueryPacketAcknowledgementsRequest): QueryPacketAcknowledgementsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryPacketAcknowledgemetsResponse is the request type for the
 * Query/QueryPacketAcknowledgements RPC method
 * @name QueryPacketAcknowledgementsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryPacketAcknowledgementsResponse
 */
export declare const QueryPacketAcknowledgementsResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryPacketAcknowledgementsResponse";
    aminoType: "cosmos-sdk/QueryPacketAcknowledgementsResponse";
    is(o: any): o is QueryPacketAcknowledgementsResponse;
    isSDK(o: any): o is QueryPacketAcknowledgementsResponseSDKType;
    encode(message: QueryPacketAcknowledgementsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryPacketAcknowledgementsResponse;
    fromJSON(object: any): QueryPacketAcknowledgementsResponse;
    toJSON(message: QueryPacketAcknowledgementsResponse): JsonSafe<QueryPacketAcknowledgementsResponse>;
    fromPartial(object: Partial<QueryPacketAcknowledgementsResponse>): QueryPacketAcknowledgementsResponse;
    fromProtoMsg(message: QueryPacketAcknowledgementsResponseProtoMsg): QueryPacketAcknowledgementsResponse;
    toProto(message: QueryPacketAcknowledgementsResponse): Uint8Array;
    toProtoMsg(message: QueryPacketAcknowledgementsResponse): QueryPacketAcknowledgementsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUnreceivedPacketsRequest is the request type for the
 * Query/UnreceivedPackets RPC method
 * @name QueryUnreceivedPacketsRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUnreceivedPacketsRequest
 */
export declare const QueryUnreceivedPacketsRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryUnreceivedPacketsRequest";
    aminoType: "cosmos-sdk/QueryUnreceivedPacketsRequest";
    is(o: any): o is QueryUnreceivedPacketsRequest;
    isSDK(o: any): o is QueryUnreceivedPacketsRequestSDKType;
    encode(message: QueryUnreceivedPacketsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUnreceivedPacketsRequest;
    fromJSON(object: any): QueryUnreceivedPacketsRequest;
    toJSON(message: QueryUnreceivedPacketsRequest): JsonSafe<QueryUnreceivedPacketsRequest>;
    fromPartial(object: Partial<QueryUnreceivedPacketsRequest>): QueryUnreceivedPacketsRequest;
    fromProtoMsg(message: QueryUnreceivedPacketsRequestProtoMsg): QueryUnreceivedPacketsRequest;
    toProto(message: QueryUnreceivedPacketsRequest): Uint8Array;
    toProtoMsg(message: QueryUnreceivedPacketsRequest): QueryUnreceivedPacketsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUnreceivedPacketsResponse is the response type for the
 * Query/UnreceivedPacketCommitments RPC method
 * @name QueryUnreceivedPacketsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUnreceivedPacketsResponse
 */
export declare const QueryUnreceivedPacketsResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryUnreceivedPacketsResponse";
    aminoType: "cosmos-sdk/QueryUnreceivedPacketsResponse";
    is(o: any): o is QueryUnreceivedPacketsResponse;
    isSDK(o: any): o is QueryUnreceivedPacketsResponseSDKType;
    encode(message: QueryUnreceivedPacketsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUnreceivedPacketsResponse;
    fromJSON(object: any): QueryUnreceivedPacketsResponse;
    toJSON(message: QueryUnreceivedPacketsResponse): JsonSafe<QueryUnreceivedPacketsResponse>;
    fromPartial(object: Partial<QueryUnreceivedPacketsResponse>): QueryUnreceivedPacketsResponse;
    fromProtoMsg(message: QueryUnreceivedPacketsResponseProtoMsg): QueryUnreceivedPacketsResponse;
    toProto(message: QueryUnreceivedPacketsResponse): Uint8Array;
    toProtoMsg(message: QueryUnreceivedPacketsResponse): QueryUnreceivedPacketsResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUnreceivedAcks is the request type for the
 * Query/UnreceivedAcks RPC method
 * @name QueryUnreceivedAcksRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUnreceivedAcksRequest
 */
export declare const QueryUnreceivedAcksRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryUnreceivedAcksRequest";
    aminoType: "cosmos-sdk/QueryUnreceivedAcksRequest";
    is(o: any): o is QueryUnreceivedAcksRequest;
    isSDK(o: any): o is QueryUnreceivedAcksRequestSDKType;
    encode(message: QueryUnreceivedAcksRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUnreceivedAcksRequest;
    fromJSON(object: any): QueryUnreceivedAcksRequest;
    toJSON(message: QueryUnreceivedAcksRequest): JsonSafe<QueryUnreceivedAcksRequest>;
    fromPartial(object: Partial<QueryUnreceivedAcksRequest>): QueryUnreceivedAcksRequest;
    fromProtoMsg(message: QueryUnreceivedAcksRequestProtoMsg): QueryUnreceivedAcksRequest;
    toProto(message: QueryUnreceivedAcksRequest): Uint8Array;
    toProtoMsg(message: QueryUnreceivedAcksRequest): QueryUnreceivedAcksRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUnreceivedAcksResponse is the response type for the
 * Query/UnreceivedAcks RPC method
 * @name QueryUnreceivedAcksResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUnreceivedAcksResponse
 */
export declare const QueryUnreceivedAcksResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryUnreceivedAcksResponse";
    aminoType: "cosmos-sdk/QueryUnreceivedAcksResponse";
    is(o: any): o is QueryUnreceivedAcksResponse;
    isSDK(o: any): o is QueryUnreceivedAcksResponseSDKType;
    encode(message: QueryUnreceivedAcksResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUnreceivedAcksResponse;
    fromJSON(object: any): QueryUnreceivedAcksResponse;
    toJSON(message: QueryUnreceivedAcksResponse): JsonSafe<QueryUnreceivedAcksResponse>;
    fromPartial(object: Partial<QueryUnreceivedAcksResponse>): QueryUnreceivedAcksResponse;
    fromProtoMsg(message: QueryUnreceivedAcksResponseProtoMsg): QueryUnreceivedAcksResponse;
    toProto(message: QueryUnreceivedAcksResponse): Uint8Array;
    toProtoMsg(message: QueryUnreceivedAcksResponse): QueryUnreceivedAcksResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryNextSequenceReceiveRequest is the request type for the
 * Query/QueryNextSequenceReceiveRequest RPC method
 * @name QueryNextSequenceReceiveRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryNextSequenceReceiveRequest
 */
export declare const QueryNextSequenceReceiveRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryNextSequenceReceiveRequest";
    aminoType: "cosmos-sdk/QueryNextSequenceReceiveRequest";
    is(o: any): o is QueryNextSequenceReceiveRequest;
    isSDK(o: any): o is QueryNextSequenceReceiveRequestSDKType;
    encode(message: QueryNextSequenceReceiveRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryNextSequenceReceiveRequest;
    fromJSON(object: any): QueryNextSequenceReceiveRequest;
    toJSON(message: QueryNextSequenceReceiveRequest): JsonSafe<QueryNextSequenceReceiveRequest>;
    fromPartial(object: Partial<QueryNextSequenceReceiveRequest>): QueryNextSequenceReceiveRequest;
    fromProtoMsg(message: QueryNextSequenceReceiveRequestProtoMsg): QueryNextSequenceReceiveRequest;
    toProto(message: QueryNextSequenceReceiveRequest): Uint8Array;
    toProtoMsg(message: QueryNextSequenceReceiveRequest): QueryNextSequenceReceiveRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QuerySequenceResponse is the response type for the
 * Query/QueryNextSequenceReceiveResponse RPC method
 * @name QueryNextSequenceReceiveResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryNextSequenceReceiveResponse
 */
export declare const QueryNextSequenceReceiveResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryNextSequenceReceiveResponse";
    aminoType: "cosmos-sdk/QueryNextSequenceReceiveResponse";
    is(o: any): o is QueryNextSequenceReceiveResponse;
    isSDK(o: any): o is QueryNextSequenceReceiveResponseSDKType;
    encode(message: QueryNextSequenceReceiveResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryNextSequenceReceiveResponse;
    fromJSON(object: any): QueryNextSequenceReceiveResponse;
    toJSON(message: QueryNextSequenceReceiveResponse): JsonSafe<QueryNextSequenceReceiveResponse>;
    fromPartial(object: Partial<QueryNextSequenceReceiveResponse>): QueryNextSequenceReceiveResponse;
    fromProtoMsg(message: QueryNextSequenceReceiveResponseProtoMsg): QueryNextSequenceReceiveResponse;
    toProto(message: QueryNextSequenceReceiveResponse): Uint8Array;
    toProtoMsg(message: QueryNextSequenceReceiveResponse): QueryNextSequenceReceiveResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryNextSequenceSendRequest is the request type for the
 * Query/QueryNextSequenceSend RPC method
 * @name QueryNextSequenceSendRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryNextSequenceSendRequest
 */
export declare const QueryNextSequenceSendRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryNextSequenceSendRequest";
    aminoType: "cosmos-sdk/QueryNextSequenceSendRequest";
    is(o: any): o is QueryNextSequenceSendRequest;
    isSDK(o: any): o is QueryNextSequenceSendRequestSDKType;
    encode(message: QueryNextSequenceSendRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryNextSequenceSendRequest;
    fromJSON(object: any): QueryNextSequenceSendRequest;
    toJSON(message: QueryNextSequenceSendRequest): JsonSafe<QueryNextSequenceSendRequest>;
    fromPartial(object: Partial<QueryNextSequenceSendRequest>): QueryNextSequenceSendRequest;
    fromProtoMsg(message: QueryNextSequenceSendRequestProtoMsg): QueryNextSequenceSendRequest;
    toProto(message: QueryNextSequenceSendRequest): Uint8Array;
    toProtoMsg(message: QueryNextSequenceSendRequest): QueryNextSequenceSendRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryNextSequenceSendResponse is the request type for the
 * Query/QueryNextSequenceSend RPC method
 * @name QueryNextSequenceSendResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryNextSequenceSendResponse
 */
export declare const QueryNextSequenceSendResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryNextSequenceSendResponse";
    aminoType: "cosmos-sdk/QueryNextSequenceSendResponse";
    is(o: any): o is QueryNextSequenceSendResponse;
    isSDK(o: any): o is QueryNextSequenceSendResponseSDKType;
    encode(message: QueryNextSequenceSendResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryNextSequenceSendResponse;
    fromJSON(object: any): QueryNextSequenceSendResponse;
    toJSON(message: QueryNextSequenceSendResponse): JsonSafe<QueryNextSequenceSendResponse>;
    fromPartial(object: Partial<QueryNextSequenceSendResponse>): QueryNextSequenceSendResponse;
    fromProtoMsg(message: QueryNextSequenceSendResponseProtoMsg): QueryNextSequenceSendResponse;
    toProto(message: QueryNextSequenceSendResponse): Uint8Array;
    toProtoMsg(message: QueryNextSequenceSendResponse): QueryNextSequenceSendResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUpgradeErrorRequest is the request type for the Query/QueryUpgradeError RPC method
 * @name QueryUpgradeErrorRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUpgradeErrorRequest
 */
export declare const QueryUpgradeErrorRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryUpgradeErrorRequest";
    aminoType: "cosmos-sdk/QueryUpgradeErrorRequest";
    is(o: any): o is QueryUpgradeErrorRequest;
    isSDK(o: any): o is QueryUpgradeErrorRequestSDKType;
    encode(message: QueryUpgradeErrorRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUpgradeErrorRequest;
    fromJSON(object: any): QueryUpgradeErrorRequest;
    toJSON(message: QueryUpgradeErrorRequest): JsonSafe<QueryUpgradeErrorRequest>;
    fromPartial(object: Partial<QueryUpgradeErrorRequest>): QueryUpgradeErrorRequest;
    fromProtoMsg(message: QueryUpgradeErrorRequestProtoMsg): QueryUpgradeErrorRequest;
    toProto(message: QueryUpgradeErrorRequest): Uint8Array;
    toProtoMsg(message: QueryUpgradeErrorRequest): QueryUpgradeErrorRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUpgradeErrorResponse is the response type for the Query/QueryUpgradeError RPC method
 * @name QueryUpgradeErrorResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUpgradeErrorResponse
 */
export declare const QueryUpgradeErrorResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryUpgradeErrorResponse";
    aminoType: "cosmos-sdk/QueryUpgradeErrorResponse";
    is(o: any): o is QueryUpgradeErrorResponse;
    isSDK(o: any): o is QueryUpgradeErrorResponseSDKType;
    encode(message: QueryUpgradeErrorResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUpgradeErrorResponse;
    fromJSON(object: any): QueryUpgradeErrorResponse;
    toJSON(message: QueryUpgradeErrorResponse): JsonSafe<QueryUpgradeErrorResponse>;
    fromPartial(object: Partial<QueryUpgradeErrorResponse>): QueryUpgradeErrorResponse;
    fromProtoMsg(message: QueryUpgradeErrorResponseProtoMsg): QueryUpgradeErrorResponse;
    toProto(message: QueryUpgradeErrorResponse): Uint8Array;
    toProtoMsg(message: QueryUpgradeErrorResponse): QueryUpgradeErrorResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUpgradeRequest is the request type for the QueryUpgradeRequest RPC method
 * @name QueryUpgradeRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUpgradeRequest
 */
export declare const QueryUpgradeRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryUpgradeRequest";
    aminoType: "cosmos-sdk/QueryUpgradeRequest";
    is(o: any): o is QueryUpgradeRequest;
    isSDK(o: any): o is QueryUpgradeRequestSDKType;
    encode(message: QueryUpgradeRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUpgradeRequest;
    fromJSON(object: any): QueryUpgradeRequest;
    toJSON(message: QueryUpgradeRequest): JsonSafe<QueryUpgradeRequest>;
    fromPartial(object: Partial<QueryUpgradeRequest>): QueryUpgradeRequest;
    fromProtoMsg(message: QueryUpgradeRequestProtoMsg): QueryUpgradeRequest;
    toProto(message: QueryUpgradeRequest): Uint8Array;
    toProtoMsg(message: QueryUpgradeRequest): QueryUpgradeRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryUpgradeResponse is the response type for the QueryUpgradeResponse RPC method
 * @name QueryUpgradeResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryUpgradeResponse
 */
export declare const QueryUpgradeResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryUpgradeResponse";
    aminoType: "cosmos-sdk/QueryUpgradeResponse";
    is(o: any): o is QueryUpgradeResponse;
    isSDK(o: any): o is QueryUpgradeResponseSDKType;
    encode(message: QueryUpgradeResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryUpgradeResponse;
    fromJSON(object: any): QueryUpgradeResponse;
    toJSON(message: QueryUpgradeResponse): JsonSafe<QueryUpgradeResponse>;
    fromPartial(object: Partial<QueryUpgradeResponse>): QueryUpgradeResponse;
    fromProtoMsg(message: QueryUpgradeResponseProtoMsg): QueryUpgradeResponse;
    toProto(message: QueryUpgradeResponse): Uint8Array;
    toProtoMsg(message: QueryUpgradeResponse): QueryUpgradeResponseProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryChannelParamsRequest is the request type for the Query/ChannelParams RPC method.
 * @name QueryChannelParamsRequest
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelParamsRequest
 */
export declare const QueryChannelParamsRequest: {
    typeUrl: "/ibc.core.channel.v1.QueryChannelParamsRequest";
    aminoType: "cosmos-sdk/QueryChannelParamsRequest";
    is(o: any): o is QueryChannelParamsRequest;
    isSDK(o: any): o is QueryChannelParamsRequestSDKType;
    encode(_: QueryChannelParamsRequest, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChannelParamsRequest;
    fromJSON(_: any): QueryChannelParamsRequest;
    toJSON(_: QueryChannelParamsRequest): JsonSafe<QueryChannelParamsRequest>;
    fromPartial(_: Partial<QueryChannelParamsRequest>): QueryChannelParamsRequest;
    fromProtoMsg(message: QueryChannelParamsRequestProtoMsg): QueryChannelParamsRequest;
    toProto(message: QueryChannelParamsRequest): Uint8Array;
    toProtoMsg(message: QueryChannelParamsRequest): QueryChannelParamsRequestProtoMsg;
    registerTypeUrl(): void;
};
/**
 * QueryChannelParamsResponse is the response type for the Query/ChannelParams RPC method.
 * @name QueryChannelParamsResponse
 * @package ibc.core.channel.v1
 * @see proto type: ibc.core.channel.v1.QueryChannelParamsResponse
 */
export declare const QueryChannelParamsResponse: {
    typeUrl: "/ibc.core.channel.v1.QueryChannelParamsResponse";
    aminoType: "cosmos-sdk/QueryChannelParamsResponse";
    is(o: any): o is QueryChannelParamsResponse;
    isSDK(o: any): o is QueryChannelParamsResponseSDKType;
    encode(message: QueryChannelParamsResponse, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): QueryChannelParamsResponse;
    fromJSON(object: any): QueryChannelParamsResponse;
    toJSON(message: QueryChannelParamsResponse): JsonSafe<QueryChannelParamsResponse>;
    fromPartial(object: Partial<QueryChannelParamsResponse>): QueryChannelParamsResponse;
    fromProtoMsg(message: QueryChannelParamsResponseProtoMsg): QueryChannelParamsResponse;
    toProto(message: QueryChannelParamsResponse): Uint8Array;
    toProtoMsg(message: QueryChannelParamsResponse): QueryChannelParamsResponseProtoMsg;
    registerTypeUrl(): void;
};
//# sourceMappingURL=query.d.ts.map