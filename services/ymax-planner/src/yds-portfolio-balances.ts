import type { PoolKey } from '@aglocal/portfolio-contract/src/type-guards.ts';
import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import type { EvmAddress } from '@agoric/fast-usdc';
import type { Bech32Address, CaipChainId } from '@agoric/orchestration';
import { SupportedChain } from '@agoric/portfolio-api/src/constants.js';
import { PoolPlaces } from '@agoric/portfolio-api/src/places.js';
import { Fail, q } from '@endo/errors';
import type { PortfolioKey } from '@agoric/portfolio-api';
import { Nat } from '@endo/nat';
import type { UsdcNumber } from './support.ts';

export const YDS_PORTFOLIO_BALANCE_CACHE_TTL_MS = 60 * 60 * 1000;
const USDC_DECIMALS = 6;

/** cf. https://github.com/Agoric/ymax-web/blob/main/yds/src/routes/reward-token-rates.ts: RewardTokenRateSchema */
export type RewardTokenRate = {
  evmChainId: number;
  priceProvider: string;
  sourceToken: EvmAddress;
  sourceDenom: string;
  sourceAmount: `${bigint}`;
  targetToken: EvmAddress;
  targetDenom: string;
  targetAmount: `${bigint}`;
  takenAtSec: number;
};

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
    tokenBalances: {
      chainName: SupportedChain;
      caipChainId: CaipChainId;
      instrumentName: null | PoolKey;
      symbol: string;
      tokenId: string;
      amount: `${bigint}`;
    }[];
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
export type YdsTokenBalance = NonNullable<
  YdsPortfolioSummary['latestSnapshot']
>['tokenBalances'][number];

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
 * Scale a floating-point number up to a natural number without rounding (beyond
 * a configurable count of subsequent decimal places that must be entirely zeros
 * or entirely nines).
 */
const scaleToNat = (
  value: unknown,
  fixedPlaces: number,
  strictness: number = Infinity,
): bigint => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw Fail`scaleToNat requires a non-negative finite number, not ${value}`;
  }
  const [, N, F = '', E] =
    value.toExponential().match(/^(\d)(?:\.(\d+))?e([+-]\d+)$/) ||
    Fail`internal: scaleToNat requires parsable toExponential() output from ${value}`;
  const exp = Number(E);
  let [n, f] = [N, F];
  try {
    let fracDigitCount = f.length - exp;
    if (fracDigitCount > fixedPlaces) {
      // We have unexpected fractional digits, but they might still fit within
      // our strictness (e.g., 17.578324000000002 with fixedPlaces=6 passes when
      // strictness<=8).
      const tail = f.slice(exp + fixedPlaces, exp + fixedPlaces + strictness);
      if (tail.match(/^0+$/)) {
        // round down via truncation
        f = f.slice(0, exp + fixedPlaces);
        fracDigitCount = fixedPlaces;
      } else if (tail.length === strictness && tail.match(/^9+$/)) {
        // round up, possibly with carry
        f = f.slice(0, exp + fixedPlaces);
        fracDigitCount = fixedPlaces;
        if (f.match(/^9+$/)) {
          n = String(Number(n) + 1);
          f = f.replaceAll('9', '0');
        } else {
          f = String(Number(f) + 1);
        }
      } else {
        throw Fail``;
      }
    }
    const big = BigInt(`${n}${f}${'0'.repeat(fixedPlaces - fracDigitCount)}`);
    return Nat(Number(big));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    throw Fail`scaleToNat found precision loss at scale ${q(fixedPlaces)}: ${value}`;
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
    const balance = scaleToNat(value, USDC_DECIMALS, 3);
    if (balance <= 0n) continue;
    balances[instrumentId] = AmountMath.make(brand, balance);
  }
  for (const [chainName, value] of Object.entries(accounts)) {
    Object.hasOwn(SupportedChain, chainName) ||
      Fail`Invalid YDS account chain ${q(chainName)}`;
    const place = `@${chainName}` as AssetPlaceRef;
    const balance = scaleToNat(value, USDC_DECIMALS, 3);
    if (balance <= 0n) continue;
    balances[place] = AmountMath.make(brand, balance);
  }
  return harden(balances);
};
