import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgUpdateParams, MsgUpdateParamsResponse, MsgModuleQuerySafe, MsgModuleQuerySafeResponse, } from '@agoric/cosmic-proto/codegen/ibc/applications/interchain_accounts/host/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.updateParams = this.updateParams.bind(this);
        this.moduleQuerySafe = this.moduleQuerySafe.bind(this);
    }
    updateParams(request) {
        const data = MsgUpdateParams.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.interchain_accounts.host.v1.Msg', 'UpdateParams', data);
        return promise.then(data => MsgUpdateParamsResponse.decode(new BinaryReader(data)));
    }
    moduleQuerySafe(request) {
        const data = MsgModuleQuerySafe.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.interchain_accounts.host.v1.Msg', 'ModuleQuerySafe', data);
        return promise.then(data => MsgModuleQuerySafeResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map