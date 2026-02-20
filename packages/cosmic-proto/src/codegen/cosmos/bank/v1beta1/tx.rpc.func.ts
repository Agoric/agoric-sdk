//@ts-nocheck
import { buildTx } from '../../../helper-func-types.js';
import {
  MsgSend,
  MsgMultiSend,
  MsgUpdateParams,
  MsgSetSendEnabled,
} from './tx.js';
/**
 * Send defines a method for sending coins from one account to another account.
 * @name send
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.Send
 */
export const send = buildTx<MsgSend>({
  msg: MsgSend,
});
/**
 * MultiSend defines a method for sending coins from some accounts to other accounts.
 * @name multiSend
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.MultiSend
 */
export const multiSend = buildTx<MsgMultiSend>({
  msg: MsgMultiSend,
});
/**
 * UpdateParams defines a governance operation for updating the x/bank module parameters.
 * The authority is defined in the keeper.
 *
 * Since: cosmos-sdk 0.47
 * @name updateParams
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.UpdateParams
 */
export const updateParams = buildTx<MsgUpdateParams>({
  msg: MsgUpdateParams,
});
/**
 * SetSendEnabled is a governance operation for setting the SendEnabled flag
 * on any number of Denoms. Only the entries to add or update should be
 * included. Entries that already exist in the store, but that aren't
 * included in this message, will be left unchanged.
 *
 * Since: cosmos-sdk 0.47
 * @name setSendEnabled
 * @package cosmos.bank.v1beta1
 * @see proto service: cosmos.bank.v1beta1.SetSendEnabled
 */
export const setSendEnabled = buildTx<MsgSetSendEnabled>({
  msg: MsgSetSendEnabled,
});
