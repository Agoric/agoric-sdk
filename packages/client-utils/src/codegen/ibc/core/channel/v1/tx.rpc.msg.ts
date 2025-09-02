//@ts-nocheck
import { type Rpc } from '../../../../helpers.js';
import { BinaryReader } from '../../../../binary.js';
import {
  MsgChannelOpenInit,
  MsgChannelOpenInitResponse,
  MsgChannelOpenTry,
  MsgChannelOpenTryResponse,
  MsgChannelOpenAck,
  MsgChannelOpenAckResponse,
  MsgChannelOpenConfirm,
  MsgChannelOpenConfirmResponse,
  MsgChannelCloseInit,
  MsgChannelCloseInitResponse,
  MsgChannelCloseConfirm,
  MsgChannelCloseConfirmResponse,
  MsgRecvPacket,
  MsgRecvPacketResponse,
  MsgTimeout,
  MsgTimeoutResponse,
  MsgTimeoutOnClose,
  MsgTimeoutOnCloseResponse,
  MsgAcknowledgement,
  MsgAcknowledgementResponse,
  MsgChannelUpgradeInit,
  MsgChannelUpgradeInitResponse,
  MsgChannelUpgradeTry,
  MsgChannelUpgradeTryResponse,
  MsgChannelUpgradeAck,
  MsgChannelUpgradeAckResponse,
  MsgChannelUpgradeConfirm,
  MsgChannelUpgradeConfirmResponse,
  MsgChannelUpgradeOpen,
  MsgChannelUpgradeOpenResponse,
  MsgChannelUpgradeTimeout,
  MsgChannelUpgradeTimeoutResponse,
  MsgChannelUpgradeCancel,
  MsgChannelUpgradeCancelResponse,
  MsgUpdateParams,
  MsgUpdateParamsResponse,
  MsgPruneAcknowledgements,
  MsgPruneAcknowledgementsResponse,
} from './tx.js';
/** Msg defines the ibc/channel Msg service. */
export interface Msg {
  /** ChannelOpenInit defines a rpc handler method for MsgChannelOpenInit. */
  channelOpenInit(
    request: MsgChannelOpenInit,
  ): Promise<MsgChannelOpenInitResponse>;
  /** ChannelOpenTry defines a rpc handler method for MsgChannelOpenTry. */
  channelOpenTry(
    request: MsgChannelOpenTry,
  ): Promise<MsgChannelOpenTryResponse>;
  /** ChannelOpenAck defines a rpc handler method for MsgChannelOpenAck. */
  channelOpenAck(
    request: MsgChannelOpenAck,
  ): Promise<MsgChannelOpenAckResponse>;
  /** ChannelOpenConfirm defines a rpc handler method for MsgChannelOpenConfirm. */
  channelOpenConfirm(
    request: MsgChannelOpenConfirm,
  ): Promise<MsgChannelOpenConfirmResponse>;
  /** ChannelCloseInit defines a rpc handler method for MsgChannelCloseInit. */
  channelCloseInit(
    request: MsgChannelCloseInit,
  ): Promise<MsgChannelCloseInitResponse>;
  /**
   * ChannelCloseConfirm defines a rpc handler method for
   * MsgChannelCloseConfirm.
   */
  channelCloseConfirm(
    request: MsgChannelCloseConfirm,
  ): Promise<MsgChannelCloseConfirmResponse>;
  /** RecvPacket defines a rpc handler method for MsgRecvPacket. */
  recvPacket(request: MsgRecvPacket): Promise<MsgRecvPacketResponse>;
  /** Timeout defines a rpc handler method for MsgTimeout. */
  timeout(request: MsgTimeout): Promise<MsgTimeoutResponse>;
  /** TimeoutOnClose defines a rpc handler method for MsgTimeoutOnClose. */
  timeoutOnClose(
    request: MsgTimeoutOnClose,
  ): Promise<MsgTimeoutOnCloseResponse>;
  /** Acknowledgement defines a rpc handler method for MsgAcknowledgement. */
  acknowledgement(
    request: MsgAcknowledgement,
  ): Promise<MsgAcknowledgementResponse>;
  /** ChannelUpgradeInit defines a rpc handler method for MsgChannelUpgradeInit. */
  channelUpgradeInit(
    request: MsgChannelUpgradeInit,
  ): Promise<MsgChannelUpgradeInitResponse>;
  /** ChannelUpgradeTry defines a rpc handler method for MsgChannelUpgradeTry. */
  channelUpgradeTry(
    request: MsgChannelUpgradeTry,
  ): Promise<MsgChannelUpgradeTryResponse>;
  /** ChannelUpgradeAck defines a rpc handler method for MsgChannelUpgradeAck. */
  channelUpgradeAck(
    request: MsgChannelUpgradeAck,
  ): Promise<MsgChannelUpgradeAckResponse>;
  /** ChannelUpgradeConfirm defines a rpc handler method for MsgChannelUpgradeConfirm. */
  channelUpgradeConfirm(
    request: MsgChannelUpgradeConfirm,
  ): Promise<MsgChannelUpgradeConfirmResponse>;
  /** ChannelUpgradeOpen defines a rpc handler method for MsgChannelUpgradeOpen. */
  channelUpgradeOpen(
    request: MsgChannelUpgradeOpen,
  ): Promise<MsgChannelUpgradeOpenResponse>;
  /** ChannelUpgradeTimeout defines a rpc handler method for MsgChannelUpgradeTimeout. */
  channelUpgradeTimeout(
    request: MsgChannelUpgradeTimeout,
  ): Promise<MsgChannelUpgradeTimeoutResponse>;
  /** ChannelUpgradeCancel defines a rpc handler method for MsgChannelUpgradeCancel. */
  channelUpgradeCancel(
    request: MsgChannelUpgradeCancel,
  ): Promise<MsgChannelUpgradeCancelResponse>;
  /** UpdateChannelParams defines a rpc handler method for MsgUpdateParams. */
  updateChannelParams(
    request: MsgUpdateParams,
  ): Promise<MsgUpdateParamsResponse>;
  /** PruneAcknowledgements defines a rpc handler method for MsgPruneAcknowledgements. */
  pruneAcknowledgements(
    request: MsgPruneAcknowledgements,
  ): Promise<MsgPruneAcknowledgementsResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: Rpc;
  constructor(rpc: Rpc) {
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
  channelOpenInit(
    request: MsgChannelOpenInit,
  ): Promise<MsgChannelOpenInitResponse> {
    const data = MsgChannelOpenInit.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelOpenInit',
      data,
    );
    return promise.then(data =>
      MsgChannelOpenInitResponse.decode(new BinaryReader(data)),
    );
  }
  channelOpenTry(
    request: MsgChannelOpenTry,
  ): Promise<MsgChannelOpenTryResponse> {
    const data = MsgChannelOpenTry.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelOpenTry',
      data,
    );
    return promise.then(data =>
      MsgChannelOpenTryResponse.decode(new BinaryReader(data)),
    );
  }
  channelOpenAck(
    request: MsgChannelOpenAck,
  ): Promise<MsgChannelOpenAckResponse> {
    const data = MsgChannelOpenAck.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelOpenAck',
      data,
    );
    return promise.then(data =>
      MsgChannelOpenAckResponse.decode(new BinaryReader(data)),
    );
  }
  channelOpenConfirm(
    request: MsgChannelOpenConfirm,
  ): Promise<MsgChannelOpenConfirmResponse> {
    const data = MsgChannelOpenConfirm.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelOpenConfirm',
      data,
    );
    return promise.then(data =>
      MsgChannelOpenConfirmResponse.decode(new BinaryReader(data)),
    );
  }
  channelCloseInit(
    request: MsgChannelCloseInit,
  ): Promise<MsgChannelCloseInitResponse> {
    const data = MsgChannelCloseInit.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelCloseInit',
      data,
    );
    return promise.then(data =>
      MsgChannelCloseInitResponse.decode(new BinaryReader(data)),
    );
  }
  channelCloseConfirm(
    request: MsgChannelCloseConfirm,
  ): Promise<MsgChannelCloseConfirmResponse> {
    const data = MsgChannelCloseConfirm.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelCloseConfirm',
      data,
    );
    return promise.then(data =>
      MsgChannelCloseConfirmResponse.decode(new BinaryReader(data)),
    );
  }
  recvPacket(request: MsgRecvPacket): Promise<MsgRecvPacketResponse> {
    const data = MsgRecvPacket.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'RecvPacket',
      data,
    );
    return promise.then(data =>
      MsgRecvPacketResponse.decode(new BinaryReader(data)),
    );
  }
  timeout(request: MsgTimeout): Promise<MsgTimeoutResponse> {
    const data = MsgTimeout.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'Timeout',
      data,
    );
    return promise.then(data =>
      MsgTimeoutResponse.decode(new BinaryReader(data)),
    );
  }
  timeoutOnClose(
    request: MsgTimeoutOnClose,
  ): Promise<MsgTimeoutOnCloseResponse> {
    const data = MsgTimeoutOnClose.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'TimeoutOnClose',
      data,
    );
    return promise.then(data =>
      MsgTimeoutOnCloseResponse.decode(new BinaryReader(data)),
    );
  }
  acknowledgement(
    request: MsgAcknowledgement,
  ): Promise<MsgAcknowledgementResponse> {
    const data = MsgAcknowledgement.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'Acknowledgement',
      data,
    );
    return promise.then(data =>
      MsgAcknowledgementResponse.decode(new BinaryReader(data)),
    );
  }
  channelUpgradeInit(
    request: MsgChannelUpgradeInit,
  ): Promise<MsgChannelUpgradeInitResponse> {
    const data = MsgChannelUpgradeInit.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelUpgradeInit',
      data,
    );
    return promise.then(data =>
      MsgChannelUpgradeInitResponse.decode(new BinaryReader(data)),
    );
  }
  channelUpgradeTry(
    request: MsgChannelUpgradeTry,
  ): Promise<MsgChannelUpgradeTryResponse> {
    const data = MsgChannelUpgradeTry.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelUpgradeTry',
      data,
    );
    return promise.then(data =>
      MsgChannelUpgradeTryResponse.decode(new BinaryReader(data)),
    );
  }
  channelUpgradeAck(
    request: MsgChannelUpgradeAck,
  ): Promise<MsgChannelUpgradeAckResponse> {
    const data = MsgChannelUpgradeAck.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelUpgradeAck',
      data,
    );
    return promise.then(data =>
      MsgChannelUpgradeAckResponse.decode(new BinaryReader(data)),
    );
  }
  channelUpgradeConfirm(
    request: MsgChannelUpgradeConfirm,
  ): Promise<MsgChannelUpgradeConfirmResponse> {
    const data = MsgChannelUpgradeConfirm.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelUpgradeConfirm',
      data,
    );
    return promise.then(data =>
      MsgChannelUpgradeConfirmResponse.decode(new BinaryReader(data)),
    );
  }
  channelUpgradeOpen(
    request: MsgChannelUpgradeOpen,
  ): Promise<MsgChannelUpgradeOpenResponse> {
    const data = MsgChannelUpgradeOpen.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelUpgradeOpen',
      data,
    );
    return promise.then(data =>
      MsgChannelUpgradeOpenResponse.decode(new BinaryReader(data)),
    );
  }
  channelUpgradeTimeout(
    request: MsgChannelUpgradeTimeout,
  ): Promise<MsgChannelUpgradeTimeoutResponse> {
    const data = MsgChannelUpgradeTimeout.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelUpgradeTimeout',
      data,
    );
    return promise.then(data =>
      MsgChannelUpgradeTimeoutResponse.decode(new BinaryReader(data)),
    );
  }
  channelUpgradeCancel(
    request: MsgChannelUpgradeCancel,
  ): Promise<MsgChannelUpgradeCancelResponse> {
    const data = MsgChannelUpgradeCancel.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'ChannelUpgradeCancel',
      data,
    );
    return promise.then(data =>
      MsgChannelUpgradeCancelResponse.decode(new BinaryReader(data)),
    );
  }
  updateChannelParams(
    request: MsgUpdateParams,
  ): Promise<MsgUpdateParamsResponse> {
    const data = MsgUpdateParams.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'UpdateChannelParams',
      data,
    );
    return promise.then(data =>
      MsgUpdateParamsResponse.decode(new BinaryReader(data)),
    );
  }
  pruneAcknowledgements(
    request: MsgPruneAcknowledgements,
  ): Promise<MsgPruneAcknowledgementsResponse> {
    const data = MsgPruneAcknowledgements.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v1.Msg',
      'PruneAcknowledgements',
      data,
    );
    return promise.then(data =>
      MsgPruneAcknowledgementsResponse.decode(new BinaryReader(data)),
    );
  }
}
