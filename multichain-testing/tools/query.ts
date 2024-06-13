import type {
  QueryAllBalancesResponse,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';

// TODO use telescope generated query client from @agoric/cosmic-proto
export function makeQueryClient(apiUrl: string) {
  const query = async <T>(path: string): Promise<T> => {
    try {
      const res = await fetch(`${apiUrl}${path}`);
      const json = await res.json();
      return json as T;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return {
    query,
    queryBalances: (address: string) =>
      query<QueryAllBalancesResponse>(
        `/cosmos/bank/v1beta1/balances/${address}`,
      ),
    queryBalance: (address: string, denom: string) =>
      query<QueryBalanceResponse>(
        `/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${denom}`,
      ),
  };
}
