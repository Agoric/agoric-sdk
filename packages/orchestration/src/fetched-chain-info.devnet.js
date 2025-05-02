/** @file Hand-written based on current devnet as of 2025-05-02T04:06:00Z */
export default /** @type {const} */ ({
  agoricdevnet: {
    bech32Prefix: 'agoric',
    chainId: 'agoricdev-25',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'agoricdevnet',
    stakingTokens: [
      {
        denom: 'ubld',
      },
    ],
    connections: {
      axelartestnet: {
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
          counterpartyChannelId: 'channel-599',
          counterpartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
      neutrontestnet: {
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
          counterpartyChannelId: 'channel-1748',
          counterpartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
      nobletestnet: {
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
          counterpartyChannelId: 'channel-337',
          counterpartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
      osmosistestnet: {
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
          counterpartyChannelId: 'channel-10293',
          counterpartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  axelartestnet: {
    bech32Prefix: 'axelar',
    chainId: 'axelar-testnet-lisbon-3',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'axelartestnet',
    stakingTokens: [
      {
        denom: 'uaxl',
      },
    ],
    connections: {
      agoricdevnet: {
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
          counterpartyChannelId: 'channel-6',
          counterpartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  neutrontestnet: {
    bech32Prefix: 'neutron',
    chainId: 'pion-1',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'neutrontestnet',
    stakingTokens: [
      {
        denom: 'untrn',
      },
    ],
    connections: {
      agoricdevnet: {
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
          counterpartyChannelId: 'channel-7',
          counterpartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  nobletestnet: {
    bech32Prefix: 'noble',
    chainId: 'grand-1',
    icqEnabled: false,
    namespace: 'cosmos',
    reference: 'nobletestnet',
    stakingTokens: [
      {
        denom: 'unoble',
      },
    ],
    connections: {
      agoricdevnet: {
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
          counterpartyChannelId: 'channel-11',
          counterpartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
  osmosistestnet: {
    bech32Prefix: 'osmo',
    chainId: 'osmo-test-5',
    icqEnabled: true,
    namespace: 'cosmos',
    reference: 'osmosistestnet',
    stakingTokens: [
      {
        denom: 'uosmo',
      },
    ],
    connections: {
      agoricdevnet: {
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
          counterpartyChannelId: 'channel-5',
          counterpartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
});
