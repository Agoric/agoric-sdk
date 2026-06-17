import test from 'ava';

import type { AssetPlaceRef } from '@agoric/portfolio-api';
import { AmountMath } from '@agoric/ertp';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { objectMap } from '@agoric/internal';
import { Far } from '@endo/pass-style';
import {
  assessAutoRebalanceCriteria,
  makeCachedPortfolioBalanceGetter,
  type AutoRebalanceBalanceCache,
} from '../src/auto.ts';

const brand = Far('mock USDC brand') as Brand<'nat'>;
const makeAmount = (value: bigint) => AmountMath.make(brand, value);

const options = harden({
  driftBps: 100n,
  driftMinDeposit: 25_000_000n,
  cashMinDeposit: 25_000_000n,
});

test('assessAutoRebalanceCriteria requires drift or excess cash and minimum deposits', t => {
  const targetAllocation = {
    USDN: 50n,
    Aave_Arbitrum: 50n,
  };
  const balancedTarget = objectMap(targetAllocation, v =>
    makeAmount(v * 1_000_000n),
  );

  t.like(
    assessAutoRebalanceCriteria(
      {
        USDN: makeAmount(49_500_000n),
        Aave_Arbitrum: makeAmount(50_500_000n),
      },
      targetAllocation,
      balancedTarget,
      options,
    ),
    { shouldRebalance: false, positionDrift: false, excessCash: false },
    'exactly one percentage point of drift is still below the trigger',
  );

  t.like(
    assessAutoRebalanceCriteria(
      {
        USDN: makeAmount(0n),
        Aave_Arbitrum: makeAmount(100_000_000n),
      },
      targetAllocation,
      balancedTarget,
      options,
    ),
    { shouldRebalance: true, positionDrift: true, excessCash: false },
    'more than one percentage point of drift triggers with enough instrument deposits',
  );

  t.like(
    assessAutoRebalanceCriteria(
      {
        '@agoric': makeAmount(25_000_000n),
      },
      targetAllocation,
      {
        USDN: makeAmount(12_500_000n),
        Aave_Arbitrum: makeAmount(12_500_000n),
      },
      options,
    ),
    { shouldRebalance: true, positionDrift: true, excessCash: true },
    'cash with no cash target is excess',
  );

  t.like(
    assessAutoRebalanceCriteria(
      {
        '@Base': makeAmount(25_000_000n),
        USDN: makeAmount(50_000_000n),
        Aave_Arbitrum: makeAmount(50_000_000n),
      },
      { ...targetAllocation, '@Base': 25n },
      balancedTarget,
      options,
    ),
    { excessCash: false },
    'cash at or below its target allocation is not excess',
  );

  t.like(
    assessAutoRebalanceCriteria(
      {
        USDN: makeAmount(48_000_000n),
        Aave_Arbitrum: makeAmount(52_000_000n),
      },
      targetAllocation,
      { USDN: makeAmount(72_999_999n) },
      options,
    ),
    { shouldRebalance: false, positionDrift: true },
    'target instrument deposits must meet the minimum',
  );

  t.like(
    assessAutoRebalanceCriteria(
      {
        '@agoric': makeAmount(25_000_000n),
      },
      { USDN: 0n, Aave_Arbitrum: 1n },
      { USDN: makeAmount(25_000_000n) },
      options,
    ),
    { shouldRebalance: false, instrumentDeposits: 0n },
    'deposits to zero-weight instruments do not count',
  );
});

test('makeCachedPortfolioBalanceGetter uses cached, YDS, and fallback balances', async t => {
  let now = 1_000;
  const balanceCache: AutoRebalanceBalanceCache = new Map();
  const warnings: unknown[][] = [];
  const ydsBalances = {
    '@agoric': makeAmount(25_000_000n),
  } as Partial<Record<AssetPlaceRef, NatAmount>>;
  const freshBalances = {
    '@noble': makeAmount(30_000_000n),
  } as Partial<Record<AssetPlaceRef, NatAmount>>;
  let ydsCalls = 0;
  let freshCalls = 0;

  const getBalances = makeCachedPortfolioBalanceGetter({
    balanceCache,
    brand,
    console: {
      warn: (...args) => warnings.push(args),
    },
    getFreshBalances: async () => {
      freshCalls += 1;
      return freshBalances;
    },
    getYdsPortfolioBalances: async () => {
      ydsCalls += 1;
      return ydsBalances;
    },
    now: () => now,
  });

  t.is(await getBalances('portfolio1'), ydsBalances);
  t.is(await getBalances('portfolio1'), ydsBalances);
  t.is(ydsCalls, 1, 'unexpired cache avoids YDS reread');
  t.is(freshCalls, 0);

  now += 60 * 60 * 1000 + 1;
  t.is(await getBalances('portfolio1'), ydsBalances);
  t.is(ydsCalls, 2, 'expired cache rereads YDS');

  const getFallbackBalances = makeCachedPortfolioBalanceGetter({
    balanceCache: new Map(),
    brand,
    console: {
      warn: (...args) => warnings.push(args),
    },
    getFreshBalances: async () => {
      freshCalls += 1;
      return freshBalances;
    },
    getYdsPortfolioBalances: async () => {
      throw Error('YDS unavailable');
    },
    now: () => now,
  });

  t.is(await getFallbackBalances('portfolio2'), freshBalances);
  t.is(freshCalls, 1);
  t.true(
    warnings.some(args => String(args[0]).includes('YDS balance query failed')),
  );
});
