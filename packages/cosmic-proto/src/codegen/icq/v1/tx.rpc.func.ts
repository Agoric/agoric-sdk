//@ts-nocheck
import { buildTx } from '../../helper-func-types.js';
import { MsgUpdateParams } from './tx.js';
/**
 * UpdateParams defines a governance operation for updating the x/async-icq module
 * parameters. The authority is hard-coded to the x/gov module account.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package icq.v1
 * @see proto service: icq.v1.UpdateParams
 */
export const updateParams = buildTx<MsgUpdateParams>({
  msg: MsgUpdateParams,
});
