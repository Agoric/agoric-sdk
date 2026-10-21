import type { TypedPattern } from '@agoric/internal';
import { M } from '@endo/patterns';
import type { ChainTokenMetadata, TokenMetadata } from './places.ts';
import type {
  PortfolioAgentKey,
  PortfolioDelegatedClaimRewardsParams,
  PortfolioDelegatedRebalanceParams,
  PortfolioSyncState,
} from './types.js';

export {
  isBeefyInstrumentId,
  isDepositFromChainRef,
  isERC4626InstrumentId,
  isERC4626MorphoInstrumentId,
  isInstrumentId,
  isInterChainAccountRef,
  isLocalChainAccountRef,
  isPortfolioBalancePlaceRef,
  isWithdrawToChainRef,
  makeTokenIdKey,
} from './places.ts';
export type {
  ChainTokenMetadata,
  ChainTokenMetadataEntry,
  TokenIdKey,
  TokenMetadata,
} from './places.ts';

export const TokenUsageShape = M.or('swapFrom', 'swapTo');
harden(TokenUsageShape);

export const TokenMetadataShape: TypedPattern<TokenMetadata> = M.splitRecord(
  {
    caipChainId: M.string(),
    chainName: M.string(),
    tokenId: M.string(),
    symbol: M.string(),
    decimals: M.number(),
  },
  {
    usage: M.arrayOf(TokenUsageShape),
  },
);
harden(TokenMetadataShape);

export const ChainTokenMetadataShape: TypedPattern<ChainTokenMetadata> =
  M.recordOf(
    M.string(),
    M.splitRecord(
      {
        caipChainId: M.string(),
        chainName: M.string(),
        tokenMetadataById: M.recordOf(M.string(), TokenMetadataShape),
      },
      {},
    ),
  );
harden(ChainTokenMetadataShape);

export const PortfolioAgentKeyShape: TypedPattern<PortfolioAgentKey> =
  M.string();

/** The shape for the optional `agentMemo` field for flows started by an agent */
export const PortfolioFlowAgentMemoShape: TypedPattern<string> = M.string({
  stringLengthLimit: 64,
});

export const PortfolioSyncStateShape: TypedPattern<PortfolioSyncState> =
  M.splitRecord({
    policyVersion: M.number(),
    rebalanceCount: M.number(),
  });

export const PortfolioDelegatedRebalanceParamsShape: TypedPattern<PortfolioDelegatedRebalanceParams> =
  M.splitRecord(
    { syncState: PortfolioSyncStateShape },
    { agentMemo: PortfolioFlowAgentMemoShape },
    {},
  );

export const PortfolioDelegatedClaimRewardsParamsShape: TypedPattern<PortfolioDelegatedClaimRewardsParams> =
  M.splitRecord(
    { syncState: PortfolioSyncStateShape },
    { agentMemo: PortfolioFlowAgentMemoShape },
    {},
  );
