//@ts-nocheck
import type { Rpc } from '@agoric/cosmic-proto/codegen/helpers.js';
export const createRPCMsgClient = async ({ rpc }: { rpc: Rpc }) => ({
  ibc: {
    lightclients: {
      wasm: {
        v1: new (
          await import('./lightclients/wasm/v1/tx.rpc.msg.js')
        ).MsgClientImpl(rpc),
      },
    },
    core: {
      connection: {
        v1: new (
          await import('./core/connection/v1/tx.rpc.msg.js')
        ).MsgClientImpl(rpc),
      },
      client: {
        v1: new (await import('./core/client/v1/tx.rpc.msg.js')).MsgClientImpl(
          rpc,
        ),
      },
      channel: {
        v1: new (await import('./core/channel/v1/tx.rpc.msg.js')).MsgClientImpl(
          rpc,
        ),
      },
    },
    applications: {
      transfer: {
        v1: new (
          await import('./applications/transfer/v1/tx.rpc.msg.js')
        ).MsgClientImpl(rpc),
      },
      interchain_accounts: {
        host: {
          v1: new (
            await import('./applications/interchain_accounts/host/v1/tx.rpc.msg.js')
          ).MsgClientImpl(rpc),
        },
        controller: {
          v1: new (
            await import('./applications/interchain_accounts/controller/v1/tx.rpc.msg.js')
          ).MsgClientImpl(rpc),
        },
      },
    },
  },
  cosmos: {
    vesting: {
      v1beta1: new (
        await import('../cosmos/vesting/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    upgrade: {
      v1beta1: new (
        await import('../cosmos/upgrade/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    staking: {
      v1beta1: new (
        await import('../cosmos/staking/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    mint: {
      v1beta1: new (
        await import('../cosmos/mint/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    group: {
      v1: new (await import('../cosmos/group/v1/tx.rpc.msg.js')).MsgClientImpl(
        rpc,
      ),
    },
    gov: {
      v1beta1: new (
        await import('../cosmos/gov/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
      v1: new (await import('../cosmos/gov/v1/tx.rpc.msg.js')).MsgClientImpl(
        rpc,
      ),
    },
    feegrant: {
      v1beta1: new (
        await import('../cosmos/feegrant/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    distribution: {
      v1beta1: new (
        await import('../cosmos/distribution/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    consensus: {
      v1: new (
        await import('../cosmos/consensus/v1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    circuit: {
      v1: new (
        await import('../cosmos/circuit/v1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    bank: {
      v1beta1: new (
        await import('../cosmos/bank/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    authz: {
      v1beta1: new (
        await import('../cosmos/authz/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
    auth: {
      v1beta1: new (
        await import('../cosmos/auth/v1beta1/tx.rpc.msg.js')
      ).MsgClientImpl(rpc),
    },
  },
});
