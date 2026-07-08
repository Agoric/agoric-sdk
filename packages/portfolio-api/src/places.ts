import { Fail } from '@endo/errors';

import type {
  AxelarChain,
  SupportedChain,
  YieldProtocol,
} from './constants.js';
import type { InstrumentId } from './instruments.js';
import type { AssetPlaceRef } from './types.js';

const isPrimitive = (value: unknown): boolean => Object(value) !== value;

const deepFreeze = <T>(value: T): T => {
  if (isPrimitive(value)) return value;
  const obj = value as Record<PropertyKey, unknown>;
  Object.freeze(obj);
  for (const key of Reflect.ownKeys(obj)) {
    deepFreeze(obj[key]);
  }
  return value;
};

export type PoolPlaceInfo =
  | { protocol: 'USDN'; vault: null | 1; chainName: 'noble' }
  | { protocol: YieldProtocol; chainName: AxelarChain };

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

/**
 * Without regard to supported chains, is the input plausibly an InstrumentId
 * (i.e., does it start with an ASCII letter)?
 */
export const isInstrumentId = (ref: string): ref is InstrumentId =>
  !!ref.match(/^[a-z]/i);
deepFreeze(isInstrumentId);

// XXX Possible to consolidate with {@link getChainNameOfPlaceRef}?
export const chainOf = (id: AssetPlaceRef): SupportedChain => {
  if (id.startsWith('<')) return 'agoric';
  if (!isInstrumentId(id)) return id.slice(1) as SupportedChain;
  if (Object.hasOwn(PoolPlaces, id)) {
    return PoolPlaces[id as PoolKey].chainName;
  }

  // Fallback: syntactic pool id like `${Protocol}_${Chain}` => `${Chain}`.
  // This enables base graph edges for pools even if not listed in PoolPlaces.
  const m = /^([A-Za-z0-9]+)_([A-Za-z0-9-]+)$/.exec(id);
  if (m) return m[2] as SupportedChain;

  throw Fail`Cannot determine chain for ${id}`;
};
deepFreeze(chainOf);
