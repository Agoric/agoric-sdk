/** @import {CosmosChainInfo, IBCConnectionInfo} from '../src/cosmos-api'; */

/** @type {IBCConnectionInfo[]} */
export const agoricPeerInfo = [
  {
    // agd query ibc connection connections |
    // jq '.connections | .[] | select(.id == "connection-1")

    id: 'connection-1',
    client_id: '07-tendermint-1',
    versions: [
      {
        identifier: '1',
        features: ['ORDER_ORDERED', 'ORDER_UNORDERED'],
      },
    ],
    state: 3, // STATE_OPEN
    counterparty: {
      client_id: '07-tendermint-2109',
      connection_id: 'connection-1649',
      prefix: {
        key_prefix: 'aWJj',
      },
    },
    delay_period: 0n,
    transferChannel: {
      counterPartyChannelId: 'channel-1',
      counterPartyPortId: 'transfer',
      version: 'ics20-1',

      channelId: 'channel-0',
      portId: 'transfer',
      ordering: 1, // ORDER_UNORDERED
      state: 3, // STATE_OPEN
    },
  },
];

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
  osmosis: {
    // also: agd query ibc client state 07-tendermint-1
    chainId: 'osmosis-1',
  },
};
