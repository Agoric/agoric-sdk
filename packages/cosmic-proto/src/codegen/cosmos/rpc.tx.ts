//@ts-nocheck
import { Rpc } from '../helpers.js';
export const createRPCMsgClient = async ({ rpc }: { rpc: Rpc }) => ({
  cosmos: {
    bank: {
      v1beta1: new (await import('./bank/v1beta1/tx.rpc.msg.js')).MsgClientImpl(
        rpc,
      ),
    },
  },
});
