import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgStoreCode, MsgStoreCodeResponse, MsgRemoveChecksum, MsgRemoveChecksumResponse, MsgMigrateContract, MsgMigrateContractResponse } from '@agoric/cosmic-proto/codegen/ibc/lightclients/wasm/v1/tx.js';
/** Msg defines the ibc/08-wasm Msg service. */
export interface Msg {
    /** StoreCode defines a rpc handler method for MsgStoreCode. */
    storeCode(request: MsgStoreCode): Promise<MsgStoreCodeResponse>;
    /** RemoveChecksum defines a rpc handler method for MsgRemoveChecksum. */
    removeChecksum(request: MsgRemoveChecksum): Promise<MsgRemoveChecksumResponse>;
    /** MigrateContract defines a rpc handler method for MsgMigrateContract. */
    migrateContract(request: MsgMigrateContract): Promise<MsgMigrateContractResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    storeCode(request: MsgStoreCode): Promise<MsgStoreCodeResponse>;
    removeChecksum(request: MsgRemoveChecksum): Promise<MsgRemoveChecksumResponse>;
    migrateContract(request: MsgMigrateContract): Promise<MsgMigrateContractResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map