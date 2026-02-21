//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgUpdateParams } from '@agoric/cosmic-proto/codegen/cosmos/consensus/v1/tx.js';
/**
 * UpdateParams defines a governance operation for updating the x/consensus module parameters.
 * The authority is defined in the keeper.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.consensus.v1
 * @see proto service: cosmos.consensus.v1.UpdateParams
 */
export const updateParams = buildTx({
    msg: MsgUpdateParams,
});
//# sourceMappingURL=tx.rpc.func.js.map