//@ts-nocheck
import { buildTx } from '../../../../../helper-func-types.js';
import {
  MsgRegisterInterchainAccount,
  MsgSendTx,
  MsgUpdateParams,
} from './tx.js';
/**
 * RegisterInterchainAccount defines a rpc handler for MsgRegisterInterchainAccount.
 * @name registerInterchainAccount
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto service: ibc.applications.interchain_accounts.controller.v1.RegisterInterchainAccount
 */
export const registerInterchainAccount = buildTx<MsgRegisterInterchainAccount>({
  msg: MsgRegisterInterchainAccount,
});
/**
 * SendTx defines a rpc handler for MsgSendTx.
 * @name sendTx
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto service: ibc.applications.interchain_accounts.controller.v1.SendTx
 */
export const sendTx = buildTx<MsgSendTx>({
  msg: MsgSendTx,
});
/**
 * UpdateParams defines a rpc handler for MsgUpdateParams.
 * @name updateParams
 * @package ibc.applications.interchain_accounts.controller.v1
 * @see proto service: ibc.applications.interchain_accounts.controller.v1.UpdateParams
 */
export const updateParams = buildTx<MsgUpdateParams>({
  msg: MsgUpdateParams,
});
