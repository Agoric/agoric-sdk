/**
 * Generated using gRPC queries to local simulated chains
 * See {@link https://github.com/Agoric/agoric-sdk/blob/43e0249502171e82460be7cf4bad8baf5db5aafd/packages/cosmic-proto/test/snapshots/test-chain-info.js.md | snapshots} and
 * their {@link https://github.com/Agoric/agoric-sdk/blob/43e0249502171e82460be7cf4bad8baf5db5aafd/packages/cosmic-proto/test/test-chain-info.js | source test}.

 * // TODO check in some portion of above code
 */
export const mockChainInfo = {
  agoric: {
    icaParams: {
      allowMessages: [
        '/agoric.*',
        '/ibc.*',
        '/cosmos.[a-rt-z]*',
        '/cosmos.s[a-su-z]*',
      ],
      hostEnabled: true,
    },
    icqParams: {
      hostEnabled: false,
    },
    chainId: 'agoriclocal',
    bondDenom: 'ubld',
    denoms: [
      {
        denom: 'ubld',
        native: true,
      },
      {
        denom: 'uist',
        native: true,
      },
      {
        baseDenom: 'uion',
        denom:
          'ibc/F7E92EE59B5428793F3EF5C1A4CB2494F61A9D0C9A69469D02390714A1372E16',
        path: 'transfer/channel-0',
      },
      {
        baseDenom: 'uosmo',
        denom:
          'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518',
        path: 'transfer/channel-0',
      },
      {
        baseDenom: 'uatom',
        denom:
          'ibc/C4CFF46FD6DE35CA4CF4CE031E643C8FDC9BA4B99AE598E9B0ED98FE3A2319F9',
        path: 'transfer/channel-1',
      },
    ],
    connections: [
      {
        chainId: 'osmosis-test',
        connectionInfo: {
          clientId: '07-tendermint-2',
          counterparty: {
            clientId: '07-tendermint-2',
            connectionId: 'connection-1',
          },
          id: 'connection-0',
          state: 'STATE_OPEN',
        },
        lastUpdated: {
          revisionHeight: 831n,
          revisionNumber: 0n,
        },
        transferChannels: [
          {
            counterpartyChannelId: 'channel-1',
            counterpartyPortId: 'transfer',
            ordering: 'ORDER_UNORDERED',
            sourceChannelId: 'channel-0',
            sourcePortId: 'transfer',
            state: 'STATE_OPEN',
            version: 'ics20-1',
          },
        ],
      },
      {
        chainId: 'gaia-test',
        connectionInfo: {
          clientId: '07-tendermint-3',
          counterparty: {
            clientId: '07-tendermint-2',
            connectionId: 'connection-1',
          },
          id: 'connection-1',
          state: 'STATE_OPEN',
        },
        lastUpdated: {
          revisionHeight: 854n,
          revisionNumber: 0n,
        },
        transferChannels: [
          {
            counterpartyChannelId: 'channel-1',
            counterpartyPortId: 'transfer',
            ordering: 'ORDER_UNORDERED',
            sourceChannelId: 'channel-1',
            sourcePortId: 'transfer',
            state: 'STATE_OPEN',
            version: 'ics20-1',
          },
        ],
      },
    ],
  },
  cosmos: {
    icaParams: {
      allowMessages: [],
      hostEnabled: true,
    },
    icqParams: {
      hostEnabled: false,
    },
    chainId: 'gaia-test',
    bondDenom: 'uatom',
    denoms: [
      {
        denom: 'uatom',
        native: true,
      },
      {
        baseDenom: 'uion',
        denom:
          'ibc/F7E92EE59B5428793F3EF5C1A4CB2494F61A9D0C9A69469D02390714A1372E16',
        path: 'transfer/channel-0',
      },
      {
        baseDenom: 'uosmo',
        denom:
          'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518',
        path: 'transfer/channel-0',
      },
      {
        baseDenom: 'ubld',
        denom:
          'ibc/E7827844CB818EE9C4DB2C159F1543FF62B26213B44CE8029D5CEFE52F0EE596',
        path: 'transfer/channel-1',
      },
      {
        baseDenom: 'uist',
        denom:
          'ibc/16CD81E12F05F5397CA2D580B4BA786A12A8F48B6FB3823D82EBE95D80B5287B',
        path: 'transfer/channel-1',
      },
    ],
    connections: [
      {
        chainId: 'osmosis-test',
        connectionInfo: {
          clientId: '07-tendermint-0',
          counterparty: {
            clientId: '07-tendermint-0',
            connectionId: 'connection-0',
          },
          id: 'connection-0',
          state: 'STATE_OPEN',
        },
        lastUpdated: {
          revisionHeight: 12056n,
          revisionNumber: 0n,
        },
        transferChannels: [
          {
            counterpartyChannelId: 'channel-0',
            counterpartyPortId: 'transfer',
            ordering: 'ORDER_UNORDERED',
            sourceChannelId: 'channel-0',
            sourcePortId: 'transfer',
            state: 'STATE_OPEN',
            version: 'ics20-1',
          },
        ],
      },
      {
        chainId: 'agoriclocal',
        connectionInfo: {
          clientId: '07-tendermint-2',
          counterparty: {
            clientId: '07-tendermint-3',
            connectionId: 'connection-1',
          },
          id: 'connection-1',
          state: 'STATE_OPEN',
        },
        lastUpdated: {
          revisionHeight: 113n,
          revisionNumber: 0n,
        },
        transferChannels: [
          {
            counterpartyChannelId: 'channel-1',
            counterpartyPortId: 'transfer',
            ordering: 'ORDER_UNORDERED',
            sourceChannelId: 'channel-1',
            sourcePortId: 'transfer',
            state: 'STATE_OPEN',
            version: 'ics20-1',
          },
        ],
      },
    ],
  },
  osmosis: {
    icaParams: {
      allowMessages: ['*'],
      hostEnabled: true,
    },
    icqParams: {
      allowQueries: [
        '/cosmos.bank.v1beta1.Query/Balance',
        '/cosmos.staking.v1beta1.Query/Delegation',
      ],
      hostEnabled: true,
    },
    chainId: 'osmosis-test',
    bondDenom: 'uosmo',
    denoms: [
      {
        denom: 'uion',
        native: true,
      },
      {
        denom: 'uosmo',
        native: true,
      },
      {
        baseDenom: 'uatom',
        denom:
          'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2',
        path: 'transfer/channel-0',
      },
      {
        baseDenom: 'ubld',
        denom:
          'ibc/E7827844CB818EE9C4DB2C159F1543FF62B26213B44CE8029D5CEFE52F0EE596',
        path: 'transfer/channel-1',
      },
      {
        baseDenom: 'uist',
        denom:
          'ibc/16CD81E12F05F5397CA2D580B4BA786A12A8F48B6FB3823D82EBE95D80B5287B',
        path: 'transfer/channel-1',
      },
    ],
    connections: [
      {
        chainId: 'gaia-test',
        connectionInfo: {
          clientId: '07-tendermint-0',
          counterparty: {
            clientId: '07-tendermint-0',
            connectionId: 'connection-0',
          },
          id: 'connection-0',
          state: 'STATE_OPEN',
        },
        lastUpdated: {
          revisionHeight: 7836n,
          revisionNumber: 0n,
        },
        transferChannels: [
          {
            counterpartyChannelId: 'channel-0',
            counterpartyPortId: 'transfer',
            ordering: 'ORDER_UNORDERED',
            sourceChannelId: 'channel-0',
            sourcePortId: 'transfer',
            state: 'STATE_OPEN',
            version: 'ics20-1',
          },
        ],
      },
      {
        chainId: 'agoriclocal',
        connectionInfo: {
          clientId: '07-tendermint-2',
          counterparty: {
            clientId: '07-tendermint-2',
            connectionId: 'connection-0',
          },
          id: 'connection-1',
          state: 'STATE_OPEN',
        },
        lastUpdated: {
          revisionHeight: 110n,
          revisionNumber: 0n,
        },
        transferChannels: [
          {
            counterpartyChannelId: 'channel-0',
            counterpartyPortId: 'transfer',
            ordering: 'ORDER_UNORDERED',
            sourceChannelId: 'channel-1',
            sourcePortId: 'transfer',
            state: 'STATE_OPEN',
            version: 'ics20-1',
          },
        ],
      },
    ],
  },
};
