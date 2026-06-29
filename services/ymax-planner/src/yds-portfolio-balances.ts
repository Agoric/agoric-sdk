import type { PoolKey } from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import type { EvmAddress } from '@agoric/fast-usdc';
import type { Bech32Address, CaipChainId } from '@agoric/orchestration';
import { SupportedChain } from '@agoric/portfolio-api/src/constants.js';
import { PoolPlaces } from '@agoric/portfolio-api/src/places.js';
import { Fail, bare, q } from '@endo/errors';
import type { PortfolioKey } from '@agoric/portfolio-api';
import { Nat } from '@endo/nat';
import type { UsdcNumber } from './support.ts';

export const YDS_PORTFOLIO_BALANCE_CACHE_TTL_MS = 60 * 60 * 1000;
const USDC_DECIMALS = 6;

/** cf. https://github.com/Agoric/ymax-web/blob/main/yds/src/api-schemas.ts: PortfolioSummary */
export type YdsPortfolioSummary = {
  portfolioId: PortfolioKey;
  targetAllocation: Record<string, number>;
  positionStatus?: { pendingDelta: Partial<Record<AssetPlaceRef, UsdcNumber>> };
  latestSnapshot: null | {
    ts: `${string}Z`;
    balances: {
      positions: Partial<Record<PoolKey, null | UsdcNumber>>;
      accounts: Partial<Record<SupportedChain, null | UsdcNumber>>;
    };
    totalValueUsdc: UsdcNumber;
  };
  reserved: UsdcNumber;
  atBlockHeight: number;

  walletAddress: null | string;
  creationOfferId: null | string;
  depositAddress: null | string;
  accountStateByChain: Partial<
    Record<
      SupportedChain,
      | { state: 'provisioning' | 'failed' | 'unknown' }
      | {
          state: 'active' | 'provisioning' | 'failed';
          chainId: CaipChainId;
          address: Bech32Address | EvmAddress;
          routerFactory?: EvmAddress;
        }
    >
  >;
  vstorage: { structure: Record<string, unknown>; slots: string[] };
};

// TODO: Use something less open-coded, e.g. Zod or @endo/patterns.
const assertRecord = (
  value: unknown,
  label: string,
): Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw Fail`YDS ${label} must be a record`;
  }
  return value as Record<string, unknown>;
};

/**
 * Scale a floating-point number up to a natural number without rounding.
 */
const scaleToNat = (
  value: unknown,
  fixedPlaces: number,
  label: string,
): bigint => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw Fail`${bare(label)} ${value} must be a non-negative finite number`;
  }
  const [, n, f = '', e] =
    value.toExponential().match(/^(\d)(?:\.(\d+))?e([+-]\d+)$/) ||
    Fail`${bare(label)} must be representable in exponential notation`;
  try {
    const fracDigitCount = f.length - Number(e);
    fracDigitCount <= fixedPlaces || Fail``;
    const big = BigInt(`${n}${f}${'0'.repeat(fixedPlaces - fracDigitCount)}`);
    return Nat(Number(big));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    throw Fail`${bare(label)} ${value} loses precision at scale ${q(fixedPlaces)}`;
  }
};

export const normalizeYdsPortfolioBalances = (
  snapshot: NonNullable<YdsPortfolioSummary['latestSnapshot']>,
  brand: Brand<'nat'>,
): Partial<Record<AssetPlaceRef, NatAmount>> => {
  const ydsBalances = assertRecord(snapshot.balances, 'portfolio balances');
  const positions = assertRecord(ydsBalances.positions, 'positions balances');
  const accounts = assertRecord(ydsBalances.accounts, 'accounts balances');

  const balances: Partial<Record<AssetPlaceRef, NatAmount>> = {};
  for (const [instrumentId, value] of Object.entries(positions)) {
    Object.hasOwn(PoolPlaces, instrumentId) ||
      Fail`Invalid YDS instrument id ${q(instrumentId)}`;
    const balance = scaleToNat(
      value,
      USDC_DECIMALS,
      `YDS balance ${instrumentId}`,
    );
    if (balance <= 0n) continue;
    balances[instrumentId] = AmountMath.make(brand, balance);
  }
  for (const [chainName, value] of Object.entries(accounts)) {
    Object.hasOwn(SupportedChain, chainName) ||
      Fail`Invalid YDS account chain ${q(chainName)}`;
    const place = `@${chainName}` as AssetPlaceRef;
    const balance = scaleToNat(value, USDC_DECIMALS, `YDS balance ${place}`);
    if (balance <= 0n) continue;
    balances[place] = AmountMath.make(brand, balance);
  }
  return harden(balances);
};
