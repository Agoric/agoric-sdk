import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgRegisterInterchainAccount, MsgRegisterInterchainAccountResponse, MsgSendTx, MsgSendTxResponse, MsgUpdateParams, MsgUpdateParamsResponse } from '@agoric/cosmic-proto/codegen/ibc/applications/interchain_accounts/controller/v1/tx.js';
/** Msg defines the 27-interchain-accounts/controller Msg service. */
export interface Msg {
    /** RegisterInterchainAccount defines a rpc handler for MsgRegisterInterchainAccount. */
    registerInterchainAccount(request: MsgRegisterInterchainAccount): Promise<MsgRegisterInterchainAccountResponse>;
    /** SendTx defines a rpc handler for MsgSendTx. */
    sendTx(request: MsgSendTx): Promise<MsgSendTxResponse>;
    /** UpdateParams defines a rpc handler for MsgUpdateParams. */
    updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    registerInterchainAccount(request: MsgRegisterInterchainAccount): Promise<MsgRegisterInterchainAccountResponse>;
    sendTx(request: MsgSendTx): Promise<MsgSendTxResponse>;
    updateParams(request: MsgUpdateParams): Promise<MsgUpdateParamsResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=tx.rpc.msg.d.ts.map