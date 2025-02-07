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
      chainPolicies: ChainPolicies.TESTNET,
      eventFilter: DepositForBurnEvent,
    },
    chainInfo: /** @type {Record<string, CosmosChainInfo & Passable>} */ (
      withChainCapabilities(fetchedChainInfo) // TODO: use devnet values
    ),
    assetInfo: defaultAssetInfo, // TODO: use emerynet values
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
