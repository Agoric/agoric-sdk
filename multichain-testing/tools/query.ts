import type { JsonSafe } from '@agoric/cosmic-proto';
import type {
  QueryAllBalancesResponseSDKType,
  QueryBalanceResponseSDKType,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import type { QueryDelegationTotalRewardsResponseSDKType } from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js';
import type {
  QueryDelegatorDelegationsResponseSDKType,
  QueryDelegatorUnbondingDelegationsResponseSDKType,
  QueryValidatorsResponseSDKType,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js';
import type { QueryDenomHashResponseSDKType } from '@agoric/cosmic-proto/ibc/applications/transfer/v1/query.js';
import type {
  QueryChannelResponseSDKType,
  QueryChannelsResponseSDKType,
} from '@agoric/cosmic-proto/ibc/core/channel/v1/query.js';
import type { BlockSDKType } from '@agoric/cosmic-proto/tendermint/types/block.js';

// XXX JsonSafe should handle
export type BlockJson = JsonSafe<BlockSDKType> & {
  header: JsonSafe<BlockSDKType['header']> & { time: string };
};

// TODO use telescope generated query client from @agoric/cosmic-proto
// https://github.com/Agoric/agoric-sdk/issues/9200
// TODO: inject fetch
export function makeQueryClient(apiUrl: string) {
  const query = async <T>(path: string): Promise<T> => {
    const maxRetries = 5;
    const retryDelayMS = 500;
    return new Promise<T>((resolve, reject) => {
      const doFetch = async retries => {
        try {
          const response = await fetch(`${apiUrl}${path}`);
          const json = await response.json();
          resolve(json as T);
        } catch (err) {
          if (retries === maxRetries) {
            console.error(err);
            reject(err);
            return;
          }
          setTimeout(() => doFetch(retries + 1), retryDelayMS);
        }
      };
      doFetch(0);
    });
  };

  return {
    query,
    queryBlock: (height?: number) =>
      query<{ block: BlockJson }>(
        `/cosmos/base/tendermint/v1beta1/blocks/${height || 'latest'}`,
      ),
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
