//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgUpdateParams } from '@agoric/cosmic-proto/codegen/cosmos/auth/v1beta1/tx.js';
/**
 * UpdateParams defines a (governance) operation for updating the x/auth module
 * parameters. The authority defaults to the x/gov module account.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.auth.v1beta1
 * @see proto service: cosmos.auth.v1beta1.UpdateParams
 */
export const updateParams = buildTx({
    msg: MsgUpdateParams,
});
//# sourceMappingURL=tx.rpc.func.js.map