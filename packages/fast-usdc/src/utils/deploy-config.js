import { denomHash, withChainCapabilities } from '@agoric/orchestration';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { ChainPolicies } from './chain-policies.js';

/**
 * @import {FastUSDCConfig} from '@agoric/fast-usdc';
 * @import {Passable} from '@endo/marshal';
 * @import {CosmosChainInfo, Denom, DenomDetail} from '@agoric/orchestration';
 */

/** @type {[Denom, DenomDetail & { brandKey?: string}][]} */
export const defaultAssetInfo = [
  [
    'uusdc',
    {
      baseName: 'noble',
      chainName: 'noble',
      baseDenom: 'uusdc',
    },
  ],
  [
    `ibc/${denomHash({ denom: 'uusdc', channelId: fetchedChainInfo.agoric.connections['noble-1'].transferChannel.channelId })}`,
    {
      baseName: 'noble',
      chainName: 'agoric',
      baseDenom: 'uusdc',
      brandKey: 'USDC',
    },
  ],
  [
    `ibc/${denomHash({ denom: 'uusdc', channelId: fetchedChainInfo.osmosis.connections['noble-1'].transferChannel.channelId })}`,
    {
      baseName: 'noble',
      chainName: 'osmosis',
      baseDenom: 'uusdc',
    },
  ],
];
harden(defaultAssetInfo);

const agoricAssetInfo = defaultAssetInfo.filter(
  ([_d, i]) => i.chainName === 'agoric',
);

/** ABI for DepositForBurn event in TokenMessenger contract */
const DepositForBurnEvent =
  'DepositForBurn(uint64,address,uint256,address,bytes32,uint32,bytes32,bytes32)';

/** @satisfies {Record<string, CosmosChainInfo & Passable>} */
const devnetChainInfo = {
  agoric: {
    bech32Prefix: 'agoric',
    chainId: 'agoricdev-23',
    stakingTokens: [{ denom: 'ubld' }],
    icqEnabled: false,
    connections: {
      'grand-1': {
        id: 'connection-85',
        client_id: '07-tendermint-131',
        counterparty: {
          client_id: '07-tendermint-387',
          connection_id: 'connection-351',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-64',
          portId: 'transfer',
          counterPartyChannelId: 'channel-304',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
      'osmo-test-5': {
        id: 'connection-81',
        client_id: '07-tendermint-127',
        counterparty: {
          client_id: '07-tendermint-4326',
          connection_id: 'connection-3786',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-61',
          portId: 'transfer',
          counterPartyChannelId: 'channel-10041',
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
    connections: {
      'agoricdev-23': {
        id: 'connection-351',
        client_id: '07-tendermint-387',
        counterparty: {
          client_id: '07-tendermint-131',
          connection_id: 'connection-85',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-304',
          portId: 'transfer',
          counterPartyChannelId: 'channel-64',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
      'osmo-test-5': {
        id: 'connection-31',
        client_id: '07-tendermint-42',
        counterparty: {
          client_id: '07-tendermint-1374',
          connection_id: 'connection-1275',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-22',
          portId: 'transfer',
          counterPartyChannelId: 'channel-4280',
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
    stakingTokens: [
      {
        denom: 'uosmo',
      },
    ],
    icqEnabled: true,
    connections: {
      'agoricdev-23': {
        id: 'connection-3786',
        client_id: '07-tendermint-4326',
        counterparty: {
          client_id: '07-tendermint-127',
          connection_id: 'connection-81',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-10041',
          portId: 'transfer',
          counterPartyChannelId: 'channel-61',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
      'grand-1': {
        id: 'connection-1275',
        client_id: '07-tendermint-1374',
        counterparty: {
          client_id: '07-tendermint-42',
          connection_id: 'connection-31',
        },
        state: 3,
        transferChannel: {
          channelId: 'channel-4280',
          portId: 'transfer',
          counterPartyChannelId: 'channel-22',
          counterPartyPortId: 'transfer',
          ordering: 0,
          state: 3,
          version: 'ics20-1',
        },
      },
    },
  },
};
harden(devnetChainInfo);

/** @type {[Denom, DenomDetail & { brandKey?: string}][]} */
export const devnetAssetInfo = [
  ['uusdc', { baseName: 'noble', chainName: 'noble', baseDenom: 'uusdc' }],
  [
    `ibc/${denomHash({ denom: 'uusdc', channelId: devnetChainInfo.agoric.connections['grand-1'].transferChannel.channelId })}`,
    {
      baseName: 'noble',
      chainName: 'agoric',
      baseDenom: 'uusdc',
      brandKey: 'USDC',
    },
  ],
  [
    `ibc/${denomHash({ denom: 'uusdc', channelId: devnetChainInfo.osmosis.connections['grand-1'].transferChannel.channelId })}`,
    {
      baseName: 'noble',
      chainName: 'osmosis',
      baseDenom: 'uusdc',
    },
  ],
];
harden(devnetAssetInfo);

/**
 * @type {Record<string, Pick<FastUSDCConfig, 'oracles' | 'feedPolicy' | 'chainInfo' | 'assetInfo' >>}
 *
 * TODO: determine OCW operator addresses
 * meanwhile, use price oracle addresses (from updatePriceFeeds.js).
 */
export const configurations = {
  /**
   * NOTE: The a3p-integration runtime does _not_ include
   * a noble chain; this limits functionality to advancing
   * to the Agoric chain.
   */
  A3P_INTEGRATION: {
    oracles: {
      gov1: 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q',
      gov2: 'agoric1wrfh296eu2z34p6pah7q04jjuyj3mxu9v98277',
      gov3: 'agoric1ydzxwh6f893jvpaslmaz6l8j2ulup9a7x8qvvq',
    },
    feedPolicy: {
      nobleAgoricChannelId: 'channel-does-not-exist',
      nobleDomainId: 4,
      chainPolicies: ChainPolicies.TESTNET,
      eventFilter: DepositForBurnEvent,
    },
    chainInfo: /** @type {Record<string, CosmosChainInfo & Passable>} */ (
      withChainCapabilities({
        agoric: fetchedChainInfo.agoric,
        // registering USDC-on-agoric requires registering the noble chain
        noble: fetchedChainInfo.noble,
      })
    ),
    assetInfo: agoricAssetInfo,
  },
  MAINNET: {
    oracles: {
      '01node': 'agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8',
      'Simply Staking': 'agoric1krunjcqfrf7la48zrvdfeeqtls5r00ep68mzkr',
      P2P: 'agoric1n4fcxsnkxe4gj6e24naec99hzmc4pjfdccy5nj',
    },
    feedPolicy: {
      nobleAgoricChannelId: 'channel-21',
      nobleDomainId: 4,
      chainPolicies: ChainPolicies.MAINNET,
      eventFilter: DepositForBurnEvent,
    },
    chainInfo: /** @type {Record<string, CosmosChainInfo & Passable>} */ (
      withChainCapabilities(fetchedChainInfo)
    ),
    assetInfo: defaultAssetInfo,
  },
  DEVNET: {
    oracles: {
      gov1: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
      gov2: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
      gov3: 'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
      // jcv1: 'agoric1f6au5xffuuph97w85zg9qf062gddsnw0sx9xj3',
      // jcv2: 'agoric1vxygktgl0zd7aznq9kw2msdx6gfyz0t0wjreag',
    },
    feedPolicy: {
      // grand-1->agoricdev-23: channel-304
      nobleAgoricChannelId: 'channel-304',
      nobleDomainId: 4,
      chainPolicies: ChainPolicies.TESTNET, // TODO: devnet chainPolicies
      eventFilter: DepositForBurnEvent,
    },
    chainInfo: devnetChainInfo,
    assetInfo: devnetAssetInfo,
  },
  EMERYNET: {
    oracles: {
      gov1: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
      gov2: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
    },
    feedPolicy: {
      nobleAgoricChannelId: 'TODO',
      nobleDomainId: 4,
      chainPolicies: ChainPolicies.TESTNET,
      eventFilter: DepositForBurnEvent,
    },
    chainInfo: /** @type {Record<string, CosmosChainInfo & Passable>} */ (
      withChainCapabilities(fetchedChainInfo) // TODO: use emerynet values
    ),
    assetInfo: defaultAssetInfo, // TODO: use emerynet values
  },
};
harden(configurations);

// Constraints on the configurations
const MAINNET_EXPECTED_ORACLES = 3;
assert(
  new Set(Object.values(configurations.MAINNET.oracles)).size ===
    MAINNET_EXPECTED_ORACLES,
  `Mainnet must have exactly ${MAINNET_EXPECTED_ORACLES} oracles`,
);
