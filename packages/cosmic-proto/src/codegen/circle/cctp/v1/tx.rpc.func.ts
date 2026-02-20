//@ts-nocheck
import { buildTx } from '../../../helper-func-types.js';
import { MsgDepositForBurn, MsgDepositForBurnWithCaller } from './tx.js';
/**
 * rpc AcceptOwner(MsgAcceptOwner) returns (MsgAcceptOwnerResponse);
 * rpc AddRemoteTokenMessenger(MsgAddRemoteTokenMessenger) returns (MsgAddRemoteTokenMessengerResponse);
 * @name depositForBurn
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.DepositForBurn
 */
export const depositForBurn = buildTx<MsgDepositForBurn>({
  msg: MsgDepositForBurn,
});
/**
 * @name depositForBurnWithCaller
 * @package circle.cctp.v1
 * @see proto service: circle.cctp.v1.DepositForBurnWithCaller
 */
export const depositForBurnWithCaller = buildTx<MsgDepositForBurnWithCaller>({
  msg: MsgDepositForBurnWithCaller,
});
