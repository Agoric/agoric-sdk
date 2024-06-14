import type {
  QueryAllBalancesResponse,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import type { QueryValidatorsResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js';

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
    queryValidators: () =>
      query<QueryValidatorsResponse>('/cosmos/staking/v1beta1/validators'),
    queryDelegations: (delegatorAddr: string) =>
      query<{
        delegation_responses: {
          delegation: {
            delegator_address: string;
            validator_address: string;
            shares: string;
          };
          balance: {
            denom: string;
            amount: string;
          };
        }[];
      }>(`/cosmos/staking/v1beta1/delegations/${delegatorAddr}`),
    queryUnbonding: (delegatorAddr: string) =>
      query<{
        unbonding_responses: {
          entries: {
            balance: string;
            completion_time: string;
            initial_balance: string;
            validator_address: string;
          }[];
        }[];
      }>(
        `/cosmos/staking/v1beta1/delegators/${delegatorAddr}/unbonding_delegations`,
      ),
    queryRewards: (delegatorAdddr: string) =>
      query<{
        rewards: {
          validator_address: string;
          rewards: {
            denom: string;
            amount: string;
          };
        }[];
      }>(`/cosmos/distribution/v1beta1/delegators/${delegatorAdddr}/rewards`),
  };
}
