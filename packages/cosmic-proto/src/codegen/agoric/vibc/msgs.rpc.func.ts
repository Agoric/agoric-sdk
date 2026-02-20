//@ts-nocheck
import { buildTx } from '../../helper-func-types.js';
import { MsgSendPacket } from './msgs.js';
/**
 * Force sending an arbitrary packet on a channel.
 * @name sendPacket
 * @package agoric.vibc
 * @see proto service: agoric.vibc.SendPacket
 */
export const sendPacket = buildTx<MsgSendPacket>({
  msg: MsgSendPacket,
});
