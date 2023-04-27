import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import { QueryClientImpl } from 'cosmjs-types/cosmos/bank/v1beta1/query';

/**
 * @param {string} address
 * @param {string} rpc
 */
export const queryBankBalances = async (address, rpc) => {
  const tendermint = await Tendermint34Client.connect(rpc);
  const queryClient = new QueryClient(tendermint);
  const rpcClient = createProtobufRpcClient(queryClient);
  const bankQueryService = new QueryClientImpl(rpcClient);

  const { balances } = await bankQueryService.AllBalances({
    address,
  });

  return balances;
};
