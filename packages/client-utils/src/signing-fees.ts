import {
  QueryParamsRequest,
  QueryParamsResponse,
} from '@agoric/cosmic-proto/agoric/swingset/query.js';
import {
  QueryClient,
  createProtobufRpcClient,
  GasPrice,
} from '@cosmjs/stargate';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';

export type AgoricGasPrices = 'min' | GasPrice;

export const minGasPrices = 'min' as const;

export const selectMinGasPrice = (
  minGasPricesEntries: readonly { denom: string; amount: string }[],
  feeDenom?: string,
) => {
  if (minGasPricesEntries.length === 0) {
    throw Error(
      'cannot resolve gasPrices "min": swingset min_gas_price is empty',
    );
  }
  if (feeDenom) {
    const price = minGasPricesEntries.find(({ denom }) => denom === feeDenom);
    if (!price) {
      throw Error(
        `cannot resolve gasPrices "min": no swingset min_gas_price for ${feeDenom}`,
      );
    }
    return price;
  }
  if (minGasPricesEntries.length > 1) {
    console.warn(
      `warning: gasPrices "min" is ambiguous because swingset min_gas_price has multiple entries; using ${minGasPricesEntries[0].amount}${minGasPricesEntries[0].denom}`,
    );
  }
  return minGasPricesEntries[0];
};

export const makeGasPriceFromMin = (
  minGasPricesEntries: readonly { denom: string; amount: string }[],
  feeDenom?: string,
) => {
  const { amount, denom } = selectMinGasPrice(minGasPricesEntries, feeDenom);
  return GasPrice.fromString(`${amount}${denom}`);
};

export const resolveAgoricGasPrices = async (
  rpcAddr: string,
  gasPrices: AgoricGasPrices = minGasPrices,
  feeDenom?: string,
) => {
  if (gasPrices !== minGasPrices) {
    return gasPrices;
  }
  const tmClient = await Tendermint34Client.connect(rpcAddr);
  try {
    const rpc = createProtobufRpcClient(new QueryClient(tmClient));
    const request = QueryParamsRequest.encode({}).finish();
    const response = await rpc.request(
      'agoric.swingset.Query',
      'Params',
      request,
    );
    const { params } = QueryParamsResponse.decode(response);
    return makeGasPriceFromMin(params.minGasPrice, feeDenom);
  } finally {
    tmClient.disconnect();
  }
};
