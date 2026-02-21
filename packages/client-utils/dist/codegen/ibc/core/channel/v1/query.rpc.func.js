//@ts-nocheck
import { buildQuery } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { QueryChannelRequest, QueryChannelResponse, QueryChannelsRequest, QueryChannelsResponse, QueryConnectionChannelsRequest, QueryConnectionChannelsResponse, QueryChannelClientStateRequest, QueryChannelClientStateResponse, QueryChannelConsensusStateRequest, QueryChannelConsensusStateResponse, QueryPacketCommitmentRequest, QueryPacketCommitmentResponse, QueryPacketCommitmentsRequest, QueryPacketCommitmentsResponse, QueryPacketReceiptRequest, QueryPacketReceiptResponse, QueryPacketAcknowledgementRequest, QueryPacketAcknowledgementResponse, QueryPacketAcknowledgementsRequest, QueryPacketAcknowledgementsResponse, QueryUnreceivedPacketsRequest, QueryUnreceivedPacketsResponse, QueryUnreceivedAcksRequest, QueryUnreceivedAcksResponse, QueryNextSequenceReceiveRequest, QueryNextSequenceReceiveResponse, QueryNextSequenceSendRequest, QueryNextSequenceSendResponse, QueryUpgradeErrorRequest, QueryUpgradeErrorResponse, QueryUpgradeRequest, QueryUpgradeResponse, QueryChannelParamsRequest, QueryChannelParamsResponse, } from '@agoric/cosmic-proto/codegen/ibc/core/channel/v1/query.js';
/**
 * Channel queries an IBC Channel.
 * @name getChannel
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.Channel
 */
export const getChannel = buildQuery({
    encode: QueryChannelRequest.encode,
    decode: QueryChannelResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'Channel',
    deps: [QueryChannelRequest, QueryChannelResponse],
});
/**
 * Channels queries all the IBC channels of a chain.
 * @name getChannels
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.Channels
 */
export const getChannels = buildQuery({
    encode: QueryChannelsRequest.encode,
    decode: QueryChannelsResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'Channels',
    deps: [QueryChannelsRequest, QueryChannelsResponse],
});
/**
 * ConnectionChannels queries all the channels associated with a connection
 * end.
 * @name getConnectionChannels
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ConnectionChannels
 */
export const getConnectionChannels = buildQuery({
    encode: QueryConnectionChannelsRequest.encode,
    decode: QueryConnectionChannelsResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'ConnectionChannels',
    deps: [QueryConnectionChannelsRequest, QueryConnectionChannelsResponse],
});
/**
 * ChannelClientState queries for the client state for the channel associated
 * with the provided channel identifiers.
 * @name getChannelClientState
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelClientState
 */
export const getChannelClientState = buildQuery({
    encode: QueryChannelClientStateRequest.encode,
    decode: QueryChannelClientStateResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'ChannelClientState',
    deps: [QueryChannelClientStateRequest, QueryChannelClientStateResponse],
});
/**
 * ChannelConsensusState queries for the consensus state for the channel
 * associated with the provided channel identifiers.
 * @name getChannelConsensusState
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelConsensusState
 */
export const getChannelConsensusState = buildQuery({
    encode: QueryChannelConsensusStateRequest.encode,
    decode: QueryChannelConsensusStateResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'ChannelConsensusState',
    deps: [QueryChannelConsensusStateRequest, QueryChannelConsensusStateResponse],
});
/**
 * PacketCommitment queries a stored packet commitment hash.
 * @name getPacketCommitment
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PacketCommitment
 */
export const getPacketCommitment = buildQuery({
    encode: QueryPacketCommitmentRequest.encode,
    decode: QueryPacketCommitmentResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'PacketCommitment',
    deps: [QueryPacketCommitmentRequest, QueryPacketCommitmentResponse],
});
/**
 * PacketCommitments returns all the packet commitments hashes associated
 * with a channel.
 * @name getPacketCommitments
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PacketCommitments
 */
export const getPacketCommitments = buildQuery({
    encode: QueryPacketCommitmentsRequest.encode,
    decode: QueryPacketCommitmentsResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'PacketCommitments',
    deps: [QueryPacketCommitmentsRequest, QueryPacketCommitmentsResponse],
});
/**
 * PacketReceipt queries if a given packet sequence has been received on the
 * queried chain
 * @name getPacketReceipt
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PacketReceipt
 */
export const getPacketReceipt = buildQuery({
    encode: QueryPacketReceiptRequest.encode,
    decode: QueryPacketReceiptResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'PacketReceipt',
    deps: [QueryPacketReceiptRequest, QueryPacketReceiptResponse],
});
/**
 * PacketAcknowledgement queries a stored packet acknowledgement hash.
 * @name getPacketAcknowledgement
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PacketAcknowledgement
 */
export const getPacketAcknowledgement = buildQuery({
    encode: QueryPacketAcknowledgementRequest.encode,
    decode: QueryPacketAcknowledgementResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'PacketAcknowledgement',
    deps: [QueryPacketAcknowledgementRequest, QueryPacketAcknowledgementResponse],
});
/**
 * PacketAcknowledgements returns all the packet acknowledgements associated
 * with a channel.
 * @name getPacketAcknowledgements
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.PacketAcknowledgements
 */
export const getPacketAcknowledgements = buildQuery({
    encode: QueryPacketAcknowledgementsRequest.encode,
    decode: QueryPacketAcknowledgementsResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'PacketAcknowledgements',
    deps: [
        QueryPacketAcknowledgementsRequest,
        QueryPacketAcknowledgementsResponse,
    ],
});
/**
 * UnreceivedPackets returns all the unreceived IBC packets associated with a
 * channel and sequences.
 * @name getUnreceivedPackets
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.UnreceivedPackets
 */
export const getUnreceivedPackets = buildQuery({
    encode: QueryUnreceivedPacketsRequest.encode,
    decode: QueryUnreceivedPacketsResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'UnreceivedPackets',
    deps: [QueryUnreceivedPacketsRequest, QueryUnreceivedPacketsResponse],
});
/**
 * UnreceivedAcks returns all the unreceived IBC acknowledgements associated
 * with a channel and sequences.
 * @name getUnreceivedAcks
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.UnreceivedAcks
 */
export const getUnreceivedAcks = buildQuery({
    encode: QueryUnreceivedAcksRequest.encode,
    decode: QueryUnreceivedAcksResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'UnreceivedAcks',
    deps: [QueryUnreceivedAcksRequest, QueryUnreceivedAcksResponse],
});
/**
 * NextSequenceReceive returns the next receive sequence for a given channel.
 * @name getNextSequenceReceive
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.NextSequenceReceive
 */
export const getNextSequenceReceive = buildQuery({
    encode: QueryNextSequenceReceiveRequest.encode,
    decode: QueryNextSequenceReceiveResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'NextSequenceReceive',
    deps: [QueryNextSequenceReceiveRequest, QueryNextSequenceReceiveResponse],
});
/**
 * NextSequenceSend returns the next send sequence for a given channel.
 * @name getNextSequenceSend
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.NextSequenceSend
 */
export const getNextSequenceSend = buildQuery({
    encode: QueryNextSequenceSendRequest.encode,
    decode: QueryNextSequenceSendResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'NextSequenceSend',
    deps: [QueryNextSequenceSendRequest, QueryNextSequenceSendResponse],
});
/**
 * UpgradeError returns the error receipt if the upgrade handshake failed.
 * @name getUpgradeError
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.UpgradeError
 */
export const getUpgradeError = buildQuery({
    encode: QueryUpgradeErrorRequest.encode,
    decode: QueryUpgradeErrorResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'UpgradeError',
    deps: [QueryUpgradeErrorRequest, QueryUpgradeErrorResponse],
});
/**
 * Upgrade returns the upgrade for a given port and channel id.
 * @name getUpgrade
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.Upgrade
 */
export const getUpgrade = buildQuery({
    encode: QueryUpgradeRequest.encode,
    decode: QueryUpgradeResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'Upgrade',
    deps: [QueryUpgradeRequest, QueryUpgradeResponse],
});
/**
 * ChannelParams queries all parameters of the ibc channel submodule.
 * @name getChannelParams
 * @package ibc.core.channel.v1
 * @see proto service: ibc.core.channel.v1.ChannelParams
 */
export const getChannelParams = buildQuery({
    encode: QueryChannelParamsRequest.encode,
    decode: QueryChannelParamsResponse.decode,
    service: 'ibc.core.channel.v1.Query',
    method: 'ChannelParams',
    deps: [QueryChannelParamsRequest, QueryChannelParamsResponse],
});
//# sourceMappingURL=query.rpc.func.js.map