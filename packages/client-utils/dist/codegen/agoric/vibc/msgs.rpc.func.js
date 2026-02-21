//@ts-nocheck
import { buildTx } from '@agoric/cosmic-proto/codegen/helper-func-types.js';
import { MsgSendPacket } from '@agoric/cosmic-proto/codegen/agoric/vibc/msgs.js';
/**
 * Force sending an arbitrary packet on a channel.
 * @name sendPacket
 * @package agoric.vibc
 * @see proto service: agoric.vibc.SendPacket
 */
export const sendPacket = buildTx({
    msg: MsgSendPacket,
});
//# sourceMappingURL=msgs.rpc.func.js.map