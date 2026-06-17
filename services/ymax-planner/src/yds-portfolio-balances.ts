import ky, { type KyInstance } from 'ky';

import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { Fail } from '@endo/errors';
import { FETCH_HEADERS } from './config.ts';

export const YDS_PORTFOLIO_BALANCE_CACHE_TTL_MS = 60 * 60 * 1000;

export type PortfolioBalanceReader = (
  portfolioKey: string,
  brand: Brand<'nat'>,
) => Promise<Partial<Record<AssetPlaceRef, NatAmount>>>;

export type YdsPortfolioBalanceConfig = {
  ydsUrl: string;
  ydsApiKey: string;
  timeout?: number;
  retries?: number;
};

export type YdsPortfolioBalancePowers = {
  fetch: typeof fetch;
};

type YdsBalanceEntry = {
  id?: string;
  place?: string;
  key?: string;
  balance?: string | number | bigint | { value?: string | number | bigint };
  amount?: string | number | bigint | { value?: string | number | bigint };
  value?: string | number | bigint;
};

const parseNat = (value: unknown, label: string): bigint => {
  const raw =
    typeof value === 'object' && value !== null && 'value' in value
      ? (value as { value?: unknown }).value
      : value;
  if (typeof raw === 'bigint') return raw;
  if (typeof raw === 'number' && Number.isInteger(raw) && raw >= 0) {
    return BigInt(raw);
  }
  if (typeof raw === 'string' && /^[0-9]+$/.test(raw)) return BigInt(raw);
  throw Fail`Invalid YDS balance ${label}`;
};

const getPayloadBalances = (payload: unknown): unknown => {
  const obj = payload as any;
  return (
    obj?.balances ??
    obj?.data?.balances ??
    obj?.data?.portfolio?.balances ??
    obj?.portfolio?.balances
  );
};

export const normalizeYdsPortfolioBalances = (
  payload: unknown,
  brand: Brand<'nat'>,
): Partial<Record<AssetPlaceRef, NatAmount>> => {
  const balancesPayload = getPayloadBalances(payload);
  const entries: Array<[string, unknown]> = Array.isArray(balancesPayload)
    ? balancesPayload.map((entry: YdsBalanceEntry) => {
        const place =
          entry.id ??
          entry.place ??
          entry.key ??
          Fail`YDS balance entry missing place`;
        const value = entry.balance ?? entry.amount ?? entry.value;
        return [place, value];
      })
    : Object.entries((balancesPayload ?? {}) as Record<string, unknown>);

  const balances: Partial<Record<AssetPlaceRef, NatAmount>> = {};
  for (const [place, value] of entries) {
    balances[place as AssetPlaceRef] = AmountMath.make(
      brand,
      parseNat(value, place),
    );
  }
  return harden(balances);
};

export const makeYdsPortfolioBalanceReader = (
  { fetch }: YdsPortfolioBalancePowers,
  config: YdsPortfolioBalanceConfig,
): PortfolioBalanceReader => {
  const http: KyInstance = ky.create({
    fetch,
    timeout: config.timeout ?? 10000,
    retry: config.retries ?? 3,
    prefixUrl: config.ydsUrl,
    headers: {
      ...FETCH_HEADERS,
      'x-resolver-auth-key': config.ydsApiKey,
    },
  });

  const getYdsBalancesForPortfolio = async (portfolioKey, brand) => {
    const payload = await http.get(`portfolios/${portfolioKey}`).json();
    return normalizeYdsPortfolioBalances(payload, brand);
  };
  return getYdsBalancesForPortfolio;
};
