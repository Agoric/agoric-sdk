import { BinaryReader } from '@agoric/cosmic-proto/codegen/binary.js';
import { MsgLock, MsgLockResponse, MsgUnlock, MsgUnlockResponse, MsgSetPausedState, MsgSetPausedStateResponse, } from '@agoric/cosmic-proto/codegen/noble/dollar/vaults/v1/tx.js';
export class MsgClientImpl {
    rpc;
    constructor(rpc) {
        this.rpc = rpc;
        this.lock = this.lock.bind(this);
        this.unlock = this.unlock.bind(this);
        this.setPausedState = this.setPausedState.bind(this);
    }
    lock(request) {
        const data = MsgLock.encode(request).finish();
        const promise = this.rpc.request('noble.dollar.vaults.v1.Msg', 'Lock', data);
        return promise.then(data => MsgLockResponse.decode(new BinaryReader(data)));
    }
    unlock(request) {
        const data = MsgUnlock.encode(request).finish();
        const promise = this.rpc.request('noble.dollar.vaults.v1.Msg', 'Unlock', data);
        return promise.then(data => MsgUnlockResponse.decode(new BinaryReader(data)));
    }
    setPausedState(request) {
        const data = MsgSetPausedState.encode(request).finish();
        const promise = this.rpc.request('noble.dollar.vaults.v1.Msg', 'SetPausedState', data);
        return promise.then(data => MsgSetPausedStateResponse.decode(new BinaryReader(data)));
    }
}
export const createClientImpl = (rpc) => {
    return new MsgClientImpl(rpc);
};
//# sourceMappingURL=tx.rpc.msg.js.map