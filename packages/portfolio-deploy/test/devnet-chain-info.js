/** @file devnet chainInfo fixture */

/**
 * @import {CosmosChainInfo} from '@agoric/orchestration';
 */

/**
 * built with:
 *
 * agoric run src/chain-info.build.js   --net=devnet --peer=noble:connection-13:channel-11:uusdc   --peer=axelar:connection-19:channel-315:uaxl
 *
 * @type {Record<string, CosmosChainInfo>}
 */
export const chainInfoDevNet = {
  agoric: {
    bech32Prefix: 'agoric',
    chainId: 'agoricdev-25',
    connections: {
      'axelar-testnet-lisbon-3': {
        client_id: '07-tendermint-22',
        counterparty: {
          client_id: '07-tendermint-1193',
          connection_id: 'connection-942',
        },
        id: 'connection-19',
        state: 3, // 'STATE_OPEN'
        transferChannel: {
          channelId: 'channel-315',
          counterPartyChannelId: 'channel-623',
          counterPartyPortId: 'transfer',
          ordering: 0, // 'ORDER_UNORDERED'
          portId: 'transfer',
          state: 3, // 'STATE_OPEN'
          version: 'ics20-1',
        },
      },
      'grand-1': {
        client_id: '07-tendermint-13',
        counterparty: {
          client_id: '07-tendermint-432',
          connection_id: 'connection-396',
        },
        id: 'connection-13',
        state: 3, // 'STATE_OPEN',
        transferChannel: {
          channelId: 'channel-11',
          counterPartyChannelId: 'channel-337',
          counterPartyPortId: 'transfer',
          ordering: 0, // 'ORDER_UNORDERED'
          portId: 'transfer',
          state: 3, // 'STATE_OPEN',
          version: 'ics20-1',
        },
      },
    },
    namespace: 'cosmos',
    reference: 'agoricdev-25',
    stakingTokens: [
      {
        denom: 'ubld',
      },
    ],
  },
  axelar: {
    bech32Prefix: 'axelar',
    chainId: 'axelar-testnet-lisbon-3',
    namespace: 'cosmos',
    reference: 'axelar-testnet-lisbon-3',
    stakingTokens: [
      {
        denom: 'uaxl',
      },
    ],
  },
  noble: {
    bech32Prefix: 'noble',
    chainId: 'grand-1',
    namespace: 'cosmos',
    reference: 'grand-1',
    stakingTokens: [
      {
        denom: 'uusdc',
      },
    ],
  },
};

harden(chainInfoDevNet);

/**
 * built with
 *
 * AGORIC_NET=devnet ./scripts/ymax-tool.ts --buildEthOverrides
 */
export const ethOverridesDevNet = {
  axelarIds: {
    Arbitrum: 'arbitrum-sepolia',
    Avalanche: 'Avalanche',
    Base: 'base-sepolia',
    Ethereum: 'ethereum-sepolia',
    Optimism: 'optimism-sepolia',
  },
  contracts: {
    Arbitrum: {
      aavePool: '0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff',
      compound: '0x',
      compoundRewardsController: '0x',
      factory: '0xaf84964745bd4edcea4b8c474cbe423e3d2f27d9',
      usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
      tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
      aaveUSDC: '0x460b97BD498E1157530AEb3086301d5225b91216',
      aaveRewardsController: '0x3A203B14CF8749a1e3b7314c6c49004B77Ee667A',
    },
    Avalanche: {
      aavePool: '0x8B9b2AF4afB389b4a70A474dfD4AdCD4a302bb40',
      compound: '0x',
      compoundRewardsController: '0x',
      factory: '0x8C654562C5f74eFfd24e1DE7EE43c75d0Cd36bC5',
      usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
      tokenMessenger: '0xeb08f243E5d3FCFF26A9E38Ae5520A669f4019d0',
      aaveUSDC: '0x9CFcc1B289E59FBe1E769f020C77315DF8473760',
      aaveRewardsController: '0x03aFC1Dfb53eae8eB7BE0E8CB6524aa79C3F8578',
    },
    Base: {
      aavePool: '0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27',
      compound: '0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017',
      compoundRewardsController: '0x3394fa1baCC0b47dd0fF28C8573a476a161aF7BC',
      factory: '0xaf84964745bd4edcea4b8c474cbe423e3d2f27d9',
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
      aaveUSDC: '0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC',
      aaveRewardsController: '0x71B448405c803A3982aBa448133133D2DEAFBE5F',
    },
    Ethereum: {
      aavePool: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
      compound: '0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e',
      compoundRewardsController: '0x8bF5b658bdF0388E8b482ED51B14aef58f90abfD',
      factory: '0x6b124C850407e857B7fBB9fD61cC91f379066063',
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
      aaveUSDC: '0x16dA4541aD1807f4443d92D26044C1147406EB80',
      aaveRewardsController: '0x4DA5c4da71C5a167171cC839487536d86e083483',
    },
    Optimism: {
      aavePool: '0xb50201558B00496A145fE76f7424749556E326D8',
      compound: '0x',
      compoundRewardsController: '0x',
      factory: '0x',
      usdc: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
      tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
      aaveUSDC: '0xa818F1B57c201E092C4A2017A91815034326Efd1',
      aaveRewardsController: '0xaD4F91D26254B6B0C6346b390dDA2991FDE2F20d',
    },
  },
  chainInfo: {
    agoric: {
      bech32Prefix: 'agoric',
      chainId: 'agoricdev-25',
      namespace: 'cosmos',
      reference: 'agoricdev-25',
      stakingTokens: [
        {
          denom: 'ubld',
        },
      ],
    },
    axelar: {
      bech32Prefix: 'axelar',
      chainId: 'axelar-testnet-lisbon-3',
      namespace: 'cosmos',
      reference: 'axelar-testnet-lisbon-3',
      stakingTokens: [
        {
          denom: 'uaxl',
        },
      ],
    },
    noble: {
      bech32Prefix: 'noble',
      chainId: 'grand-1',
      namespace: 'cosmos',
      reference: 'grand-1',
      stakingTokens: [
        {
          denom: 'uusdc',
        },
      ],
    },
    Arbitrum: {
      namespace: 'eip155',
      reference: '421614',
      cctpDestinationDomain: 3,
    },
    Avalanche: {
      namespace: 'eip155',
      reference: '43113',
      cctpDestinationDomain: 1,
    },
    Base: {
      namespace: 'eip155',
      reference: '84532',
      cctpDestinationDomain: 6,
    },
    Ethereum: {
      namespace: 'eip155',
      reference: '11155111',
      cctpDestinationDomain: 0,
    },
    Optimism: {
      namespace: 'eip155',
      reference: '11155420',
      cctpDestinationDomain: 2,
    },
  },
  gmpAddresses: {
    AXELAR_GMP:
      'axelar1dv4u5k73pzqrxlzujxg3qp8kvc3pje7jtdvu72npnt5zhq05ejcsn5qme5',
    AXELAR_GAS: 'axelar1zl3rxpp70lmte2xr6c4lgske2fyuj3hupcsvcd',
  },
};
