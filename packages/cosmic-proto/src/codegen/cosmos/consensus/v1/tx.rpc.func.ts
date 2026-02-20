//@ts-nocheck
import { buildTx } from '../../../helper-func-types.js';
import { MsgUpdateParams } from './tx.js';
/**
 * UpdateParams defines a governance operation for updating the x/consensus module parameters.
 * The authority is defined in the keeper.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.consensus.v1
 * @see proto service: cosmos.consensus.v1.UpdateParams
 */
export const updateParams = buildTx<MsgUpdateParams>({
  msg: MsgUpdateParams,
});
