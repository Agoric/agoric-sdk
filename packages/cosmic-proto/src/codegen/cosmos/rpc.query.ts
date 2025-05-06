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
      base: {
        node: {
          v1beta1: (
            await import('./base/node/v1beta1/query.rpc.Service.js')
          ).createRpcQueryExtension(client),
        },
      },
      distribution: {
        v1beta1: (
          await import('./distribution/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      feegrant: {
        v1beta1: (
          await import('./feegrant/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      gov: {
        v1: (
          await import('./gov/v1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
        v1beta1: (
          await import('./gov/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      group: {
        v1: (
          await import('./group/v1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      mint: {
        v1beta1: (
          await import('./mint/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      params: {
        v1beta1: (
          await import('./params/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      staking: {
        v1beta1: (
          await import('./staking/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
      tx: {
        v1beta1: (
          await import('./tx/v1beta1/service.rpc.Service.js')
        ).createRpcQueryExtension(client),
      },
      upgrade: {
        v1beta1: (
          await import('./upgrade/v1beta1/query.rpc.Query.js')
        ).createRpcQueryExtension(client),
      },
    },
  };
};
