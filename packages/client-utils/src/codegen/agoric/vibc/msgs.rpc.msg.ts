//@ts-nocheck
import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import {
  MsgSendPacket,
  MsgSendPacketResponse,
} from '@agoric/cosmic-proto/codegen/agoric/vibc/msgs.js';
/** The module transactions. */
export interface Msg {
  /** Force sending an arbitrary packet on a channel. */
  sendPacket(request: MsgSendPacket): Promise<MsgSendPacketResponse>;
}
export class MsgClientImpl implements Msg {
  private readonly rpc: TxRpc;
  constructor(rpc: TxRpc) {
    this.rpc = rpc;
    this.sendPacket = this.sendPacket.bind(this);
  }
  sendPacket(request: MsgSendPacket): Promise<MsgSendPacketResponse> {
    const data = MsgSendPacket.encode(request).finish();
    const promise = this.rpc.request('agoric.vibc.Msg', 'SendPacket', data);
    return promise.then(data =>
      MsgSendPacketResponse.decode(new BinaryReader(data)),
    );
  }
}
export const createClientImpl = (rpc: TxRpc) => {
  return new MsgClientImpl(rpc);
};
