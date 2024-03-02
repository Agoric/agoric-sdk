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
    cosmos: {
      auth: {
        v1beta1: (
          await import('./auth/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      authz: {
        v1beta1: (
          await import('./authz/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      bank: {
        v1beta1: (
          await import('./bank/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      staking: {
        v1beta1: (
          await import('./staking/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
    },
  };
};
