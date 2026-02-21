//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgUpdateParams, MsgModuleQuerySafe, } from '@agoric/cosmic-proto/codegen/ibc/applications/interchain_accounts/host/v1/tx.js';
/**
 * UpdateParams defines a rpc handler for MsgUpdateParams.
 * @name updateParams
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto service: ibc.applications.interchain_accounts.host.v1.UpdateParams
 */
export const updateParams = buildTx({
    msg: MsgUpdateParams,
});
/**
 * ModuleQuerySafe defines a rpc handler for MsgModuleQuerySafe.
 * @name moduleQuerySafe
 * @package ibc.applications.interchain_accounts.host.v1
 * @see proto service: ibc.applications.interchain_accounts.host.v1.ModuleQuerySafe
 */
export const moduleQuerySafe = buildTx({
    msg: MsgModuleQuerySafe,
});
//# sourceMappingURL=tx.rpc.func.js.map