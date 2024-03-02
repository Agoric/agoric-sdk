//@ts-nocheck
import { Rpc } from '../helpers.js';
export const createRPCMsgClient = async ({ rpc }: { rpc: Rpc }) => ({
  cosmos: {
    authz: {
      v1beta1: new (
        await import('./authz/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    bank: {
      v1beta1: new (await import('./bank/v1beta1/tx.rpc.msg.js')).MsgClientImpl(
        rpc,
      ),
    },
    staking: {
      v1beta1: new (
        await import('./staking/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
  },
});
