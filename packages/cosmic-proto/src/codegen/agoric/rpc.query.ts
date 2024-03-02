//@ts-nocheck
import { Tendermint34Client, HttpEndpoint } from '@cosmjs/tendermint-rpc';
import { QueryClient } from '@cosmjs/stargate';
export const createRPCQueryClient = async ({
  rpcEndpoint,
}: {
  rpcEndpoint: string | HttpEndpoint;
}) => {
  const tmClient = await Tendermint34Client.connect(rpcEndpoint);
  const client = new QueryClient(tmClient);
  return {
    agoric: {
      swingset: (
        await import('./swingset/query.rpc.Query.js')
      ).createRpcQueryExtension(client),
      vbank: (
        await import('./vbank/query.rpc.Query.js')
      ).createRpcQueryExtension(client),
      vstorage: (
        await import('./vstorage/query.rpc.Query.js')
      ).createRpcQueryExtension(client),
    },
    cosmos: {
      auth: {
        v1beta1: (
          await import('../cosmos/auth/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      authz: {
        v1beta1: (
          await import('../cosmos/authz/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      bank: {
        v1beta1: (
          await import('../cosmos/bank/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      staking: {
        v1beta1: (
          await import('../cosmos/staking/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      tx: {
        v1beta1: (
          await import('../cosmos/tx/v1beta1/service.rpc.Service.js')
        ).createRpcQueryExtension(client),
      },
    },
  };
};
