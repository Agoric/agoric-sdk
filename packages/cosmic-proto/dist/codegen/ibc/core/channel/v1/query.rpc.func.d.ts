import { QueryChannelRequest, QueryChannelResponse, QueryChannelsRequest, QueryChannelsResponse, QueryConnectionChannelsRequest, QueryConnectionChannelsResponse, QueryChannelClientStateRequest, QueryChannelClientStateResponse, QueryChannelConsensusStateRequest, QueryChannelConsensusStateResponse, QueryPacketCommitmentRequest, QueryPacketCommitmentResponse, QueryPacketCommitmentsRequest, QueryPacketCommitmentsResponse, QueryPacketReceiptRequest, QueryPacketReceiptResponse, QueryPacketAcknowledgementRequest, QueryPacketAcknowledgementResponse, QueryPacketAcknowledgementsRequest, QueryPacketAcknowledgementsResponse, QueryUnreceivedPacketsRequest, QueryUnreceivedPacketsResponse, QueryUnreceivedAcksRequest, QueryUnreceivedAcksResponse, QueryNextSequenceReceiveRequest, QueryNextSequenceReceiveResponse, QueryNextSequenceSendRequest, QueryNextSequenceSendResponse, QueryUpgradeErrorRequest, QueryUpgradeErrorResponse, QueryUpgradeRequest, QueryUpgradeResponse, QueryChannelParamsRequest, QueryChannelParamsResponse } from './query.js';
/**
 * Channel queries an IBC Channel.
 * @name getChannel
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.Channel
 */
export declare const getChannel: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryChannelRequest) => Promise<QueryChannelResponse>;
/**
 * Channels queries all the IBC channels of a chain.
 * @name getChannels
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.Channels
 */
export declare const getChannels: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryChannelsRequest) => Promise<QueryChannelsResponse>;
/**
 * ConnectionChannels queries all the channels associated with a connection
 * end.
 * @name getConnectionChannels
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ConnectionChannels
 */
export declare const getConnectionChannels: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryConnectionChannelsRequest) => Promise<QueryConnectionChannelsResponse>;
/**
 * ChannelClientState queries for the client state for the channel associated
 * with the provided channel identifiers.
 * @name getChannelClientState
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelClientState
 */
export declare const getChannelClientState: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryChannelClientStateRequest) => Promise<QueryChannelClientStateResponse>;
/**
 * ChannelConsensusState queries for the consensus state for the channel
 * associated with the provided channel identifiers.
 * @name getChannelConsensusState
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelConsensusState
 */
export declare const getChannelConsensusState: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryChannelConsensusStateRequest) => Promise<QueryChannelConsensusStateResponse>;
/**
 * PacketCommitment queries a stored packet commitment hash.
 * @name getPacketCommitment
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PacketCommitment
 */
export declare const getPacketCommitment: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryPacketCommitmentRequest) => Promise<QueryPacketCommitmentResponse>;
/**
 * PacketCommitments returns all the packet commitments hashes associated
 * with a channel.
 * @name getPacketCommitments
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PacketCommitments
 */
export declare const getPacketCommitments: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryPacketCommitmentsRequest) => Promise<QueryPacketCommitmentsResponse>;
/**
 * PacketReceipt queries if a given packet sequence has been received on the
 * queried chain
 * @name getPacketReceipt
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PacketReceipt
 */
export declare const getPacketReceipt: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryPacketReceiptRequest) => Promise<QueryPacketReceiptResponse>;
/**
 * PacketAcknowledgement queries a stored packet acknowledgement hash.
 * @name getPacketAcknowledgement
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PacketAcknowledgement
 */
export declare const getPacketAcknowledgement: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryPacketAcknowledgementRequest) => Promise<QueryPacketAcknowledgementResponse>;
/**
 * PacketAcknowledgements returns all the packet acknowledgements associated
 * with a channel.
 * @name getPacketAcknowledgements
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PacketAcknowledgements
 */
export declare const getPacketAcknowledgements: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryPacketAcknowledgementsRequest) => Promise<QueryPacketAcknowledgementsResponse>;
/**
 * UnreceivedPackets returns all the unreceived IBC packets associated with a
 * channel and sequences.
 * @name getUnreceivedPackets
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.UnreceivedPackets
 */
export declare const getUnreceivedPackets: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryUnreceivedPacketsRequest) => Promise<QueryUnreceivedPacketsResponse>;
/**
 * UnreceivedAcks returns all the unreceived IBC acknowledgements associated
 * with a channel and sequences.
 * @name getUnreceivedAcks
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.UnreceivedAcks
 */
export declare const getUnreceivedAcks: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryUnreceivedAcksRequest) => Promise<QueryUnreceivedAcksResponse>;
/**
 * NextSequenceReceive returns the next receive sequence for a given channel.
 * @name getNextSequenceReceive
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.NextSequenceReceive
 */
export declare const getNextSequenceReceive: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryNextSequenceReceiveRequest) => Promise<QueryNextSequenceReceiveResponse>;
/**
 * NextSequenceSend returns the next send sequence for a given channel.
 * @name getNextSequenceSend
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.NextSequenceSend
 */
export declare const getNextSequenceSend: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryNextSequenceSendRequest) => Promise<QueryNextSequenceSendResponse>;
/**
 * UpgradeError returns the error receipt if the upgrade handshake failed.
 * @name getUpgradeError
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.UpgradeError
 */
export declare const getUpgradeError: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryUpgradeErrorRequest) => Promise<QueryUpgradeErrorResponse>;
/**
 * Upgrade returns the upgrade for a given port and channel id.
 * @name getUpgrade
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.Upgrade
 */
export declare const getUpgrade: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryUpgradeRequest) => Promise<QueryUpgradeResponse>;
/**
 * ChannelParams queries all parameters of the ibc channel submodule.
 * @name getChannelParams
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelParams
 */
export declare const getChannelParams: (client: import("../../../../helper-func-types.js").EndpointOrRpc, request: QueryChannelParamsRequest) => Promise<QueryChannelParamsResponse>;
//# sourceMappingURL=query.rpc.func.d.ts.map