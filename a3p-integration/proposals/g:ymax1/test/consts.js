// @ts-check
export const ymax0ControlAddr = 'agoric15u29seyj3c9rdwg7gwkc97uttrk6j9fl4jkuyh';
export const ymax1ControlAddr = 'agoric1c0eq3m8sze9cj8lxr7h66fu3jgqtevqxv8svcm';

// Must be the bundle used in the `use-invitation.js` of a3p 106
export const bundleId =
  'b1-078729b9683de5f81afe8b14bd163f0165b8dd803f587413df8dff76b557d56e5d0d67f8f654bc920b5bb3a734d7d7644791692efbbc08c08984e37c6e0e6c88';

const evmContractAddressesStub = {
  aavePool: '0x',
  compound: '0x',
  factory: '0x',
  usdc: '0x',
};

export const ymaxDataArgs = {
  assetInfo: [
    [
      'ubld',
      {
        baseDenom: 'ubld',
        baseName: 'agoric',
        brandKey: 'BLD',
        chainName: 'agoric',
      },
    ],
    [
      'ibc/AD211FEDD6DF0EDA18873D4E2A49972759BD761D96C3BBD9D6731FDC3F948F93',
      {
        baseDenom: 'ubld',
        baseName: 'agoric',
        chainName: 'axelar',
      },
    ],
    [
      'ibc/3C01172339ABAE4EAF1EB56FE9A69B7C818601FF9252E7DD633C14B165113C6B',
      {
        baseDenom: 'ubld',
        baseName: 'agoric',
        chainName: 'noble',
      },
    ],
    [
      'uusdc',
      {
        baseDenom: 'uusdc',
        baseName: 'noble',
        chainName: 'noble',
      },
    ],
    [
      'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9',
      {
        baseDenom: 'uusdc',
        baseName: 'noble',
        brandKey: 'USDC',
        chainName: 'agoric',
      },
    ],
    [
      'uaxl',
      {
        baseDenom: 'uaxl',
        baseName: 'axelar',
        chainName: 'axelar',
      },
    ],
    [
      'ibc/C01154C2547F4CB10A985EA78E7CD4BA891C1504360703A37E1D7043F06B5E1F',
      {
        baseDenom: 'uaxl',
        baseName: 'axelar',
        brandKey: 'AXL',
        chainName: 'agoric',
      },
    ],
  ],
  axelarIds: {
    Arbitrum: 'arbitrum',
    Avalanche: 'Avalanche',
    Base: 'base',
    Ethereum: 'Ethereum',
    Optimism: 'optimism',
    Polygon: 'Polygon',
  },
  chainInfo: {
    Arbitrum: {
      cctpDestinationDomain: 3,
      namespace: 'eip155',
      reference: '421614',
    },
    Avalanche: {
      cctpDestinationDomain: 1,
      namespace: 'eip155',
      reference: '43113',
    },
    Binance: {
      namespace: 'eip155',
      reference: '97',
    },
    Ethereum: {
      cctpDestinationDomain: 0,
      namespace: 'eip155',
      reference: '11155111',
    },
    Fantom: {
      namespace: 'eip155',
      reference: '4002',
    },
    Optimism: {
      cctpDestinationDomain: 2,
      namespace: 'eip155',
      reference: '11155420',
    },
    Polygon: {
      cctpDestinationDomain: 7,
      namespace: 'eip155',
      reference: '80002',
    },
    agoric: {
      bech32Prefix: 'agoric',
      chainId: 'agoric-3',
      connections: {
        'axelar-dojo-1': {
          client_id: '07-tendermint-11',
          counterparty: {
            client_id: '07-tendermint-69',
            connection_id: 'connection-51',
          },
          id: 'connection-14',
          state: 3,
          transferChannel: {
            channelId: 'channel-9',
            counterPartyChannelId: 'channel-41',
            counterPartyPortId: 'transfer',
            ordering: 0,
            portId: 'transfer',
            state: 3,
            version: 'ics20-1',
          },
        },
        'noble-1': {
          client_id: '07-tendermint-77',
          counterparty: {
            client_id: '07-tendermint-32',
            connection_id: 'connection-38',
          },
          id: 'connection-72',
          state: 3,
          transferChannel: {
            channelId: 'channel-62',
            counterPartyChannelId: 'channel-21',
            counterPartyPortId: 'transfer',
            ordering: 0,
            portId: 'transfer',
            state: 3,
            version: 'ics20-1',
          },
        },
      },
      icqEnabled: false,
      namespace: 'cosmos',
      reference: 'agoric-3',
      stakingTokens: [
        {
          denom: 'ubld',
        },
      ],
    },
    axelar: {
      bech32Prefix: 'axelar',
      chainId: 'axelar-dojo-1',
      connections: {
        'agoric-3': {
          client_id: '07-tendermint-69',
          counterparty: {
            client_id: '07-tendermint-11',
            connection_id: 'connection-14',
          },
          id: 'connection-51',
          state: 3,
          transferChannel: {
            channelId: 'channel-41',
            counterPartyChannelId: 'channel-9',
            counterPartyPortId: 'transfer',
            ordering: 0,
            portId: 'transfer',
            state: 3,
            version: 'ics20-1',
          },
        },
      },
      icqEnabled: false,
      namespace: 'cosmos',
      reference: 'axelar-dojo-1',
      stakingTokens: [
        {
          denom: 'uaxl',
        },
      ],
    },
    noble: {
      bech32Prefix: 'noble',
      chainId: 'noble-1',
      connections: {
        'agoric-3': {
          client_id: '07-tendermint-32',
          counterparty: {
            client_id: '07-tendermint-77',
            connection_id: 'connection-72',
          },
          id: 'connection-38',
          state: 3,
          transferChannel: {
            channelId: 'channel-21',
            counterPartyChannelId: 'channel-62',
            counterPartyPortId: 'transfer',
            ordering: 0,
            portId: 'transfer',
            state: 3,
            version: 'ics20-1',
          },
        },
      },
      icqEnabled: false,
      namespace: 'cosmos',
      reference: 'noble-1',
    },
  },
  contracts: {
    Arbitrum: evmContractAddressesStub,
    Avalanche: evmContractAddressesStub,
    Base: evmContractAddressesStub,
    Ethereum: evmContractAddressesStub,
    Optimism: evmContractAddressesStub,
    Polygon: evmContractAddressesStub,
  },
  gmpAddresses: {
    AXELAR_GAS: 'axelar1gas',
    AXELAR_GMP: 'axelar1gmp',
  },
};
