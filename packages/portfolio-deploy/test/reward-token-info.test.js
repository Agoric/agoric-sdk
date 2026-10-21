import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { assert } from '@endo/errors';

import { makeTokenIdKey, UsdcTokenIds } from '@agoric/portfolio-api';
import { axelarConfig, gmpAddresses } from '../src/axelar-configs.js';
import {
  withMetadata,
  collateTokenMetadata,
  extractTokenMetadataFromYds,
} from '../src/token-meta.js';

const reward = harden(
  /** @type {const} */ ({
    caipChainId: 'eip155:421614',
    chainName: 'Arbitrum',
    tokenId: '0x0000000000000000000000000000000000000abc',
    symbol: 'ARB',
    decimals: 18,
    usage: ['swapFrom'],
  }),
);

const rewardFromAave = harden(
  /** @type {const} */ ({
    ...reward,
    instrumentId: 'Aave_Arbitrum',
    protocolId: 'aave',
  }),
);

const reward2 = harden(
  /** @type {const} */ ({
    caipChainId: 'eip155:8453',
    chainName: 'Base',
    tokenId: '0x0000000000000000000000000000000000000def',
    symbol: 'SEAM',
    decimals: 18,
    usage: ['swapFrom'],
  }),
);

const stableToken = /** @type {const} */ ({
  caipChainId: reward.caipChainId,
  chainName: reward.chainName,
  decimals: 6,
  symbol: 'USDC',
  tokenId: /** @type {`0x${string}`} */ (
    UsdcTokenIds.testnet[reward.chainName]
  ),
  usage: ['swapTo'],
});

test('extractTokenMetadataListFromYds supports yds shapes', t => {
  const tokenMetadata = extractTokenMetadataFromYds({
    instruments: {
      data: [
        {
          asset: { symbol: 'USDC' },
          caipChainId: reward.caipChainId,
          id: rewardFromAave.instrumentId,
          protocol: {
            id: 'aave',
            name: 'Aave',
          },
        },
      ],
    },
    rewardTokenRates: {
      data: [
        {
          evmChainId: Number(reward.caipChainId.slice('eip155:'.length)),
          sourceDenom: reward.symbol,
          sourceToken: reward.tokenId,
          targetDenom: 'USDC',
          targetToken: stableToken.tokenId,
        },
      ],
    },
  });

  const metadata = collateTokenMetadata(tokenMetadata);
  t.deepEqual(metadata, {
    Arbitrum: {
      caipChainId: reward.caipChainId,
      chainName: reward.chainName,
      tokenMetadataById: {
        [makeTokenIdKey(reward.tokenId)]: reward,
        [makeTokenIdKey(stableToken.tokenId)]: stableToken,
      },
    },
  });
});

test('collateTokenMetadata supports arrays of token metadata', t => {
  const metadata = collateTokenMetadata([rewardFromAave, reward2]);

  t.deepEqual(metadata, {
    Arbitrum: {
      caipChainId: reward.caipChainId,
      chainName: reward.chainName,
      tokenMetadataById: {
        [makeTokenIdKey(reward.tokenId)]: reward,
      },
    },
    Base: {
      caipChainId: 'eip155:8453',
      chainName: 'Base',
      tokenMetadataById: {
        [makeTokenIdKey(reward2.tokenId)]: reward2,
      },
    },
  });
});

test('withMetadata merges configured reward token metadata', t => {
  const config = harden(
    /** @type {const} */ ({
      cluster: 'testnet',
      axelarConfig,
      gmpAddresses: gmpAddresses.testnet,
      walletBytecode: /** @type {`0x${string}`} */ ('0x1234'),
    }),
  );

  const withTokens = withMetadata(config, {
    Arbitrum: {
      tokenMetadataById: {
        [makeTokenIdKey(reward.tokenId)]: reward,
      },
    },
  });

  const metadata = withTokens.chainMetadata.Arbitrum;
  assert(metadata);
  t.deepEqual(metadata.tokenMetadataById, {
    [makeTokenIdKey(stableToken.tokenId)]: stableToken,
    [makeTokenIdKey(reward.tokenId)]: reward,
  });
  t.false(
    Object.hasOwn(withTokens.axelarConfig.Arbitrum.contracts, 'rewardTokens'),
  );
});
