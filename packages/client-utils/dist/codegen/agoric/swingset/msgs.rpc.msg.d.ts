import type { TxRpc } from '@agoric/cosmic-proto/codegen/types.js';
import { MsgInstallBundle, MsgInstallBundleResponse, MsgDeliverInbound, MsgDeliverInboundResponse, MsgWalletAction, MsgWalletActionResponse, MsgWalletSpendAction, MsgWalletSpendActionResponse, MsgProvision, MsgProvisionResponse, MsgCoreEval, MsgCoreEvalResponse } from '@agoric/cosmic-proto/codegen/agoric/swingset/msgs.js';
/** Transactions. */
export interface Msg {
    /** Install a JavaScript sources bundle on the chain's SwingSet controller. */
    installBundle(request: MsgInstallBundle): Promise<MsgInstallBundleResponse>;
    /** Send inbound messages. */
    deliverInbound(request: MsgDeliverInbound): Promise<MsgDeliverInboundResponse>;
    /** Perform a low-privilege wallet action. */
    walletAction(request: MsgWalletAction): Promise<MsgWalletActionResponse>;
    /** Perform a wallet action that spends assets. */
    walletSpendAction(request: MsgWalletSpendAction): Promise<MsgWalletSpendActionResponse>;
    /** Provision a new endpoint. */
    provision(request: MsgProvision): Promise<MsgProvisionResponse>;
    /** Execute a core evaluation. */
    coreEval(request: MsgCoreEval): Promise<MsgCoreEvalResponse>;
}
export declare class MsgClientImpl implements Msg {
    private readonly rpc;
    constructor(rpc: TxRpc);
    installBundle(request: MsgInstallBundle): Promise<MsgInstallBundleResponse>;
    deliverInbound(request: MsgDeliverInbound): Promise<MsgDeliverInboundResponse>;
    walletAction(request: MsgWalletAction): Promise<MsgWalletActionResponse>;
    walletSpendAction(request: MsgWalletSpendAction): Promise<MsgWalletSpendActionResponse>;
    provision(request: MsgProvision): Promise<MsgProvisionResponse>;
    coreEval(request: MsgCoreEval): Promise<MsgCoreEvalResponse>;
}
export declare const createClientImpl: (rpc: TxRpc) => MsgClientImpl;
//# sourceMappingURL=msgs.rpc.msg.d.ts.map