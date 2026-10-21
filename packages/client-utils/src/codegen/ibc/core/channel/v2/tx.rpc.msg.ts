//@ts-nocheck
import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import {
  MsgSendPacket,
  MsgSendPacketResponse,
  MsgRecvPacket,
  MsgRecvPacketResponse,
  MsgTimeout,
  MsgTimeoutResponse,
  MsgAcknowledgement,
  MsgAcknowledgementResponse,
} from '@agoric/cosmic-proto/codegen/ibc/core/channel/v2/tx.js';
/** Msg defines the ibc/channel/v2 Msg service. */
export interface Msg {
  /** SendPacket defines a rpc handler method for MsgSendPacket. */
  sendPacket(request: MsgSendPacket): Promise<MsgSendPacketResponse>;
  /** RecvPacket defines a rpc handler method for MsgRecvPacket. */
  recvPacket(request: MsgRecvPacket): Promise<MsgRecvPacketResponse>;
  /** Timeout defines a rpc handler method for MsgTimeout. */
  timeout(request: MsgTimeout): Promise<MsgTimeoutResponse>;
  /** Acknowledgement defines a rpc handler method for MsgAcknowledgement. */
  acknowledgement(
    request: MsgAcknowledgement,
  ): Promise<MsgAcknowledgementResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: TxRpc;
  constructor(rpc: TxRpc) {
    this.rpc = rpc;
    this.sendPacket = this.sendPacket.bind(this);
    this.recvPacket = this.recvPacket.bind(this);
    this.timeout = this.timeout.bind(this);
    this.acknowledgement = this.acknowledgement.bind(this);
  }
  sendPacket(request: MsgSendPacket): Promise<MsgSendPacketResponse> {
    const data = MsgSendPacket.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v2.Msg',
      'SendPacket',
      data,
    );
    return promise.then(data =>
      MsgSendPacketResponse.decode(new BinaryReader(data)),
    );
  }
  recvPacket(request: MsgRecvPacket): Promise<MsgRecvPacketResponse> {
    const data = MsgRecvPacket.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v2.Msg',
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
      'ibc.core.channel.v2.Msg',
      'Timeout',
      data,
    );
    return promise.then(data =>
      MsgTimeoutResponse.decode(new BinaryReader(data)),
    );
  }
  acknowledgement(
    request: MsgAcknowledgement,
  ): Promise<MsgAcknowledgementResponse> {
    const data = MsgAcknowledgement.encode(request).finish();
    const promise = this.rpc.request(
      'ibc.core.channel.v2.Msg',
      'Acknowledgement',
      data,
    );
    return promise.then(data =>
      MsgAcknowledgementResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createClientImpl = (rpc: TxRpc) => {
  return new MsgClientImpl(rpc);
};
