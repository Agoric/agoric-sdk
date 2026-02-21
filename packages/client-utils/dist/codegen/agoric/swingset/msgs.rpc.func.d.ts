import { MsgInstallBundle, MsgDeliverInbound, MsgWalletAction, MsgWalletSpendAction, MsgProvision, MsgCoreEval } from '@agoric/cosmic-proto/codegen/agoric/swingset/msgs.js';
/**
 * Install a JavaScript sources bundle on the chain's SwingSet controller.
 * @name installBundle
 * @package agoric.swingset
 * @see proto service: agoric.swingset.InstallBundle
 */
export declare const installBundle: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgInstallBundle | MsgInstallBundle[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Send inbound messages.
 * @name deliverInbound
 * @package agoric.swingset
 * @see proto service: agoric.swingset.DeliverInbound
 */
export declare const deliverInbound: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgDeliverInbound | MsgDeliverInbound[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Perform a low-privilege wallet action.
 * @name walletAction
 * @package agoric.swingset
 * @see proto service: agoric.swingset.WalletAction
 */
export declare const walletAction: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgWalletAction | MsgWalletAction[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Perform a wallet action that spends assets.
 * @name walletSpendAction
 * @package agoric.swingset
 * @see proto service: agoric.swingset.WalletSpendAction
 */
export declare const walletSpendAction: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgWalletSpendAction | MsgWalletSpendAction[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Provision a new endpoint.
 * @name provision
 * @package agoric.swingset
 * @see proto service: agoric.swingset.Provision
 */
export declare const provision: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgProvision | MsgProvision[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
/**
 * Execute a core evaluation.
 * @name coreEval
 * @package agoric.swingset
 * @see proto service: agoric.swingset.CoreEval
 */
export declare const coreEval: (client: import("@interchainjs/cosmos").ISigningClient, signerAddress: string, message: MsgCoreEval | MsgCoreEval[], fee: import("@agoric/cosmic-proto/codegen/types.js").StdFee | "auto", memo: string) => Promise<import("@interchainjs/types").DeliverTxResponse>;
//# sourceMappingURL=msgs.rpc.func.d.ts.map