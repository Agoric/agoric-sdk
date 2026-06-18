import ky, { type KyInstance } from 'ky';

import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { SupportedChain } from '@agoric/portfolio-api/src/constants.js';
import { PoolPlaces } from '@agoric/portfolio-api/src/places.js';
import { Fail, bare, q } from '@endo/errors';
import { FETCH_HEADERS } from './config.ts';

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

const makeIntegerString = (
  value: string,
  fixedPlaces: number,
  label: string,
): string => {
  const blabel = bare(label);
  const match = /^([-+]?\d+)(\.(\d*)?)?$/.exec(value);
  if (!match) {
    throw Fail`${blabel} ${value} is not a valid number`;
  }

  const [, units, dotDecimals = '', decPart = ''] = match;
  if (dotDecimals && fixedPlaces <= 0) {
    throw Fail`${blabel} ${value} has ${decPart.length} decimal places but only ${fixedPlaces} allowed`;
  }

  const decimals = decPart.padEnd(fixedPlaces, '0');
  if (decPart.length > fixedPlaces) {
    throw Fail`${blabel} ${value} has more than ${fixedPlaces} decimal places`;
  }

  return `${units}${decimals}`;
};

const floatToNat = (
  value: unknown,
  fixedPlaces: number,
  label: string,
): bigint => {
  const blabel = bare(label);
  if (typeof value !== 'number') {
    throw Fail`${blabel} must be a number`;
  }

  if (!(value >= 0)) {
    throw Fail`${blabel} must be non-negative`;
  }

  const intString = makeIntegerString(String(value), fixedPlaces, label);

  let bint: bigint;
  try {
    bint = BigInt(intString);
  } catch (e) {
    throw Fail`${blabel} ${intString} conversion failed: ${e}`;
  }

  if (!(bint >= 0n)) {
    throw Fail`${blabel} ${bint} is not natural`;
  }

  if (!Number.isSafeInteger(Number(bint))) {
    throw Fail`${blabel} ${intString} loses precision`;
  }
  return bint;
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
    const balance = floatToNat(
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
    const balance = floatToNat(value, USDC_DECIMALS, `YDS balance ${place}`);
    if (balance <= 0n) continue;
    balances[place] = AmountMath.make(brand, balance);
  }
  return harden(balances);
};

export const makeYdsPortfolioBalanceReader = (
  { fetch }: YdsPortfolioBalancePowers,
  config: YdsPortfolioBalanceConfig,
): PortfolioBalanceReader => {
  const http: KyInstance = ky.create({
    fetch,
    timeout: config.timeout,
    retry: config.retries,
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
