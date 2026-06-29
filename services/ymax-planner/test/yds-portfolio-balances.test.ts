import test from 'ava';

import { Far } from '@endo/pass-style';
import type { Brand } from '@agoric/ertp/src/types.js';
import { normalizeYdsPortfolioBalances } from '../src/yds-portfolio-balances.ts';

const EPOCH_TIMESTAMP = '1970-01-01T00:00:00Z';

const brand = Far('mock USDC brand') as Brand<'nat'>;

test('normalizeYdsPortfolioBalances accepts current endpoint balances', t => {
  t.deepEqual(
    normalizeYdsPortfolioBalances(
      {
        ts: EPOCH_TIMESTAMP,
        balances: {
          positions: {
            USDN: 12.5,
            Aave_Base: 2.000001,
          },
          accounts: {
            noble: 25,
            Base: 1.25,
          },
        },
        totalValueUsdc: 40.750001,
      },
      brand,
    ),
    {
      USDN: { brand, value: 12_500_000n },
      Aave_Base: { brand, value: 2_000_001n },
      '@noble': { brand, value: 25_000_000n },
      '@Base': { brand, value: 1_250_000n },
    },
  );
});

test('normalizeYdsPortfolioBalances rejects malformed places and balances', t => {
  for (const balances of [
    { '@noble': 1000000 },
    [{ place: '@Base', amount: 2000000 }],
    [{ place: '@Base', amount: { value: 3000000 } }],
    { positions: {}, accounts: { '@Base': 1 } },
    { positions: {}, accounts: { Base: '1' } },
    { positions: { NotAnInstrument: 1 }, accounts: {} },
    { positions: {}, accounts: { NotAChain: 1 } },
    { positions: { USDN: '1' }, accounts: {} },
    { positions: { USDN: { value: 1 } }, accounts: {} },
    { positions: { USDN: -1 }, accounts: {} },
    { positions: { USDN: Number.POSITIVE_INFINITY }, accounts: {} },
    { positions: { USDN: 0.0000001 }, accounts: {} },
    { positions: { USDN: Number.MAX_SAFE_INTEGER }, accounts: {} },
    { positions: [], accounts: {} },
    { positions: {}, accounts: [] },
  ]) {
    t.throws(() =>
      // @ts-expect-error intentionally malformed
      normalizeYdsPortfolioBalances({ ts: EPOCH_TIMESTAMP, balances }, brand),
    );
  }
});
