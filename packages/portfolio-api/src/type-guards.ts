import { M, type CastedPattern } from '@endo/patterns';
import {
  maxSignedBigInt,
  minSignedBigInt,
} from '@agoric/orchestration/src/utils/abitype.ts';
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
  WithdrawSourceHoldingKind,
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

const optInt256 = M.opt(
  M.and(M.or(minSignedBigInt(256n), M.nat()), M.lte(maxSignedBigInt(256n))),
);

export const TokenUsageShape = M.or('swapFrom', 'swapTo');
harden(TokenUsageShape);

export const WithdrawSourceHoldingKindShape: CastedPattern<WithdrawSourceHoldingKind> =
  M.or('shares', 'principal');
harden(WithdrawSourceHoldingKindShape);

/** Structural withdrawal parameters; route and holding identity need decoding. */
export const WithdrawParamsShape: CastedPattern<WithdrawParams> = M.splitRecord(
  {},
  {
    max: M.boolean(),
    srcKind: WithdrawSourceHoldingKindShape,
    srcToken: M.string(),
    srcAmount: M.nat(),
  },
  {},
);
harden(WithdrawParamsShape);

/** Native-token kinds start with '$' and have a nonempty symbol. */
export const HoldingKindShape: CastedPattern<HoldingKind> = M.or(
  WithdrawSourceHoldingKindShape,
  'reward',
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
  { valueUsd: optInt256 },
  {},
);
harden(HoldingDetailV1Shape);

export const HoldingDetailV2Shape = M.splitRecord(
  {
    place: M.string(),
    kind: HoldingKindShape,
    tokenAddress: M.string(),
    amount: M.nat(),
  },
  { valueUsd: optInt256, balanceUsdc: M.nat() },
  {},
);
harden(HoldingDetailV2Shape);

/** Structural shape; the observation decoder also checks places and addresses. */
export const HoldingDetailShape: CastedPattern<HoldingDetail> = M.or(
  HoldingDetailV1Shape,
  HoldingDetailV2Shape,
);
harden(HoldingDetailShape);

export const PlanObservationsShape: CastedPattern<PlanObservations> =
  M.splitRecord(
    {
      balances: M.recordOf(M.string(), M.nat()),
      instrumentTvls: M.recordOf(
        M.string(),
        M.splitRecord({ tvlUsd: M.nat() }),
      ),
    },
    { holdings: M.arrayOf(HoldingDetailV2Shape) },
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
