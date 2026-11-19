import { M, type CastedPattern } from '@endo/patterns';
import type { ChainTokenMetadata, TokenMetadata } from './places.ts';
import type {
  PortfolioAgentKey,
  PortfolioDelegatedClaimRewardsParams,
  PortfolioDelegatedRebalanceParams,
  PortfolioSyncState,
  WithdrawParams,
  HoldingKind,
  HoldingDetail,
  PlanObservations,
  AaveClaimEvidence,
  CompoundClaimEvidence,
  MerklClaimEvidence,
  OneInchSwapInstructions,
  ClaimRewardsSelector,
  SwapProvider,
  RewardClaimProtocol,
  SwapSelector,
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

/**
 * Application-level valuation: absent when unknown. The EIP-712 converters
 * own the wire sentinel; it is not accepted here.
 */
const ValueUusdShape = M.and(M.nat(), M.lte(2n ** 255n - 1n));

export const TokenUsageShape = M.or('swapFrom', 'swapTo');
harden(TokenUsageShape);

/** Structural withdrawal parameters; route and holding identity need decoding. */
export const WithdrawParamsShape: CastedPattern<WithdrawParams> = M.or(
  M.splitRecord({}, { max: M.boolean() }, {}),
  M.splitRecord({}, { amountOfShares: M.nat() }, {}),
);
harden(WithdrawParamsShape);

/** A chain's own coin uses '$' plus a nonempty display symbol, e.g. '$ETH'. */
export const HoldingKindShape: CastedPattern<HoldingKind> = M.or(
  'shares',
  'principal',
  'claimable-reward',
  'claimed-reward',
  'token',
  // Strings strictly between '$' and the following ASCII character ('%') have a nonempty '$' prefix.
  M.and(
    M.string(),
    M.gt('$'),
    M.lt(String.fromCharCode('$'.charCodeAt(0) + 1)),
  ),
);
harden(HoldingKindShape);

export const HoldingDetailV1Shape = M.splitRecord(
  { place: M.string(), balanceUsdc: M.nat() },
  {},
  {},
);
harden(HoldingDetailV1Shape);

export const HoldingDetailV2Shape = M.splitRecord(
  {
    place: M.string(),
    kind: HoldingKindShape,
    tokenId: M.string(),
    amount: M.nat(),
  },
  { valueUusd: ValueUusdShape, balanceUsdc: M.nat() },
  {},
);
harden(HoldingDetailV2Shape);

/** Structural shape; the observation decoder also checks places and addresses. */
export const HoldingDetailShape: CastedPattern<HoldingDetail> = M.or(
  HoldingDetailV1Shape,
  HoldingDetailV2Shape,
);
harden(HoldingDetailShape);

/**
 * Structural shapes of reward evidence. The observation decoder also checks
 * places, addresses, identities and amounts.
 */
const InstrumentClaimEvidenceShape = M.splitRecord(
  { instrumentId: M.string(), tokenId: M.string(), expectedAmount: M.nat() },
  {},
  {},
);

export const AaveClaimEvidenceShape: CastedPattern<AaveClaimEvidence> =
  InstrumentClaimEvidenceShape;
harden(AaveClaimEvidenceShape);

export const CompoundClaimEvidenceShape: CastedPattern<CompoundClaimEvidence> =
  InstrumentClaimEvidenceShape;
harden(CompoundClaimEvidenceShape);

export const MerklClaimEvidenceShape: CastedPattern<MerklClaimEvidence> =
  M.splitRecord(
    {
      accountPlace: M.string(),
      distributor: M.string(),
      tokenId: M.string(),
      cumulativeAmount: M.nat(),
      claimedAmount: M.nat(),
      proof: M.arrayOf(M.string()),
    },
    {},
    {},
  );
harden(MerklClaimEvidenceShape);

export const OneInchSwapInstructionsShape: CastedPattern<OneInchSwapInstructions> =
  M.splitRecord(
    {
      accountPlace: M.string(),
      tokenIn: M.string(),
      tokenOut: M.string(),
      amountIn: M.nat(),
      quotedAmountOut: M.nat(),
      minAmountOut: M.nat(),
      slippageBps: M.and(M.number(), M.gte(0), M.lte(10_000)),
      expiresAt: M.nat(),
      flags: M.nat(),
      executor: M.string(),
      srcReceiver: M.string(),
      data: M.string(),
    },
    {},
    {},
  );
harden(OneInchSwapInstructionsShape);

/**
 * Structural shape of an index into evidence. Consumers must still check
 * that it is an integer designating an entry of the selected evidence.
 */
const EvidenceIndexShape = M.and(M.number(), M.gte(0));

export const RewardClaimProtocolShape: CastedPattern<RewardClaimProtocol> =
  M.or('aave', 'compound', 'merkl');
harden(RewardClaimProtocolShape);

export const SwapProviderShape: CastedPattern<SwapProvider> = M.or('1inch');
harden(SwapProviderShape);

export const ClaimRewardsSelectorShape: CastedPattern<ClaimRewardsSelector> =
  M.splitRecord(
    { protocol: RewardClaimProtocolShape, index: EvidenceIndexShape },
    {},
    {},
  );
harden(ClaimRewardsSelectorShape);

export const SwapSelectorShape: CastedPattern<SwapSelector> = M.splitRecord(
  { provider: SwapProviderShape, index: EvidenceIndexShape },
  {},
  {},
);
harden(SwapSelectorShape);

export const PlanObservationsShape: CastedPattern<PlanObservations> =
  M.splitRecord(
    {
      balances: M.recordOf(M.string(), M.nat()),
      instrumentTvls: M.recordOf(
        M.string(),
        M.splitRecord({ tvlUsd: M.nat() }),
      ),
    },
    {
      holdings: M.arrayOf(HoldingDetailV2Shape),
      aaveClaims: M.arrayOf(AaveClaimEvidenceShape),
      compoundClaims: M.arrayOf(CompoundClaimEvidenceShape),
      merklClaims: M.arrayOf(MerklClaimEvidenceShape),
      oneInchSwaps: M.arrayOf(OneInchSwapInstructionsShape),
    },
    {},
  );
harden(PlanObservationsShape);

export const TokenMetadataShape: CastedPattern<TokenMetadata> = M.splitRecord(
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

export const ChainTokenMetadataShape: CastedPattern<ChainTokenMetadata> =
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

export const PortfolioAgentKeyShape: CastedPattern<PortfolioAgentKey> =
  M.string();

/** The shape for the optional `agentMemo` field for flows started by an agent */
export const PortfolioFlowAgentMemoShape: CastedPattern<string> = M.string({
  stringLengthLimit: 64,
});

export const PortfolioSyncStateShape: CastedPattern<PortfolioSyncState> =
  M.splitRecord({
    policyVersion: M.number(),
    rebalanceCount: M.number(),
  });

export const PortfolioDelegatedRebalanceParamsShape: CastedPattern<PortfolioDelegatedRebalanceParams> =
  M.splitRecord(
    { syncState: PortfolioSyncStateShape },
    { agentMemo: PortfolioFlowAgentMemoShape },
    {},
  );

export const PortfolioDelegatedClaimRewardsParamsShape: CastedPattern<PortfolioDelegatedClaimRewardsParams> =
  M.splitRecord(
    { syncState: PortfolioSyncStateShape },
    { agentMemo: PortfolioFlowAgentMemoShape },
    {},
  );
