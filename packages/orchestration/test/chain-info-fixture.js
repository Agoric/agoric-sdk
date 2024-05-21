/** @import {CosmosChainInfo} from '../src/cosmos-api'; */

/** @type {Record<string, Pick<CosmosChainInfo, 'ibcConnectionInfo' | 'chainId'>>} */
export const agoricPeerInfo = {
  osmosis: {
    // agd query ibc connection connections |
    // jq '.connections | .[] | select(.id == "connection-1")
    ibcConnectionInfo: {
      id: 'connection-1',
      client_id: '07-tendermint-1',
      versions: [
        {
          identifier: '1',
          features: ['ORDER_ORDERED', 'ORDER_UNORDERED'],
        },
      ],
      state: 'OPEN', // query returns STATE_OPEN
      counterparty: {
        client_id: '07-tendermint-2109',
        connection_id: 'connection-1649',
        prefix: {
          key_prefix: 'aWJj',
        },
      },
      delay_period: 0n,
    },
    // agd query ibc client state 07-tendermint-1
    chainId: 'osmosis-1',
  },
};

export const chainRegistryInfo = {
  celestia: {
    // https://github.com/cosmos/chain-registry/blob/master/celestia/chain.json#L28C4-L32C6
    // but staking_tokens -> stakingTokens
    stakingTokens: [
      {
        denom: 'utia',
      },
    ],
  },
};
