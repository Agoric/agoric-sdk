//@ts-nocheck
import { buildTx } from '../../../../helper-func-types.js';
import { MsgTransfer, MsgUpdateParams } from './tx.js';
/**
 * Transfer defines a rpc handler method for MsgTransfer.
 * @name transfer
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.Transfer
 */
export const transfer = buildTx<MsgTransfer>({
  msg: MsgTransfer,
});
/**
 * UpdateParams defines a rpc handler for MsgUpdateParams.
 * @name updateParams
 * @package ibc.applications.transfer.v1
 * @see proto service: ibc.applications.transfer.v1.UpdateParams
 */
export const updateParams = buildTx<MsgUpdateParams>({
  msg: MsgUpdateParams,
});
