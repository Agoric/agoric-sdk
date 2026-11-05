import type { TypedPattern } from '@agoric/internal';
import { M } from '@endo/patterns';
import { optUint255Shape } from './opt-uint.ts';
import type { ChainTokenMetadata, TokenMetadata } from './places.ts';
import type {
  PortfolioAgentKey,
  PortfolioDelegatedClaimRewardsParams,
  PortfolioDelegatedRebalanceParams,
  PortfolioSyncState,
  WithdrawParams,
  AmountSelector,
  HoldingKind,
  HoldingDetail,
  PlanObservationsV2,
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

/** Native-token kinds start with '$' and have a nonempty symbol. */
export const HoldingKindShape: TypedPattern<HoldingKind> = M.or(
  'shares',
  'principal',
  'reward',
  'token',
  // Strings strictly between '$' and '%' have a nonempty '$' prefix.
  M.and(M.string(), M.gt('$'), M.lt('%')),
);
harden(HoldingKindShape);

/** Structural selector; consumers must authenticate the holding and brand. */
export const AmountSelectorShape: TypedPattern<AmountSelector> = M.splitRecord(
  {
    kind: HoldingKindShape,
    // Like ERTP's BrandShape, this checks remotability, not issuer authenticity.
    token: M.or(M.remotable('Brand'), M.string()),
    amount: M.nat(),
  },
  { max: M.boolean() },
  {},
);
harden(AmountSelectorShape);

/** Structural withdrawal parameters; route and holding identity need decoding. */
export const WithdrawParamsShape: TypedPattern<WithdrawParams> = M.splitRecord(
  {},
  {
    max: M.boolean(),
    select: M.splitArray(
      [AmountSelectorShape],
      [],
      M.arrayOf(AmountSelectorShape),
    ),
  },
  {},
);
harden(WithdrawParamsShape);

/** Structural shape; the observation decoder also checks places and addresses. */
export const HoldingDetailShape: TypedPattern<HoldingDetail> = M.splitRecord(
  {
    place: M.string(),
    kind: HoldingKindShape,
    tokenAddress: M.string(),
    amount: M.nat(),
    valueUsd: optUint255Shape,
  },
  { balanceUsdc: optUint255Shape },
  {},
);
harden(HoldingDetailShape);

export const PlanObservationsV2Shape: TypedPattern<PlanObservationsV2> =
  M.splitRecord(
    {
      holdings: M.arrayOf(HoldingDetailShape),
      instrumentTvls: M.recordOf(
        M.string(),
        M.splitRecord({ tvlUsd: M.nat() }),
      ),
    },
    {},
    {},
  );
harden(PlanObservationsV2Shape);

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
