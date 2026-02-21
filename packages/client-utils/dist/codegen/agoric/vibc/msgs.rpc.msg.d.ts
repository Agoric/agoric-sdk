import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgSendPacket, MsgSendPacketResponse } from '@agoric/cosmic-proto/codegen/agoric/vibc/msgs.js';
/** The module transactions. */
export interface Msg {
    /** Force sending an arbitrary packet on a channel. */
    sendPacket(request: MsgSendPacket): Promise<MsgSendPacketResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    sendPacket(request: MsgSendPacket): Promise<MsgSendPacketResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=msgs.rpc.msg.d.ts.map