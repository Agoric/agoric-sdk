import type { TypedPattern } from '@agoric/internal';
import { M } from '@endo/patterns';
import {
  isInstrumentId,
  type BeefyInstrumentId,
  type ChainTokenMetadata,
  type ERC4626InstrumentId,
  type TokenMetadata,
} from './places.ts';
import type {
  DepositFromChainRef,
  LocalChainAccountRef,
  PortfolioAgentKey,
  InterChainAccountRef,
  PortfolioBalancePlaceRef,
  PortfolioDelegatedClaimRewardsParams,
  PortfolioDelegatedRebalanceParams,
  PortfolioSyncState,
  WithdrawToChainRef,
} from './types.js';

export { isInstrumentId, makeTokenIdKey } from './places.ts';
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

/**
 * Without regard to supported chains, is the input plausibly a
 * DepositFromChainRef (i.e., does it start with `+`)?
 */
export const isDepositFromChainRef = (
  ref: string,
): ref is DepositFromChainRef => ref.startsWith('+');
harden(isDepositFromChainRef);

/**
 * Without regard to supported chains, is the input plausibly a
 * LocalChainAccountRef (i.e., does it start with `+`)?
 */
export const isLocalChainAccountRef = (
  ref: string,
): ref is LocalChainAccountRef => ref.startsWith('+');
harden(isLocalChainAccountRef);

/**
 * Without regard to supported chains, is the input plausibly an
 * InterChainAccountRef (i.e., does it start with `@`)?
 */
export const isInterChainAccountRef = (
  ref: string,
): ref is InterChainAccountRef => ref.startsWith('@');
harden(isInterChainAccountRef);

/**
 * Without regard to supported chains or instruments, is the input plausibly a
 * PortfolioBalancePlaceRef (i.e., an InterChainAccountRef or InstrumentId)?
 */
export const isPortfolioBalancePlaceRef = (
  ref: string,
): ref is PortfolioBalancePlaceRef =>
  isInterChainAccountRef(ref) || isInstrumentId(ref);
harden(isPortfolioBalancePlaceRef);

/**
 * Without regard to supported chains, is the input plausibly a
 * WithdrawToChainRef (i.e., does it start with `-`)?
 */
export const isWithdrawToChainRef = (ref: string): ref is WithdrawToChainRef =>
  ref.startsWith('-');
harden(isWithdrawToChainRef);

/**
 * Is the input an ERC-4626 InstrumentId
 * (i.e., does it start with 'ERC4626_')?
 */
export const isERC4626InstrumentId = (
  ref: string,
): ref is ERC4626InstrumentId => ref.startsWith('ERC4626_');
harden(isERC4626InstrumentId);

/**
 * Is the input an ERC-4626 and a morpho InstrumentId
 * (i.e., does it start with 'ERC4626_morpho')?
 */
export const isERC4626MorphoInstrumentId = (
  ref: string,
): ref is ERC4626InstrumentId => ref.startsWith('ERC4626_morpho');
harden(isERC4626MorphoInstrumentId);

/**
 * Is the input an Beefy InstrumentId
 * (i.e., does it start with 'Beefy_')?
 */
export const isBeefyInstrumentId = (ref: string): ref is BeefyInstrumentId =>
  ref.startsWith('Beefy_');
harden(isBeefyInstrumentId);

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
