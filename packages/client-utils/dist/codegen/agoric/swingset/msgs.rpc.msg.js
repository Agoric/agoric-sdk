import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgInstallBundle, MsgInstallBundleResponse, MsgDeliverInbound, MsgDeliverInboundResponse, MsgWalletAction, MsgWalletActionResponse, MsgWalletSpendAction, MsgWalletSpendActionResponse, MsgProvision, MsgProvisionResponse, MsgCoreEval, MsgCoreEvalResponse, } from '@agoric/cosmic-proto/codegen/agoric/swingset/msgs.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.installBundle = this.installBundle.bind(this);
        this.deliverInbound = this.deliverInbound.bind(this);
        this.walletAction = this.walletAction.bind(this);
        this.walletSpendAction = this.walletSpendAction.bind(this);
        this.provision = this.provision.bind(this);
        this.coreEval = this.coreEval.bind(this);
    }
    installBundle(request) {
        const data = MsgInstallBundle.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Msg', 'InstallBundle', data);
        return promise.then(data => MsgInstallBundleResponse.decode(new BinaryReader(data)));
    }
    deliverInbound(request) {
        const data = MsgDeliverInbound.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Msg', 'DeliverInbound', data);
        return promise.then(data => MsgDeliverInboundResponse.decode(new BinaryReader(data)));
    }
    walletAction(request) {
        const data = MsgWalletAction.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Msg', 'WalletAction', data);
        return promise.then(data => MsgWalletActionResponse.decode(new BinaryReader(data)));
    }
    walletSpendAction(request) {
        const data = MsgWalletSpendAction.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Msg', 'WalletSpendAction', data);
        return promise.then(data => MsgWalletSpendActionResponse.decode(new BinaryReader(data)));
    }
    provision(request) {
        const data = MsgProvision.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Msg', 'Provision', data);
        return promise.then(data => MsgProvisionResponse.decode(new BinaryReader(data)));
    }
    coreEval(request) {
        const data = MsgCoreEval.encode(request).finish();
        const promise = this.rpc.request('agoric.swingset.Msg', 'CoreEval', data);
        return promise.then(data => MsgCoreEvalResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=msgs.rpc.msg.js.map