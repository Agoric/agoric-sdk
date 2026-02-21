//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgInstallBundle, MsgDeliverInbound, MsgWalletAction, MsgWalletSpendAction, MsgProvision, MsgCoreEval, } from '@agoric/cosmic-proto/codegen/agoric/swingset/msgs.js';
/**
 * Install a JavaScript sources bundle on the chain's SwingSet controller.
 * @name installBundle
 * @package agoric.swingset
 * @see proto service: agoric.swingset.InstallBundle
 */
export const installBundle = buildTx({
    msg: MsgInstallBundle,
});
/**
 * Send inbound messages.
 * @name deliverInbound
 * @package agoric.swingset
 * @see proto service: agoric.swingset.DeliverInbound
 */
export const deliverInbound = buildTx({
    msg: MsgDeliverInbound,
});
/**
 * Perform a low-privilege wallet action.
 * @name walletAction
 * @package agoric.swingset
 * @see proto service: agoric.swingset.WalletAction
 */
export const walletAction = buildTx({
    msg: MsgWalletAction,
});
/**
 * Perform a wallet action that spends assets.
 * @name walletSpendAction
 * @package agoric.swingset
 * @see proto service: agoric.swingset.WalletSpendAction
 */
export const walletSpendAction = buildTx({
    msg: MsgWalletSpendAction,
});
/**
 * Provision a new endpoint.
 * @name provision
 * @package agoric.swingset
 * @see proto service: agoric.swingset.Provision
 */
export const provision = buildTx({
    msg: MsgProvision,
});
/**
 * Execute a core evaluation.
 * @name coreEval
 * @package agoric.swingset
 * @see proto service: agoric.swingset.CoreEval
 */
export const coreEval = buildTx({
    msg: MsgCoreEval,
});
//# sourceMappingURL=msgs.rpc.func.js.map