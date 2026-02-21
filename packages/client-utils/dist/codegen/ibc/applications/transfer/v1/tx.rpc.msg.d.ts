import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgTransfer, MsgTransferResponse, MsgUpdateParams, MsgUpdateParamsResponse } from '@agoric/cosmic-proto/codegen/ibc/applications/transfer/v1/tx.js';
/** Msg defines the ibc/transfer Msg service. */
export interface Msg {
    /** Transfer defines a rpc handler method for MsgTransfer. */
    transfer(request: MsgTransfer): Promise<MsgTransferResponse>;
    /** UpdateParams defines a rpc handler for MsgUpdateParams. */
    updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    transfer(request: MsgTransfer): Promise<MsgTransferResponse>;
    updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map