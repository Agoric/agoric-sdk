import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgUpdateParams, MsgUpdateParamsResponse, MsgModuleQuerySafe, MsgModuleQuerySafeResponse } from '@agoric/cosmic-proto/codegen/ibc/applications/interchain_accounts/host/v1/tx.js';
/** Msg defines the 27-interchain-accounts/host Msg service. */
export interface Msg {
    /** UpdateParams defines a rpc handler for MsgUpdateParams. */
    updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
    /** ModuleQuerySafe defines a rpc handler for MsgModuleQuerySafe. */
    moduleQuerySafe(request: MsgModuleQuerySafe): Promise<MsgModuleQuerySafeResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
    moduleQuerySafe(request: MsgModuleQuerySafe): Promise<MsgModuleQuerySafeResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map