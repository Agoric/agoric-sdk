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
  };
};
