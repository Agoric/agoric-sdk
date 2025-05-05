/** @file Hand-written based on agoricdev-25 as of 2025-05-02T04:06:00Z */
export default /** @type {const} */ ({
  agoric: {
    bech32Prefix: 'agoric',
    chainId: 'agoricdev-25',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'agoricdev-25',
    stakingTokens: [
      {
        denom: 'ubld',
      },
    ],
    connections: {
      'axelar-testnet-lisbon-3': {
        id: 'connection-7',
        client_id: '07-tendermint-7',
        counterparty: {
          client_id: '07-tendermint-1107',
          connection_id: 'connection-863',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-6',
          portId: 'transfer',
          counterPartyChannelId: 'channel-599',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
      'pion-1': {
        id: 'connection-9',
        client_id: '07-tendermint-9',
        counterparty: {
          client_id: '07-tendermint-602',
          connection_id: 'connection-558',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-7',
          portId: 'transfer',
          counterPartyChannelId: 'channel-1748',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
      'grand-1': {
        id: 'connection-13',
        client_id: '07-tendermint-13',
        counterparty: {
          client_id: '07-tendermint-432',
          connection_id: 'connection-396',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-11',
          portId: 'transfer',
          counterPartyChannelId: 'channel-337',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
      'osmo-test-5': {
        id: 'connection-6',
        client_id: '07-tendermint-6',
        counterparty: {
          client_id: '07-tendermint-4596',
          connection_id: 'connection-3957',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-5',
          portId: 'transfer',
          counterPartyChannelId: 'channel-10293',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  axelar: {
    bech32Prefix: 'axelar',
    chainId: 'axelar-testnet-lisbon-3',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'axelar-testnet-lisbon-3',
    stakingTokens: [
      {
        denom: 'uaxl',
      },
    ],
    connections: {
      'agoricdev-25': {
        id: 'connection-1107',
        client_id: '07-tendermint-863',
        counterparty: {
          client_id: '07-tendermint-7',
          connection_id: 'connection-7',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-599',
          portId: 'transfer',
          counterPartyChannelId: 'channel-6',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  neutron: {
    bech32Prefix: 'neutron',
    chainId: 'pion-1',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'pion-1',
    stakingTokens: [
      {
        denom: 'untrn',
      },
    ],
    connections: {
      'agoricdev-25': {
        id: 'connection-558',
        client_id: '07-tendermint-602',
        counterparty: {
          client_id: '07-tendermint-9',
          connection_id: 'connection-9',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-1748',
          portId: 'transfer',
          counterPartyChannelId: 'channel-7',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  noble: {
    bech32Prefix: 'noble',
    chainId: 'grand-1',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'grand-1',
    stakingTokens: [
      {
        denom: 'unoble',
      },
    ],
    connections: {
      'agoricdev-25': {
        id: 'connection-396',
        client_id: '07-tendermint-432',
        counterparty: {
          client_id: '07-tendermint-13',
          connection_id: 'connection-13',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-337',
          portId: 'transfer',
          counterPartyChannelId: 'channel-11',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  osmosis: {
    bech32Prefix: 'osmo',
    chainId: 'osmo-test-5',
    icqEnabled: true,
    namespace: 'cosmos',
    reference: 'osmo-test-5',
    stakingTokens: [
      {
        denom: 'uosmo',
      },
    ],
    connections: {
      'agoricdev-25': {
        id: 'connection-3957',
        client_id: '07-tendermint-4596',
        counterparty: {
          client_id: '07-tendermint-6',
          connection_id: 'connection-6',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-10293',
          portId: 'transfer',
          counterPartyChannelId: 'channel-5',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
});
