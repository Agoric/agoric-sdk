//@ts-nocheck
import { Rpc } from '../helpers.js';
export const createRPCMsgClient = async ({ rpc }: { rpc: Rpc }) => ({
  cosmos: {
    authz: {
      v1beta1: new (
        await import('../cosmos/authz/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    bank: {
      v1beta1: new (
        await import('../cosmos/bank/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    staking: {
      v1beta1: new (
        await import('../cosmos/staking/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
  },
  ibc: {
    applications: {
      interchain_accounts: {
        controller: {
          v1: new (
            await import(
              './applications/interchain_accounts/controller/v1/tx.rpc.msg.js'
            )
          ).MsgClientImpl(rpc),
        },
      },
      transfer: {
        v1: new (
          await import('./applications/transfer/v1/tx.rpc.msg.js')
        ).MsgClientImpl(rpc),
      },
    },
  },
});
