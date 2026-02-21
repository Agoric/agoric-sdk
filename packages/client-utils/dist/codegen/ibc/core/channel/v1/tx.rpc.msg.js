import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgChannelOpenInit, MsgChannelOpenInitResponse, MsgChannelOpenTry, MsgChannelOpenTryResponse, MsgChannelOpenAck, MsgChannelOpenAckResponse, MsgChannelOpenConfirm, MsgChannelOpenConfirmResponse, MsgChannelCloseInit, MsgChannelCloseInitResponse, MsgChannelCloseConfirm, MsgChannelCloseConfirmResponse, MsgRecvPacket, MsgRecvPacketResponse, MsgTimeout, MsgTimeoutResponse, MsgTimeoutOnClose, MsgTimeoutOnCloseResponse, MsgAcknowledgement, MsgAcknowledgementResponse, MsgChannelUpgradeInit, MsgChannelUpgradeInitResponse, MsgChannelUpgradeTry, MsgChannelUpgradeTryResponse, MsgChannelUpgradeAck, MsgChannelUpgradeAckResponse, MsgChannelUpgradeConfirm, MsgChannelUpgradeConfirmResponse, MsgChannelUpgradeOpen, MsgChannelUpgradeOpenResponse, MsgChannelUpgradeTimeout, MsgChannelUpgradeTimeoutResponse, MsgChannelUpgradeCancel, MsgChannelUpgradeCancelResponse, MsgUpdateParams, MsgUpdateParamsResponse, MsgPruneAcknowledgements, MsgPruneAcknowledgementsResponse, } from '@agoric/cosmic-proto/codegen/ibc/core/channel/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.channelOpenInit = this.channelOpenInit.bind(this);
        this.channelOpenTry = this.channelOpenTry.bind(this);
        this.channelOpenAck = this.channelOpenAck.bind(this);
        this.channelOpenConfirm = this.channelOpenConfirm.bind(this);
        this.channelCloseInit = this.channelCloseInit.bind(this);
        this.channelCloseConfirm = this.channelCloseConfirm.bind(this);
        this.recvPacket = this.recvPacket.bind(this);
        this.timeout = this.timeout.bind(this);
        this.timeoutOnClose = this.timeoutOnClose.bind(this);
        this.acknowledgement = this.acknowledgement.bind(this);
        this.channelUpgradeInit = this.channelUpgradeInit.bind(this);
        this.channelUpgradeTry = this.channelUpgradeTry.bind(this);
        this.channelUpgradeAck = this.channelUpgradeAck.bind(this);
        this.channelUpgradeConfirm = this.channelUpgradeConfirm.bind(this);
        this.channelUpgradeOpen = this.channelUpgradeOpen.bind(this);
        this.channelUpgradeTimeout = this.channelUpgradeTimeout.bind(this);
        this.channelUpgradeCancel = this.channelUpgradeCancel.bind(this);
        this.updateChannelParams = this.updateChannelParams.bind(this);
        this.pruneAcknowledgements = this.pruneAcknowledgements.bind(this);
    }
    channelOpenInit(request) {
        const data = MsgChannelOpenInit.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelOpenInit', data);
        return promise.then(data => MsgChannelOpenInitResponse.decode(new BinaryReader(data)));
    }
    channelOpenTry(request) {
        const data = MsgChannelOpenTry.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelOpenTry', data);
        return promise.then(data => MsgChannelOpenTryResponse.decode(new BinaryReader(data)));
    }
    channelOpenAck(request) {
        const data = MsgChannelOpenAck.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelOpenAck', data);
        return promise.then(data => MsgChannelOpenAckResponse.decode(new BinaryReader(data)));
    }
    channelOpenConfirm(request) {
        const data = MsgChannelOpenConfirm.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelOpenConfirm', data);
        return promise.then(data => MsgChannelOpenConfirmResponse.decode(new BinaryReader(data)));
    }
    channelCloseInit(request) {
        const data = MsgChannelCloseInit.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelCloseInit', data);
        return promise.then(data => MsgChannelCloseInitResponse.decode(new BinaryReader(data)));
    }
    channelCloseConfirm(request) {
        const data = MsgChannelCloseConfirm.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelCloseConfirm', data);
        return promise.then(data => MsgChannelCloseConfirmResponse.decode(new BinaryReader(data)));
    }
    recvPacket(request) {
        const data = MsgRecvPacket.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'RecvPacket', data);
        return promise.then(data => MsgRecvPacketResponse.decode(new BinaryReader(data)));
    }
    timeout(request) {
        const data = MsgTimeout.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'Timeout', data);
        return promise.then(data => MsgTimeoutResponse.decode(new BinaryReader(data)));
    }
    timeoutOnClose(request) {
        const data = MsgTimeoutOnClose.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'TimeoutOnClose', data);
        return promise.then(data => MsgTimeoutOnCloseResponse.decode(new BinaryReader(data)));
    }
    acknowledgement(request) {
        const data = MsgAcknowledgement.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'Acknowledgement', data);
        return promise.then(data => MsgAcknowledgementResponse.decode(new BinaryReader(data)));
    }
    channelUpgradeInit(request) {
        const data = MsgChannelUpgradeInit.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelUpgradeInit', data);
        return promise.then(data => MsgChannelUpgradeInitResponse.decode(new BinaryReader(data)));
    }
    channelUpgradeTry(request) {
        const data = MsgChannelUpgradeTry.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelUpgradeTry', data);
        return promise.then(data => MsgChannelUpgradeTryResponse.decode(new BinaryReader(data)));
    }
    channelUpgradeAck(request) {
        const data = MsgChannelUpgradeAck.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelUpgradeAck', data);
        return promise.then(data => MsgChannelUpgradeAckResponse.decode(new BinaryReader(data)));
    }
    channelUpgradeConfirm(request) {
        const data = MsgChannelUpgradeConfirm.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelUpgradeConfirm', data);
        return promise.then(data => MsgChannelUpgradeConfirmResponse.decode(new BinaryReader(data)));
    }
    channelUpgradeOpen(request) {
        const data = MsgChannelUpgradeOpen.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelUpgradeOpen', data);
        return promise.then(data => MsgChannelUpgradeOpenResponse.decode(new BinaryReader(data)));
    }
    channelUpgradeTimeout(request) {
        const data = MsgChannelUpgradeTimeout.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelUpgradeTimeout', data);
        return promise.then(data => MsgChannelUpgradeTimeoutResponse.decode(new BinaryReader(data)));
    }
    channelUpgradeCancel(request) {
        const data = MsgChannelUpgradeCancel.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'ChannelUpgradeCancel', data);
        return promise.then(data => MsgChannelUpgradeCancelResponse.decode(new BinaryReader(data)));
    }
    updateChannelParams(request) {
        const data = MsgUpdateParams.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'UpdateChannelParams', data);
        return promise.then(data => MsgUpdateParamsResponse.decode(new BinaryReader(data)));
    }
    pruneAcknowledgements(request) {
        const data = MsgPruneAcknowledgements.encode(request).finish();
        const promise = this.rpc.request('ibc.core.channel.v1.Msg', 'PruneAcknowledgements', data);
        return promise.then(data => MsgPruneAcknowledgementsResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map