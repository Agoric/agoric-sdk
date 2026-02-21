import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgStoreCode, MsgStoreCodeResponse, MsgRemoveChecksum, MsgRemoveChecksumResponse, MsgMigrateContract, MsgMigrateContractResponse, } from '@agoric/cosmic-proto/codegen/ibc/lightclients/wasm/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.storeCode = this.storeCode.bind(this);
        this.removeChecksum = this.removeChecksum.bind(this);
        this.migrateContract = this.migrateContract.bind(this);
    }
    storeCode(request) {
        const data = MsgStoreCode.encode(request).finish();
        const promise = this.rpc.request('ibc.lightclients.wasm.v1.Msg', 'StoreCode', data);
        return promise.then(data => MsgStoreCodeResponse.decode(new BinaryReader(data)));
    }
    removeChecksum(request) {
        const data = MsgRemoveChecksum.encode(request).finish();
        const promise = this.rpc.request('ibc.lightclients.wasm.v1.Msg', 'RemoveChecksum', data);
        return promise.then(data => MsgRemoveChecksumResponse.decode(new BinaryReader(data)));
    }
    migrateContract(request) {
        const data = MsgMigrateContract.encode(request).finish();
        const promise = this.rpc.request('ibc.lightclients.wasm.v1.Msg', 'MigrateContract', data);
        return promise.then(data => MsgMigrateContractResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map