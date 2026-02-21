import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgRegisterInterchainAccount, MsgRegisterInterchainAccountResponse, MsgSendTx, MsgSendTxResponse, MsgUpdateParams, MsgUpdateParamsResponse, } from '@agoric/cosmic-proto/codegen/ibc/applications/interchain_accounts/controller/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.registerInterchainAccount = this.registerInterchainAccount.bind(this);
        this.sendTx = this.sendTx.bind(this);
        this.updateParams = this.updateParams.bind(this);
    }
    registerInterchainAccount(request) {
        const data = MsgRegisterInterchainAccount.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.interchain_accounts.controller.v1.Msg', 'RegisterInterchainAccount', data);
        return promise.then(data => MsgRegisterInterchainAccountResponse.decode(new BinaryReader(data)));
    }
    sendTx(request) {
        const data = MsgSendTx.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.interchain_accounts.controller.v1.Msg', 'SendTx', data);
        return promise.then(data => MsgSendTxResponse.decode(new BinaryReader(data)));
    }
    updateParams(request) {
        const data = MsgUpdateParams.encode(request).finish();
        const promise = this.rpc.request('ibc.applications.interchain_accounts.controller.v1.Msg', 'UpdateParams', data);
        return promise.then(data => MsgUpdateParamsResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map