import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgSendPacket, MsgSendPacketResponse, } from '@agoric/cosmic-proto/codegen/agoric/vibc/msgs.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.sendPacket = this.sendPacket.bind(this);
    }
    sendPacket(request) {
        const data = MsgSendPacket.encode(request).finish();
        const promise = this.rpc.request('agoric.vibc.Msg', 'SendPacket', data);
        return promise.then(data => MsgSendPacketResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=msgs.rpc.msg.js.map