import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgSoftwareUpgrade, MsgSoftwareUpgradeResponse, MsgCancelUpgrade, MsgCancelUpgradeResponse, } from '@agoric/cosmic-proto/codegen/cosmos/upgrade/v1beta1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.softwareUpgrade = this.softwareUpgrade.bind(this);
        this.cancelUpgrade = this.cancelUpgrade.bind(this);
    }
    softwareUpgrade(request) {
        const data = MsgSoftwareUpgrade.encode(request).finish();
        const promise = this.rpc.request('cosmos.upgrade.v1beta1.Msg', 'SoftwareUpgrade', data);
        return promise.then(data => MsgSoftwareUpgradeResponse.decode(new BinaryReader(data)));
    }
    cancelUpgrade(request) {
        const data = MsgCancelUpgrade.encode(request).finish();
        const promise = this.rpc.request('cosmos.upgrade.v1beta1.Msg', 'CancelUpgrade', data);
        return promise.then(data => MsgCancelUpgradeResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map