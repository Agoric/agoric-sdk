import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgUpdateParams, MsgUpdateParamsResponse, } from '@agoric/cosmic-proto/codegen/icq/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.updateParams = this.updateParams.bind(this);
    }
    updateParams(request) {
        const data = MsgUpdateParams.encode(request).finish();
        const promise = this.rpc.request('icq.v1.Msg', 'UpdateParams', data);
        return promise.then(data => MsgUpdateParamsResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map