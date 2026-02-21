import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgLock, MsgLockResponse, MsgUnlock, MsgUnlockResponse, MsgSetPausedState, MsgSetPausedStateResponse } from '@agoric/cosmic-proto/codegen/noble/dollar/vaults/v1/tx.js';
export interface Msg {
    lock(request: MsgLock): Promise<MsgLockResponse>;
    unlock(request: MsgUnlock): Promise<MsgUnlockResponse>;
    setPausedState(request: MsgSetPausedState): Promise<MsgSetPausedStateResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    lock(request: MsgLock): Promise<MsgLockResponse>;
    unlock(request: MsgUnlock): Promise<MsgUnlockResponse>;
    setPausedState(request: MsgSetPausedState): Promise<MsgSetPausedStateResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map