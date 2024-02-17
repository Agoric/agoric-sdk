//@ts-nocheck
import { Rpc } from '../helpers.js';
export const createRPCMsgClient = async ({ rpc }: { rpc: Rpc }) => ({
  agoric: {
    swingset: new (await import('./swingset/msgs.rpc.msg.js')).MsgClientImpl(
      rpc,
    ),
    vibc: new (await import('./vibc/msgs.rpc.msg.js')).MsgClientImpl(rpc),
  },
});
