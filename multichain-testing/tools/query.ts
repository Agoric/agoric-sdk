import type {
  QueryAllBalancesResponseSDKType,
  QueryBalanceResponseSDKType,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import type { QueryDelegationTotalRewardsResponseSDKType } from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js';
import type { QueryValidatorsResponseSDKType } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js';
import type { QueryDelegatorDelegationsResponseSDKType } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js';
import type { QueryDelegatorUnbondingDelegationsResponseSDKType } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js';
import type { QueryDenomHashResponseSDKType } from '@agoric/cosmic-proto/ibc/applications/transfer/v1/query.js';
import type { QueryChannelResponseSDKType } from '@agoric/cosmic-proto/ibc/core/channel/v1/query.js';
import { QueryChannelsResponseSDKType } from '@agoric/cosmic-proto/ibc/core/channel/v1/query.js';

// TODO use telescope generated query client from @agoric/cosmic-proto
// https://github.com/Agoric/agoric-sdk/issues/9200
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
      query<QueryAllBalancesResponseSDKType>(
        `/cosmos/bank/v1beta1/balances/${address}`,
      ),
    queryBalance: (address: string, denom: string) =>
      query<QueryBalanceResponseSDKType>(
        `/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${denom}`,
      ),
    queryValidators: () =>
      query<QueryValidatorsResponseSDKType>(
        '/cosmos/staking/v1beta1/validators',
      ),
    queryDelegations: (delegatorAddr: string) =>
      query<QueryDelegatorDelegationsResponseSDKType>(
        `/cosmos/staking/v1beta1/delegations/${delegatorAddr}`,
      ),
    queryUnbonding: (delegatorAddr: string) =>
      query<QueryDelegatorUnbondingDelegationsResponseSDKType>(
        `/cosmos/staking/v1beta1/delegators/${delegatorAddr}/unbonding_delegations`,
      ),
    queryRewards: (delegatorAdddr: string) =>
      query<QueryDelegationTotalRewardsResponseSDKType>(
        `/cosmos/distribution/v1beta1/delegators/${delegatorAdddr}/rewards`,
      ),
    queryDenom: (path: string, baseDenom: string) =>
      query<QueryDenomHashResponseSDKType>(
        `/ibc/apps/transfer/v1/denom_hashes/${path}/${baseDenom}`,
      ),
    queryChannel: (portID: string, channelID: string) =>
      query<QueryChannelResponseSDKType>(
        `/ibc/core/channel/v1/channels/${channelID}/ports/${portID}`,
      ),
    queryChannels: () =>
      query<QueryChannelsResponseSDKType>(`/ibc/core/channel/v1/channels`),
  };
}
