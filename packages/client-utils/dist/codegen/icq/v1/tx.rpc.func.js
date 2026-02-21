//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgUpdateParams } from '@agoric/cosmic-proto/codegen/icq/v1/tx.js';
/**
 * UpdateParams defines a governance operation for updating the x/async-icq module
 * parameters. The authority is hard-coded to the x/gov module account.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package icq.v1
 * @see proto service: icq.v1.UpdateParams
 */
export const updateParams = buildTx({
    msg: MsgUpdateParams,
});
//# sourceMappingURL=tx.rpc.func.js.map