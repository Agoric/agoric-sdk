import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgTransfer, MsgTransferResponse, MsgUpdateParams, MsgUpdateParamsResponse, } from '@agoric/cosmic-proto/codegen/ibc/applications/transfer/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.transfer = this.transfer.bind(this);
        this.updateParams = this.updateParams.bind(this);
    }
    transfer(request) {
        const data = MsgTransfer.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.transfer.v1.Msg', 'Transfer', data);
        return promise.then(data => MsgTransferResponse.decode(new BinaryReader(data)));
    }
    updateParams(request) {
        const data = MsgUpdateParams.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.transfer.v1.Msg', 'UpdateParams', data);
        return promise.then(data => MsgUpdateParamsResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map