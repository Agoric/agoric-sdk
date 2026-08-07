import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { assert } from '@endo/errors';

import { axelarConfig, gmpAddresses } from '../src/axelar-configs.js';
import {
  withMetadata,
  collateTokenMetadataFromList,
} from '../src/token-meta.js';

const reward = harden(
  /** @type {const} */ ({
    caipChainId: 'eip155:42161',
    chainName: 'Arbitrum',
    instrumentId: 'Aave_Arbitrum',
    tokenId: '0x0000000000000000000000000000000000000abc',
    symbol: 'ARB',
    decimals: 18,
  }),
);

test('extractTokenMetadataList supports arrays of token metadata', t => {
  const { poolMetadata } = collateTokenMetadataFromList([
    reward,
    {
      caipChainId: 'eip155:8453',
      chainName: 'Base',
      instrumentId: 'Beefy_morphoSeamlessUsdc_Base',
      tokenId: '0x0000000000000000000000000000000000000def',
      symbol: 'SEAM',
      decimals: 18,
    },
  ]);

  t.deepEqual(poolMetadata, {
    Aave_Arbitrum: { rewardTokenById: { [reward.tokenId]: reward } },
    Beefy_morphoSeamlessUsdc_Base: {
      rewardTokenById: {
        '0x0000000000000000000000000000000000000def': {
          caipChainId: 'eip155:8453',
          chainName: 'Base',
          instrumentId: 'Beefy_morphoSeamlessUsdc_Base',
          tokenId: '0x0000000000000000000000000000000000000def',
          symbol: 'SEAM',
          decimals: 18,
        },
      },
    },
  });
});

test('withMetadata merges configured reward token metadata', t => {
  const config = harden({
    cluster: 'mainnet',
    axelarConfig,
    gmpAddresses: gmpAddresses.mainnet,
    walletBytecode: /** @type {`0x${string}`} */ ('0x1234'),
  });

  const withTokens = withMetadata(config, {
    poolMetadata: {
      Aave_Arbitrum: { rewardTokenById: { [reward.tokenId]: reward } },
    },
  });

  const metadata = withTokens.poolMetadata.Aave_Arbitrum;
  assert(metadata);
  t.deepEqual(metadata.rewardTokenById, { [reward.tokenId]: reward });
  t.is(metadata.protocol, 'Aave');
  t.false(
    Object.hasOwn(withTokens.axelarConfig.Arbitrum.contracts, 'rewardTokens'),
  );
});
