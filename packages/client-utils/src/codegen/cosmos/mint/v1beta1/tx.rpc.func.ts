//@ts-nocheck
import { buildTx } from '../../../helper-func-types.js';
import { MsgUpdateParams } from './tx.js';
/**
 * UpdateParams defines a governance operation for updating the x/mint module
 * parameters. The authority is defaults to the x/gov module account.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.mint.v1beta1
 * @see proto service: cosmos.mint.v1beta1.UpdateParams
 */
export const updateParams = buildTx<MsgUpdateParams>({
  msg: MsgUpdateParams,
});
