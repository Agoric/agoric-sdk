/**
 * @file Places (instruments, chain accounts) of portfolios.
 *
 * This module has no runtime dependencies (in particular not on Endo), so that
 * it can be used outside of a locked-down (SES) environment, e.g. by
 * {@link ./observation-messages.ts}.
 */

import type { TypeTag } from '@agoric/internal/src/tagged.js';
import type { SupportedChain, YieldProtocol } from './constants.js';
import type { InstrumentId } from './instruments.js';
import type {
  AssetPlaceRef,
  DepositFromChainRef,
  InterChainAccountRef,
  LocalChainAccountRef,
  PortfolioBalancePlaceRef,
  WithdrawToChainRef,
} from './types.js';

const isPrimitive = (value: unknown): boolean =>
  !value || (typeof value !== 'object' && typeof value !== 'function');

const deepFreeze = <T>(value: T): T => {
  if (isPrimitive(value)) return value;
  const obj = value as Record<PropertyKey, unknown>;
  Object.freeze(obj);
  for (const key of Reflect.ownKeys(obj)) {
    deepFreeze(obj[key]);
  }
  return value;
};

export type TokenUsage = 'swapFrom' | 'swapTo';

export type TokenIdKey = TypeTag<string, 'TokenIdKey'>;

export const makeTokenIdKey = (tokenId: string): TokenIdKey =>
  (tokenId.startsWith('0x') ? tokenId.toLowerCase() : tokenId) as TokenIdKey;
deepFreeze(makeTokenIdKey);

/**
 * cf. https://github.com/Agoric/ymax-web/blob/main/yds/src/data/tokens.ts:
 * TokenMetadata
 */
export type TokenMetadata = {
  caipChainId: string;
  chainName: string;
  tokenId: string;
  symbol: string;
  /** Count of fractional decimal digits in the token's base unit. */
  decimals: number;
  usage?: readonly TokenUsage[];
};

export type PoolPlaceInfo =
  | { protocol: 'USDN'; vault: null | 1; chainName: 'noble' }
  | {
      protocol: YieldProtocol;
      chainName: SupportedChain;
    };

// XXX special handling. What's the functional difference from other places?
export const BeefyPoolPlaces = {
  Beefy_re7_Avalanche: {
    protocol: 'Beefy',
    chainName: 'Avalanche',
  },
  Beefy_morphoGauntletUsdc_Ethereum: {
    protocol: 'Beefy',
    chainName: 'Ethereum',
  },
  Beefy_morphoSmokehouseUsdc_Ethereum: {
    protocol: 'Beefy',
    chainName: 'Ethereum',
  },
  Beefy_morphoSeamlessUsdc_Base: {
    protocol: 'Beefy',
    chainName: 'Base',
  },
  Beefy_compoundUsdc_Optimism: {
    protocol: 'Beefy',
    chainName: 'Optimism',
  },
  Beefy_compoundUsdc_Arbitrum: {
    protocol: 'Beefy',
    chainName: 'Arbitrum',
  },
} as const satisfies Partial<Record<InstrumentId, PoolPlaceInfo>>;
deepFreeze(BeefyPoolPlaces);

export type BeefyInstrumentId = keyof typeof BeefyPoolPlaces;

export const ERC4626PoolPlaces = {
  ERC4626_vaultU2_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoClearstarHighYieldUsdc_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoClearstarUsdcCore_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoGauntletUsdcRwa_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoSteakhouseHighYieldInstant_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoClearstarInstitutionalUsdc_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoClearstarUsdcReactor_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoAlphaUsdcCore_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoResolvUsdc_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoGauntletUsdcFrontier_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoHyperithmUsdcMidcurve_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoHyperithmUsdcDegen_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoGauntletUsdcCore_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoSteakhousePrimeUsdc_Base: {
    protocol: 'ERC4626',
    chainName: 'Base',
  },
  ERC4626_morphoSteakhouseUsdc_Base: {
    protocol: 'ERC4626',
    chainName: 'Base',
  },
  ERC4626_morphoGauntletUsdcPrime_Base: {
    protocol: 'ERC4626',
    chainName: 'Base',
  },
  ERC4626_morphoSeamlessUsdcVault_Base: {
    protocol: 'ERC4626',
    chainName: 'Base',
  },
  ERC4626_morphoSteakhouseHighYieldUsdc_Arbitrum: {
    protocol: 'ERC4626',
    chainName: 'Arbitrum',
  },
  ERC4626_morphoGauntletUsdcCore_Arbitrum: {
    protocol: 'ERC4626',
    chainName: 'Arbitrum',
  },
  ERC4626_morphoHyperithmUsdc_Arbitrum: {
    protocol: 'ERC4626',
    chainName: 'Arbitrum',
  },
  ERC4626_morphoGauntletUsdcPrime_Optimism: {
    protocol: 'ERC4626',
    chainName: 'Optimism',
  },
  ERC4626_morphoGauntletUsdcPrime_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoEthenaSteakhouseUsdc_Base: {
    protocol: 'ERC4626',
    chainName: 'Base',
  },
  ERC4626_morphoKpkUsdcPrime_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoRockawayxUsdcYield_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoHumaUsdcMain_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoSteakhouseHighYieldUsdcEdition_Base: {
    protocol: 'ERC4626',
    chainName: 'Base',
  },
  ERC4626_morphoSteakhousePrimeUsdc_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoSteakhouseConfidentialPrimeUsdc_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoGauntletUsdcPrimeV2_Base: {
    protocol: 'ERC4626',
    chainName: 'Base',
  },
  ERC4626_morphoGauntletUsdcFrontier_Base: {
    protocol: 'ERC4626',
    chainName: 'Base',
  },
  ERC4626_morphoReEcosystemVault_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoApyxUsdc_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoRockawayxToriEcosystem_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
  ERC4626_morphoRockawayxFxProtocolEcosystemUsdc_Ethereum: {
    protocol: 'ERC4626',
    chainName: 'Ethereum',
  },
} as const satisfies Partial<Record<InstrumentId, PoolPlaceInfo>>;
deepFreeze(ERC4626PoolPlaces);

export type ERC4626InstrumentId = keyof typeof ERC4626PoolPlaces;

export const PoolPlaces = {
  USDN: { protocol: 'USDN', vault: null, chainName: 'noble' }, // MsgSwap only
  USDNVault: { protocol: 'USDN', vault: 1, chainName: 'noble' }, // MsgSwap, MsgLock
  Aave_Avalanche: { protocol: 'Aave', chainName: 'Avalanche' },
  Aave_Ethereum: { protocol: 'Aave', chainName: 'Ethereum' },
  Aave_Optimism: { protocol: 'Aave', chainName: 'Optimism' },
  Aave_Arbitrum: { protocol: 'Aave', chainName: 'Arbitrum' },
  Aave_Base: { protocol: 'Aave', chainName: 'Base' },
  Compound_Ethereum: { protocol: 'Compound', chainName: 'Ethereum' },
  Compound_Optimism: { protocol: 'Compound', chainName: 'Optimism' },
  Compound_Arbitrum: { protocol: 'Compound', chainName: 'Arbitrum' },
  Compound_Base: { protocol: 'Compound', chainName: 'Base' },
  ...BeefyPoolPlaces,
  ...ERC4626PoolPlaces,
} as const satisfies Record<InstrumentId, PoolPlaceInfo>;
deepFreeze(PoolPlaces);

export type PoolKey = InstrumentId;
export type ChainTokenMetadataEntry = {
  caipChainId: string;
  chainName: string;
  // Look up metadata by tokenId, then examine its details as necessary.
  tokenMetadataById: Record<TokenIdKey, TokenMetadata>;
};
export type ChainTokenMetadata = Record<string, ChainTokenMetadataEntry>;

/**
 * Without regard to supported chains, is the input plausibly an InstrumentId
 * (i.e., does it start with an ASCII letter)?
 */
export const isInstrumentId = (ref: string): ref is InstrumentId =>
  !!ref.match(/^[a-z]/i);
deepFreeze(isInstrumentId);

/**
 * Without regard to supported chains, is the input plausibly an
 * InterChainAccountRef (i.e., does it start with `@`)?
 */
export const isInterChainAccountRef = (
  ref: string,
): ref is InterChainAccountRef => ref.startsWith('@');
deepFreeze(isInterChainAccountRef);

/**
 * Without regard to supported chains or instruments, is the input plausibly a
 * PortfolioBalancePlaceRef (i.e., an InterChainAccountRef or InstrumentId)?
 */
export const isPortfolioBalancePlaceRef = (
  ref: string,
): ref is PortfolioBalancePlaceRef =>
  isInterChainAccountRef(ref) || isInstrumentId(ref);
deepFreeze(isPortfolioBalancePlaceRef);

/**
 * Without regard to supported chains, is the input plausibly a
 * DepositFromChainRef (i.e., does it start with `+`)?
 */
export const isDepositFromChainRef = (
  ref: string,
): ref is DepositFromChainRef => ref.startsWith('+');
deepFreeze(isDepositFromChainRef);

/**
 * Without regard to supported chains, is the input plausibly a
 * LocalChainAccountRef (i.e., does it start with `+`)?
 */
export const isLocalChainAccountRef = (
  ref: string,
): ref is LocalChainAccountRef => ref.startsWith('+');
deepFreeze(isLocalChainAccountRef);

/**
 * Without regard to supported chains, is the input plausibly a
 * WithdrawToChainRef (i.e., does it start with `-`)?
 */
export const isWithdrawToChainRef = (ref: string): ref is WithdrawToChainRef =>
  ref.startsWith('-');
deepFreeze(isWithdrawToChainRef);

/**
 * Is the input an ERC-4626 InstrumentId
 * (i.e., does it start with 'ERC4626_')?
 */
export const isERC4626InstrumentId = (
  ref: string,
): ref is ERC4626InstrumentId => ref.startsWith('ERC4626_');
deepFreeze(isERC4626InstrumentId);

/**
 * Is the input an ERC-4626 and a morpho InstrumentId
 * (i.e., does it start with 'ERC4626_morpho')?
 */
export const isERC4626MorphoInstrumentId = (
  ref: string,
): ref is ERC4626InstrumentId => ref.startsWith('ERC4626_morpho');
deepFreeze(isERC4626MorphoInstrumentId);

/**
 * Is the input an Beefy InstrumentId
 * (i.e., does it start with 'Beefy_')?
 */
export const isBeefyInstrumentId = (ref: string): ref is BeefyInstrumentId =>
  ref.startsWith('Beefy_');
deepFreeze(isBeefyInstrumentId);

// XXX Possible to consolidate with {@link getChainNameOfPlaceRef}?
export const chainOf = (id: AssetPlaceRef): SupportedChain => {
  if (id.startsWith('<')) return 'agoric';
  if (!isInstrumentId(id)) return id.slice(1) as SupportedChain;
  if (Object.hasOwn(PoolPlaces, id)) {
    return PoolPlaces[id as PoolKey].chainName;
  }

  // Fallback: syntactic pool id ending in `_${Chain}` => `${Chain}`.
  // This enables base graph edges for pools even if not listed in PoolPlaces.
  const m = /^(?:[A-Za-z0-9]+_)+([A-Za-z0-9]+)$/.exec(id);
  if (m) return m[1] as SupportedChain;

  throw Error(`Cannot determine chain for ${id}`);
};
deepFreeze(chainOf);
