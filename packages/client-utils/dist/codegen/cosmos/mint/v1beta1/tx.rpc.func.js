//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgUpdateParams } from '@agoric/cosmic-proto/codegen/cosmos/mint/v1beta1/tx.js';
/**
 * UpdateParams defines a governance operation for updating the x/mint module
 * parameters. The authority is defaults to the x/gov module account.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.mint.v1beta1
 * @see proto service: cosmos.mint.v1beta1.UpdateParams
 */
export const updateParams = buildTx({
    msg: MsgUpdateParams,
});
//# sourceMappingURL=tx.rpc.func.js.map