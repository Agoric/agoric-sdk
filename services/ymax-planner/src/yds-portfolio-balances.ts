import ky, { type KyInstance } from 'ky';

import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { SupportedChain } from '@agoric/portfolio-api/src/constants.js';
import { PoolPlaces } from '@agoric/portfolio-api/src/places.js';
import { Fail, bare, q } from '@endo/errors';
import { FETCH_HEADERS } from './config.ts';
import { parseBigInt } from './ses-utils.js';

export const YDS_PORTFOLIO_BALANCE_CACHE_TTL_MS = 60 * 60 * 1000;
const USDC_DECIMALS = 6;

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

const assertRecord = (
  value: unknown,
  label: string,
): Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw Fail`YDS ${label} must be a record`;
  }
  return value as Record<string, unknown>;
};

const parseUsdcBalance = (value: unknown, label: string): bigint => {
  const ydsLabel = `YDS balance ${label}`;
  if (typeof value !== 'number') {
    throw Fail`${bare(ydsLabel)} is not a number`;
  }
  if (!(value >= 0)) {
    throw Fail`${bare(ydsLabel)} is not natural`;
  }
  return parseBigInt(value, {
    label: ydsLabel,
    fixedPlaces: USDC_DECIMALS,
    natural: true,
    safeInteger: true,
  });
};

const getYdsBalances = (payload: unknown): Record<string, unknown> => {
  const root = assertRecord(payload, 'portfolio response');
  const data = assertRecord(root.data, 'portfolio response data');
  const latestSnapshot = assertRecord(
    data.latestSnapshot,
    'portfolio latestSnapshot',
  );
  return assertRecord(latestSnapshot.balances, 'portfolio balances');
};

export const normalizeYdsPortfolioBalances = (
  payload: unknown,
  brand: Brand<'nat'>,
): Partial<Record<AssetPlaceRef, NatAmount>> => {
  const ydsBalances = getYdsBalances(payload);
  const positions = assertRecord(ydsBalances.positions, 'positions balances');
  const accounts = assertRecord(ydsBalances.accounts, 'accounts balances');

  const balances: Partial<Record<AssetPlaceRef, NatAmount>> = {};
  for (const [instrumentId, value] of Object.entries(positions)) {
    Object.hasOwn(PoolPlaces, instrumentId) ||
      Fail`Invalid YDS instrument id ${q(instrumentId)}`;
    balances[instrumentId] = AmountMath.make(
      brand,
      parseUsdcBalance(value, instrumentId),
    );
  }
  for (const [chainName, value] of Object.entries(accounts)) {
    Object.hasOwn(SupportedChain, chainName) ||
      Fail`Invalid YDS account chain ${q(chainName)}`;
    const place = `@${chainName}` as AssetPlaceRef;
    balances[place] = AmountMath.make(brand, parseUsdcBalance(value, place));
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
