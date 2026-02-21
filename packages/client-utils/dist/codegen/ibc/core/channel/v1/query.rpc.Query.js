import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { QueryChannelRequest, QueryChannelResponse, QueryChannelsRequest, QueryChannelsResponse, QueryConnectionChannelsRequest, QueryConnectionChannelsResponse, QueryChannelClientStateRequest, QueryChannelClientStateResponse, QueryChannelConsensusStateRequest, QueryChannelConsensusStateResponse, QueryPacketCommitmentRequest, QueryPacketCommitmentResponse, QueryPacketCommitmentsRequest, QueryPacketCommitmentsResponse, QueryPacketReceiptRequest, QueryPacketReceiptResponse, QueryPacketAcknowledgementRequest, QueryPacketAcknowledgementResponse, QueryPacketAcknowledgementsRequest, QueryPacketAcknowledgementsResponse, QueryUnreceivedPacketsRequest, QueryUnreceivedPacketsResponse, QueryUnreceivedAcksRequest, QueryUnreceivedAcksResponse, QueryNextSequenceReceiveRequest, QueryNextSequenceReceiveResponse, QueryNextSequenceSendRequest, QueryNextSequenceSendResponse, QueryUpgradeErrorRequest, QueryUpgradeErrorResponse, QueryUpgradeRequest, QueryUpgradeResponse, QueryChannelParamsRequest, QueryChannelParamsResponse, } from '@agoric/cosmic-proto/codegen/ibc/core/channel/v1/query.js';
export class QueryClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.channel = this.channel.bind(this);
        this.channels = this.channels.bind(this);
        this.connectionChannels = this.connectionChannels.bind(this);
        this.channelClientState = this.channelClientState.bind(this);
        this.channelConsensusState = this.channelConsensusState.bind(this);
        this.packetCommitment = this.packetCommitment.bind(this);
        this.packetCommitments = this.packetCommitments.bind(this);
        this.packetReceipt = this.packetReceipt.bind(this);
        this.packetAcknowledgement = this.packetAcknowledgement.bind(this);
        this.packetAcknowledgements = this.packetAcknowledgements.bind(this);
        this.unreceivedPackets = this.unreceivedPackets.bind(this);
        this.unreceivedAcks = this.unreceivedAcks.bind(this);
        this.nextSequenceReceive = this.nextSequenceReceive.bind(this);
        this.nextSequenceSend = this.nextSequenceSend.bind(this);
        this.upgradeError = this.upgradeError.bind(this);
        this.upgrade = this.upgrade.bind(this);
        this.channelParams = this.channelParams.bind(this);
    }
    channel(request) {
        const data = QueryChannelRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'Channel', data);
        return promise.then(data => QueryChannelResponse.decode(new BinaryReader(data)));
    }
    channels(request = {
        pagination: undefined,
    }) {
        const data = QueryChannelsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'Channels', data);
        return promise.then(data => QueryChannelsResponse.decode(new BinaryReader(data)));
    }
    connectionChannels(request) {
        const data = QueryConnectionChannelsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'ConnectionChannels', data);
        return promise.then(data => QueryConnectionChannelsResponse.decode(new BinaryReader(data)));
    }
    channelClientState(request) {
        const data = QueryChannelClientStateRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'ChannelClientState', data);
        return promise.then(data => QueryChannelClientStateResponse.decode(new BinaryReader(data)));
    }
    channelConsensusState(request) {
        const data = QueryChannelConsensusStateRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'ChannelConsensusState', data);
        return promise.then(data => QueryChannelConsensusStateResponse.decode(new BinaryReader(data)));
    }
    packetCommitment(request) {
        const data = QueryPacketCommitmentRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'PacketCommitment', data);
        return promise.then(data => QueryPacketCommitmentResponse.decode(new BinaryReader(data)));
    }
    packetCommitments(request) {
        const data = QueryPacketCommitmentsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'PacketCommitments', data);
        return promise.then(data => QueryPacketCommitmentsResponse.decode(new BinaryReader(data)));
    }
    packetReceipt(request) {
        const data = QueryPacketReceiptRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'PacketReceipt', data);
        return promise.then(data => QueryPacketReceiptResponse.decode(new BinaryReader(data)));
    }
    packetAcknowledgement(request) {
        const data = QueryPacketAcknowledgementRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'PacketAcknowledgement', data);
        return promise.then(data => QueryPacketAcknowledgementResponse.decode(new BinaryReader(data)));
    }
    packetAcknowledgements(request) {
        const data = QueryPacketAcknowledgementsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'PacketAcknowledgements', data);
        return promise.then(data => QueryPacketAcknowledgementsResponse.decode(new BinaryReader(data)));
    }
    unreceivedPackets(request) {
        const data = QueryUnreceivedPacketsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'UnreceivedPackets', data);
        return promise.then(data => QueryUnreceivedPacketsResponse.decode(new BinaryReader(data)));
    }
    unreceivedAcks(request) {
        const data = QueryUnreceivedAcksRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'UnreceivedAcks', data);
        return promise.then(data => QueryUnreceivedAcksResponse.decode(new BinaryReader(data)));
    }
    nextSequenceReceive(request) {
        const data = QueryNextSequenceReceiveRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'NextSequenceReceive', data);
        return promise.then(data => QueryNextSequenceReceiveResponse.decode(new BinaryReader(data)));
    }
    nextSequenceSend(request) {
        const data = QueryNextSequenceSendRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'NextSequenceSend', data);
        return promise.then(data => QueryNextSequenceSendResponse.decode(new BinaryReader(data)));
    }
    upgradeError(request) {
        const data = QueryUpgradeErrorRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'UpgradeError', data);
        return promise.then(data => QueryUpgradeErrorResponse.decode(new BinaryReader(data)));
    }
    upgrade(request) {
        const data = QueryUpgradeRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'Upgrade', data);
        return promise.then(data => QueryUpgradeResponse.decode(new BinaryReader(data)));
    }
    channelParams(request = {}) {
        const data = QueryChannelParamsRequest.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Query', 'ChannelParams', data);
        return promise.then(data => QueryChannelParamsResponse.decode(new BinaryReader(data)));
    }
}
export const createRpcQueryExtension = (base) => {
    const rpc = createProtobufRpcClient(base);
    const queryService = new QueryClientImpl(rpc);
    return {
        channel(request) {
            return queryService.channel(request);
        },
        channels(request) {
            return queryService.channels(request);
        },
        connectionChannels(request) {
            return queryService.connectionChannels(request);
        },
        channelClientState(request) {
            return queryService.channelClientState(request);
        },
        channelConsensusState(request) {
            return queryService.channelConsensusState(request);
        },
        packetCommitment(request) {
            return queryService.packetCommitment(request);
        },
        packetCommitments(request) {
            return queryService.packetCommitments(request);
        },
        packetReceipt(request) {
            return queryService.packetReceipt(request);
        },
        packetAcknowledgement(request) {
            return queryService.packetAcknowledgement(request);
        },
        packetAcknowledgements(request) {
            return queryService.packetAcknowledgements(request);
        },
        unreceivedPackets(request) {
            return queryService.unreceivedPackets(request);
        },
        unreceivedAcks(request) {
            return queryService.unreceivedAcks(request);
        },
        nextSequenceReceive(request) {
            return queryService.nextSequenceReceive(request);
        },
        nextSequenceSend(request) {
            return queryService.nextSequenceSend(request);
        },
        upgradeError(request) {
            return queryService.upgradeError(request);
        },
        upgrade(request) {
            return queryService.upgrade(request);
        },
        channelParams(request) {
            return queryService.channelParams(request);
        },
    };
};
//# sourceMappingURL=query.rpc.Query.js.map