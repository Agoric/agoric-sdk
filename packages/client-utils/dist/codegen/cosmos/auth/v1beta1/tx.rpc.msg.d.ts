import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgUpdateParams, MsgUpdateParamsResponse } from '@agoric/cosmic-proto/codegen/cosmos/auth/v1beta1/tx.js';
/** Msg defines the x/auth Msg service. */
export interface Msg {
    /**
     * UpdateParams defines a (governance) operation for updating the x/auth module
     * parameters. The authority defaults to the x/gov module account.
     *
     * Since: cosmos-sdk 0.47
     */
    updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map